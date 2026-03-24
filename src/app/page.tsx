"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, ArrowRight, AlertTriangle,
  Home, Briefcase, GraduationCap, Baby, Heart, Rocket,
  Gift, ClipboardList, Wallet,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PolicyCard from "@/components/policy/PolicyCard";
import FreshnessBar from "@/components/common/FreshnessBar";
import { getProfile } from "@/lib/storage";
import { getRecommendations } from "@/lib/recommendation";
import { usePolicies } from "@/hooks/usePolicies";
import { UserProfile, RecommendationResult } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [results, setResults] = useState<RecommendationResult[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const { policies, fetchedAt, source, loading, isStale, error, refresh } =
    usePolicies();

  useEffect(() => {
    const p = getProfile();
    setProfile(p);
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    if (profile && policies.length > 0) {
      // Defer heavy computation to idle time (fixes TBT)
      if (typeof requestIdleCallback !== 'undefined') {
        const id = requestIdleCallback(() => setResults(getRecommendations(policies, profile)));
        return () => cancelIdleCallback(id);
      } else {
        const id = setTimeout(() => setResults(getRecommendations(policies, profile)), 16);
        return () => clearTimeout(id);
      }
    }
  }, [profile, policies]);

  if (!profileLoaded) {
    return (
      <div className="min-h-dvh bg-[#F4F8F6] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1B6B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <SplashScreen />;
  }

  return (
    <AppShell>
      <div className="flex flex-col">
        {/* Header — logo only on mobile; hidden on desktop (sidebar shows it) */}
        <header className="flex items-center px-5 pt-12 pb-4 bg-white lg:hidden">
          <span className="text-xl font-extrabold text-[#1B6B4A]">
            혜택줍줍
          </span>
        </header>
        {/* Desktop page title */}
        <header className="hidden lg:flex items-center px-8 pt-10 pb-4 bg-white border-b border-gray-50">
          <h1 className="text-2xl font-extrabold text-[#1a1a1a]">홈</h1>
        </header>

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-[#1B6B4A] to-[#2A9D8F] px-5 pt-6 pb-10 lg:px-8 lg:pt-8 lg:pb-12 overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20" />
            <div className="absolute bottom-0 left-8 w-20 h-20 rounded-full bg-white/10" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-white leading-tight mb-1">
            지금 받을 수 있는
          </h1>
          <h1 className="text-3xl lg:text-4xl font-black text-white leading-tight mb-6">
            숨은 혜택
          </h1>

          {/* Search card */}
          <div
            className="bg-white rounded-2xl shadow-lg p-4 flex items-center gap-3 cursor-pointer lg:max-w-lg"
            onClick={() => router.push("/results")}
          >
            <Search size={22} className="text-[#1B6B4A] flex-shrink-0" />
            <span className="flex-1 text-[#888] text-sm">
              맞춤 혜택을 찾아볼까요?
            </span>
            <ArrowRight size={18} className="text-[#1B6B4A]" />
          </div>
        </div>

        {/* Freshness bar */}
        <FreshnessBar
          fetchedAt={fetchedAt}
          source={source}
          isStale={isStale}
          loading={loading}
          onRefresh={refresh}
        />

        {/* API error notice */}
        {error && (
          <div className="mx-4 mt-3 px-4 py-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle size={12} /> {error} 샘플 데이터를 표시합니다.
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="bg-white px-5 py-3 flex items-center gap-4 border-b border-gray-50">
          <div className="text-center">
            <p className="text-xl font-extrabold text-[#1B6B4A]">
              {results.filter((r) => r.isFullMatch).length}
            </p>
            <p className="text-[10px] text-[#888]">완전 매칭</p>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="text-center">
            <p className="text-xl font-extrabold text-[#1B6B4A]">
              {results.filter((r) => r.score >= 50).length}
            </p>
            <p className="text-[10px] text-[#888]">조건 일치</p>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="text-center">
            <p className="text-xl font-extrabold text-[#1B6B4A]">
              {results.length}
            </p>
            <p className="text-[10px] text-[#888]">전체 혜택</p>
          </div>
          <div className="ml-auto">
            <Link
              href="/profile"
              className="text-xs text-[#2A9D8F] font-medium"
            >
              프로필 수정 →
            </Link>
          </div>
        </div>

        {/* Category shortcuts */}
        <div className="px-5 py-4 bg-white border-b border-gray-50">
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { icon: <Home size={22} className="text-[#1B6B4A]" />,          label: "주거", href: "/results?category=housing" },
              { icon: <Briefcase size={22} className="text-[#1B6B4A]" />,      label: "취업", href: "/results?category=employment" },
              { icon: <GraduationCap size={22} className="text-[#1B6B4A]" />,  label: "교육", href: "/results?category=education" },
              { icon: <Baby size={22} className="text-[#1B6B4A]" />,           label: "보육", href: "/results?category=childcare" },
              { icon: <Heart size={22} className="text-[#1B6B4A]" />,          label: "복지", href: "/results?category=welfare" },
              { icon: <Rocket size={22} className="text-[#1B6B4A]" />,         label: "창업", href: "/results?category=business" },
            ].map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                className="flex-shrink-0 flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#E0F2EC] flex items-center justify-center">
                  {cat.icon}
                </div>
                <span className="text-[10px] text-[#555] font-medium">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recommended cards */}
        <div className="px-4 pt-4 pb-4 lg:px-6">
          <div className="flex items-center justify-between px-1 mb-3">
            <h2 className="font-bold text-[#1a1a1a] text-base">
              내 맞춤 혜택 TOP 5
            </h2>
            <Link href="/results" className="text-xs text-[#2A9D8F]">
              전체보기
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {results.slice(0, 6).map((r) => (
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
        </div>

      </div>
    </AppShell>
  );
}

function SplashScreen() {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-[#1B6B4A] to-[#2A9D8F] flex flex-col items-center justify-center px-6">
      <div className="text-center mb-10">
        <div className="mb-4 text-white"><Gift size={64} /></div>
        <h1 className="text-4xl font-black text-white mb-2">혜택줍줍</h1>
        <p className="text-white/80 text-lg leading-relaxed">
          나에게 맞는
          <br />
          <span className="font-bold text-white">정부 지원 혜택</span>을
          찾아드려요
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-3">
          <ClipboardList size={24} className="text-white flex-shrink-0" />
          <div>
            <p className="text-white font-semibold text-sm">
              간단한 질문 3가지
            </p>
            <p className="text-white/70 text-xs">
              나이, 지역, 직업만 알면 돼요
            </p>
          </div>
        </div>
        <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-3">
          <Search size={24} className="text-white flex-shrink-0" />
          <div>
            <p className="text-white font-semibold text-sm">맞춤 혜택 추천</p>
            <p className="text-white/70 text-xs">
              조건에 맞는 혜택만 골라드려요
            </p>
          </div>
        </div>
        <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-3">
          <Wallet size={24} className="text-white flex-shrink-0" />
          <div>
            <p className="text-white font-semibold text-sm">숨은 혜택 발굴</p>
            <p className="text-white/70 text-xs">몰랐던 지원금을 찾아드려요</p>
          </div>
        </div>
      </div>

      <div className="mt-10 w-full max-w-sm">
        <Link
          href="/onboarding"
          className="block w-full text-center bg-white text-[#1B6B4A] font-extrabold py-5 rounded-2xl shadow-xl text-lg"
        >
          시작하기 →
        </Link>
        <p className="text-center text-white/50 text-xs mt-3">
          10초면 완료돼요
        </p>
      </div>
    </div>
  );
}
