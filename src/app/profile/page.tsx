'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import ProfileFieldModal, { FieldKey, FIELD_CONFIG } from '@/components/profile/ProfileFieldModal';
import { getProfile, saveProfile, clearProfile } from '@/lib/storage';
import { UserProfile } from '@/types';
import Link from 'next/link';

const FIELD_LABELS: { key: FieldKey; icon: string; label: string }[] = [
  { key: 'ageGroup',     icon: '🎂', label: '나이대' },
  { key: 'gender',       icon: '👤', label: '성별' },
  { key: 'region',       icon: '📍', label: '지역' },
  { key: 'occupation',   icon: '💼', label: '직업' },
  { key: 'incomeLevel',  icon: '💰', label: '소득 수준' },
  { key: 'householdType',icon: '🏠', label: '가구 유형' },
];

function getDisplayValue(key: FieldKey, value: string | undefined): string {
  if (!value) return '설정 안 함';
  const config = FIELD_CONFIG[key];
  return config.options.find((o) => o.value === value)?.label ?? value;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeField, setActiveField] = useState<FieldKey | null>(null);

  useEffect(() => {
    setProfile(getProfile());
    setLoaded(true);
  }, []);

  const handleFieldSave = (field: FieldKey, value: string) => {
    if (!profile) return;
    const updated = { ...profile, [field]: value };
    saveProfile(updated);
    setProfile(updated);
    setActiveField(null);
  };

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
              {/* Per-field edit rows */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50">
                  <h3 className="text-sm font-semibold text-[#1a1a1a]">내 조건</h3>
                </div>
                {FIELD_LABELS.map(({ key, icon, label }, i) => (
                  <button
                    key={key}
                    onClick={() => setActiveField(key)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#F4F8F6] transition-colors text-left ${
                      i < FIELD_LABELS.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{icon}</span>
                      <div>
                        <p className="text-xs text-[#888]">{label}</p>
                        <p className="text-sm font-semibold text-[#1a1a1a]">
                          {getDisplayValue(key, profile[key] as string | undefined)}
                        </p>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50">
                  <h3 className="text-sm font-semibold text-[#1a1a1a]">액션</h3>
                </div>
                <Link
                  href="/results"
                  className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 hover:bg-[#F4F8F6] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">🔍</span>
                    <span className="text-sm font-medium text-[#1a1a1a]">맞춤 혜택 다시 보기</span>
                  </div>
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <button
                  onClick={handleClear}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-red-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">🗑️</span>
                    <span className="text-sm font-medium text-red-500">프로필 초기화</span>
                  </div>
                  <svg className="w-4 h-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
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

          {/* Legal links */}
          <div className="flex items-center justify-center gap-4 pb-2">
            <Link href="/privacy" className="text-xs text-[#888] hover:text-[#1B6B4A]">개인정보처리방침</Link>
            <span className="text-gray-200">|</span>
            <Link href="/terms" className="text-xs text-[#888] hover:text-[#1B6B4A]">이용약관</Link>
          </div>
        </div>
      </div>

      {/* Per-field modal */}
      {activeField && profile && (
        <ProfileFieldModal
          field={activeField}
          currentValue={(profile[activeField] as string | undefined) ?? ''}
          onSave={handleFieldSave}
          onClose={() => setActiveField(null)}
        />
      )}
    </AppShell>
  );
}
