'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import ProfileSummary from '@/components/profile/ProfileSummary';
import { getProfile, clearProfile } from '@/lib/storage';
import { UserProfile } from '@/types';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProfile(getProfile());
    setLoaded(true);
  }, []);

  const handleClear = () => {
    if (confirm('프로필을 초기화하면 처음부터 다시 설정해야 해요. 계속할까요?')) {
      clearProfile();
      router.push('/onboarding');
    }
  };

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
        <header className="bg-white px-5 pt-12 pb-5 lg:pt-8 border-b border-gray-50">
          <h1 className="text-2xl font-extrabold text-[#1a1a1a]">내 정보</h1>
        </header>

        <div className="px-4 py-5 space-y-4 lg:max-w-2xl lg:px-6">
          {profile ? (
            <>
              <ProfileSummary profile={profile} />

              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">액션</h3>
                <div className="space-y-2">
                  <Link
                    href="/onboarding"
                    className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-[#F4F8F6] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">✏️</span>
                      <span className="text-sm font-medium text-[#1a1a1a]">프로필 수정하기</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/results"
                    className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-[#F4F8F6] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🔍</span>
                      <span className="text-sm font-medium text-[#1a1a1a]">맞춤 혜택 다시 보기</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <button
                    onClick={handleClear}
                    className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🗑️</span>
                      <span className="text-sm font-medium text-red-500">프로필 초기화</span>
                    </div>
                    <svg className="w-4 h-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="text-5xl mb-4">👤</div>
              <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">프로필이 없어요</h3>
              <p className="text-sm text-[#888] mb-6">프로필을 설정하면 맞춤 혜택을 추천받을 수 있어요</p>
              <Link
                href="/onboarding"
                className="bg-[#1B6B4A] text-white font-bold py-3 px-8 rounded-xl"
              >
                프로필 설정하기
              </Link>
            </div>
          )}

          {/* App info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">앱 정보</h3>
            <div className="space-y-2 text-sm text-[#555]">
              <div className="flex justify-between">
                <span>버전</span>
                <span className="text-[#888]">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>데이터 기준</span>
                <span className="text-[#888]">2025년 기준</span>
              </div>
              <div className="flex justify-between">
                <span>주관</span>
                <span className="text-[#888]">혜택줍줍</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl p-4">
            <p className="text-xs text-amber-700 leading-relaxed">
              ⚠️ 본 앱에서 제공하는 정보는 참고용이며, 실제 혜택 수혜 여부는 해당 기관에서 직접 확인하시기 바랍니다.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
