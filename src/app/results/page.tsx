'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Search } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PolicyCard from '@/components/policy/PolicyCard';
import FilterBar from '@/components/policy/FilterBar';
import SearchInput from '@/components/common/SearchInput';
import EmptyState from '@/components/common/EmptyState';
import { getProfile } from '@/lib/storage';
import { getRecommendations } from '@/lib/recommendation';
import { usePolicies } from '@/hooks/usePolicies';
import FreshnessBar from '@/components/common/FreshnessBar';
import AdBanner from '@/components/common/AdBanner';
import { UserProfile, RecommendationResult, FilterState, SortOption } from '@/types';

function ResultsContent() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [results, setResults] = useState<RecommendationResult[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const { policies, fetchedAt, source, loading, isStale, error, refresh } = usePolicies();

  const [filter, setFilter] = useState<FilterState>({
    category: searchParams.get('category') || null,
    activeOnly: false, // toggle removed from UI (all data is isAlwaysOpen)
    keyword: '',
  });
  const [sort, setSort] = useState<SortOption>('recommended');

  useEffect(() => {
    const p = getProfile();
    setProfile(p);
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    if (!profileLoaded || policies.length === 0) return;
    // Defer heavy computation to idle time (fixes TBT)
    const cb = () => {
      if (profile) {
        setResults(getRecommendations(policies, profile));
      } else {
        setResults(policies.map((policy) => ({ policy, score: 0, matchReasons: [], isFullMatch: false, regionMatched: true })));
      }
    };
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(cb);
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(cb, 16);
      return () => clearTimeout(id);
    }
  }, [profile, policies, profileLoaded]);

  const filtered = results.filter((r) => {
    // 프로필 기반 추천 모드에서 지역/전문직 하드블록 정책 숨김 (score < 10)
    // 키워드 검색 중에는 사용자가 명시적으로 찾는 것이므로 점수 무관 표시
    if (profile && !filter.keyword && r.score < 10) return false;
    if (filter.category && r.policy.category !== filter.category) return false;
    if (filter.activeOnly && !r.policy.isAlwaysOpen) {
      const now = new Date();
      if (r.policy.applicationEnd && new Date(r.policy.applicationEnd) < now) return false;
    }
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase();
      return (
        r.policy.title.toLowerCase().includes(kw) ||
        r.policy.summary.toLowerCase().includes(kw) ||
        r.policy.tags.some((t) => t.toLowerCase().includes(kw))
      );
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'amount') return (b.policy.benefitAmount ?? 0) - (a.policy.benefitAmount ?? 0);
    if (sort === 'deadline') {
      const aEnd = a.policy.applicationEnd ? new Date(a.policy.applicationEnd).getTime() : Infinity;
      const bEnd = b.policy.applicationEnd ? new Date(b.policy.applicationEnd).getTime() : Infinity;
      return aEnd - bEnd;
    }
    return b.score - a.score;
  });

  const resetFilter = () => {
    setFilter({ category: null, activeOnly: false, keyword: '' });
    setSort('recommended');
  };

  if (!profileLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#1B6B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white px-5 pt-12 pb-4 lg:pt-8 sticky top-0 z-30 border-b border-gray-50">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-xl font-extrabold text-[#1a1a1a] flex-1">당신을 위한 혜택</h1>
        </div>
        <SearchInput value={filter.keyword} onChange={(v) => setFilter({ ...filter, keyword: v })} placeholder="혜택 이름, 태그 검색..." />
      </header>

      {/* Freshness bar */}
      <FreshnessBar
        fetchedAt={fetchedAt}
        source={source}
        isStale={isStale}
        loading={loading}
        onRefresh={refresh}
      />

      {error && (
        <div className="mx-4 mt-3 px-4 py-3 bg-red-50 rounded-xl border border-red-100">
          <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={12} /> {error} 샘플 데이터를 표시합니다.</p>
        </div>
      )}

      {/* Stats row */}
      <div className="bg-white px-5 py-3 border-b border-gray-50 flex items-center gap-2">
        <span className="text-lg font-extrabold text-[#1a1a1a]">발견된 혜택</span>
        <span className="bg-[#1B6B4A] text-white text-sm font-extrabold px-2.5 py-0.5 rounded-full">
          {sorted.length}
        </span>
        {!profile && (
          <Link href="/onboarding" className="ml-auto text-xs text-[#2A9D8F] font-medium">
            맞춤 추천 받기 →
          </Link>
        )}
      </div>

      {/* Filter */}
      <div className="bg-white px-5 py-3 border-b border-gray-50">
        <FilterBar filter={filter} onFilterChange={setFilter} sort={sort} onSortChange={setSort} onReset={resetFilter} />
      </div>

      {/* Results */}
      <div className="flex-1 px-4 py-4 lg:px-6">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<Search size={48} />}
            title="조건에 맞는 혜택이 없어요"
            description="필터를 조정하거나 검색어를 바꿔보세요"
            action={
              <button
                onClick={resetFilter}
                className="bg-[#1B6B4A] text-white text-sm font-bold px-6 py-3 rounded-xl"
              >
                필터 초기화
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {sorted.map((r) => (
              <PolicyCard
                key={r.policy.id}
                policy={r.policy}
                score={r.score}
                matchReasons={r.matchReasons}
                isFullMatch={r.isFullMatch}
                regionMatched={r.regionMatched}
              />
            ))}
          </div>
        )}

        {/* 광고 배너 — 콘텐츠 목록 하단 */}
        <AdBanner slot="XXXXXXXXXX" format="auto" className="mt-4 mx-1 rounded-xl" />
      </div>

    </div>
  );
}

export default function ResultsPage() {
  return (
    <AppShell>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-[#1B6B4A] border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <ResultsContent />
      </Suspense>
    </AppShell>
  );
}
