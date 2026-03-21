'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PolicyCard from '@/components/policy/PolicyCard';
import EmptyState from '@/components/common/EmptyState';
import { getBookmarks } from '@/lib/storage';
import { usePolicies } from '@/hooks/usePolicies';
import { Policy } from '@/types';
import Link from 'next/link';

export default function SavedPage() {
  const { policies, loading } = usePolicies();
  const [saved, setSaved] = useState<Policy[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loading || policies.length === 0) return;
    const ids = getBookmarks();
    setSaved(policies.filter((p) => ids.includes(p.id)));
    setLoaded(true);
  }, [policies, loading]);

  if (!loaded) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-[#1B6B4A] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col">
        <header className="bg-white px-5 pt-12 pb-4 lg:pt-8 border-b border-gray-50">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-extrabold text-[#1a1a1a]">저장한 혜택</h1>
            {saved.length > 0 && (
              <span className="text-sm text-[#888]">{saved.length}개</span>
            )}
          </div>
        </header>

        <div className="px-4 py-4 lg:px-6">
          {saved.length === 0 ? (
            <EmptyState
              emoji="🔖"
              title="저장한 혜택이 없어요"
              description="혜택 카드의 북마크 아이콘을 눌러 저장해 보세요"
              action={
                <Link href="/results" className="bg-[#1B6B4A] text-white text-sm font-bold px-6 py-3 rounded-xl inline-block">
                  혜택 둘러보기
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {saved.map((policy) => (
                <PolicyCard key={policy.id} policy={policy} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
