'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/types';
import { saveProfile } from '@/lib/storage';

const REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

const OCCUPATIONS: { value: UserProfile['occupation']; label: string; icon: string; desc: string }[] = [
  { value: 'employed', label: '직장인', icon: '💼', desc: '회사에 다니고 있어요' },
  { value: 'self-employed', label: '자영업자', icon: '🏪', desc: '내 사업을 하고 있어요' },
  { value: 'student', label: '학생', icon: '🎓', desc: '학교에 다니고 있어요' },
  { value: 'unemployed', label: '미취업', icon: '🔍', desc: '현재 구직 중이에요' },
  { value: 'freelancer', label: '프리랜서', icon: '💻', desc: '독립적으로 일하고 있어요' },
];

const INCOME_LEVELS: { value: UserProfile['incomeLevel']; label: string; desc: string }[] = [
  { value: 'low', label: '하위 50%', desc: '기준 중위소득 50% 이하' },
  { value: 'middle-low', label: '중하위', desc: '기준 중위소득 50~100%' },
  { value: 'middle', label: '중산층', desc: '기준 중위소득 100~150%' },
  { value: 'high', label: '고소득', desc: '기준 중위소득 150% 이상' },
];

const HOUSEHOLD_TYPES: { value: UserProfile['householdType']; label: string; icon: string }[] = [
  { value: 'single', label: '1인 가구', icon: '🙋' },
  { value: 'couple', label: '부부 (자녀 없음)', icon: '👫' },
  { value: 'family-with-children', label: '자녀가 있는 가족', icon: '👨‍👩‍👧' },
  { value: 'single-parent', label: '한부모 가족', icon: '👩‍👧' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});

  const totalSteps = 3;

  const next = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Save and go to results
      saveProfile(profile as UserProfile);
      router.push('/results');
    }
  };

  const back = () => {
    if (step > 1) setStep(step - 1);
    else router.push('/');
  };

  const canNext = () => {
    if (step === 1) return !!profile.ageGroup;
    if (step === 2) return !!profile.region && !!profile.occupation;
    if (step === 3) return !!profile.incomeLevel && !!profile.householdType;
    return false;
  };

  return (
    <div className="min-h-dvh bg-[#F4F8F6] flex justify-center">
      <div className="w-full max-w-[430px] min-h-dvh flex flex-col bg-white">
        {/* Header */}
        <div className="px-5 pt-12 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={back} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
              <svg className="w-5 h-5 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              {/* Progress bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1B6B4A] rounded-full transition-all duration-300"
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-[#1B6B4A] min-w-[28px]">{step}/{totalSteps}</span>
              </div>
            </div>
          </div>

          <div className="mb-1">
            <p className="text-xs font-bold text-[#2A9D8F] uppercase tracking-wider mb-2">
              {step === 1 && 'STEP 01 — 나이대'}
              {step === 2 && 'STEP 02 — 지역 & 직업'}
              {step === 3 && 'STEP 03 — 소득 & 가구'}
            </p>
            <h2 className="text-2xl font-extrabold text-[#1a1a1a]">
              {step === 1 && '나이대를 선택해 주세요'}
              {step === 2 && '거주 지역과 직업을 알려주세요'}
              {step === 3 && '소득과 가구 유형을 선택해 주세요'}
            </h2>
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 px-5 overflow-y-auto">
          {step === 1 && <Step1 profile={profile} setProfile={setProfile} />}
          {step === 2 && <Step2 profile={profile} setProfile={setProfile} />}
          {step === 3 && <Step3 profile={profile} setProfile={setProfile} />}
        </div>

        {/* CTA */}
        <div className="px-5 py-6 bg-white border-t border-gray-50">
          <button
            onClick={next}
            disabled={!canNext()}
            className={`w-full py-4 rounded-2xl font-extrabold text-base transition-all ${
              canNext()
                ? 'bg-[#1B6B4A] text-white shadow-md active:scale-95'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {step < totalSteps ? '다음으로 →' : '혜택 찾기 →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step1({ profile, setProfile }: { profile: Partial<UserProfile>; setProfile: (p: Partial<UserProfile>) => void }) {
  const options: { value: UserProfile['ageGroup']; title: string; range: string; desc: string; emoji: string }[] = [
    { value: 'youth', title: 'YOUTH', range: '20 ~ 34세', desc: '취업·주거·청년 혜택 집중', emoji: '🌱' },
    { value: 'prime', title: 'PRIME', range: '35 ~ 49세', desc: '가족·자녀·경력 혜택 집중', emoji: '💪' },
    { value: 'senior', title: 'SENIOR', range: '50세 이상', desc: '노후·건강·복지 혜택 집중', emoji: '🌿' },
  ];

  return (
    <div className="space-y-3 pb-4">
      {options.map((opt) => {
        const selected = profile.ageGroup === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setProfile({ ...profile, ageGroup: opt.value })}
            className={`w-full rounded-2xl p-5 text-left transition-all border-2 ${
              selected
                ? 'bg-gradient-to-r from-[#1B6B4A] to-[#2A9D8F] border-transparent text-white shadow-lg scale-[1.02]'
                : 'bg-white border-gray-100 hover:border-[#2A9D8F]/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{opt.emoji}</span>
                <div>
                  <p className={`text-xs font-black tracking-wider mb-0.5 ${selected ? 'text-white/80' : 'text-[#2A9D8F]'}`}>
                    {opt.title}
                  </p>
                  <p className={`text-xl font-extrabold ${selected ? 'text-white' : 'text-[#1a1a1a]'}`}>
                    {opt.range}
                  </p>
                  <p className={`text-xs mt-1 ${selected ? 'text-white/70' : 'text-[#888]'}`}>{opt.desc}</p>
                </div>
              </div>
              {selected && (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        );
      })}

      {/* Info notice */}
      <div className="bg-blue-50 rounded-2xl p-4 flex gap-3 mt-4">
        <span className="text-blue-500 text-lg mt-0.5">ℹ️</span>
        <p className="text-xs text-blue-700 leading-relaxed">
          나이대에 따라 추천되는 맞춤형 복지 혜택이 달라집니다. 정확한 나이대를 선택하면 더 많은 혜택을 찾을 수 있어요.
        </p>
      </div>
    </div>
  );
}

function Step2({ profile, setProfile }: { profile: Partial<UserProfile>; setProfile: (p: Partial<UserProfile>) => void }) {
  return (
    <div className="space-y-5 pb-4">
      {/* Region */}
      <div>
        <p className="text-sm font-bold text-[#1a1a1a] mb-3">거주 지역</p>
        <div className="grid grid-cols-4 gap-2">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setProfile({ ...profile, region: r })}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                profile.region === r
                  ? 'bg-[#1B6B4A] text-white shadow-sm'
                  : 'bg-gray-50 text-[#555] border border-gray-100 hover:border-[#2A9D8F]/30'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Occupation */}
      <div>
        <p className="text-sm font-bold text-[#1a1a1a] mb-3">직업</p>
        <div className="space-y-2">
          {OCCUPATIONS.map((occ) => {
            const selected = profile.occupation === occ.value;
            return (
              <button
                key={occ.value}
                onClick={() => setProfile({ ...profile, occupation: occ.value })}
                className={`w-full rounded-xl p-4 flex items-center gap-3 text-left transition-all border ${
                  selected
                    ? 'bg-[#E0F2EC] border-[#1B6B4A] text-[#1B6B4A]'
                    : 'bg-white border-gray-100 hover:border-[#2A9D8F]/30'
                }`}
              >
                <span className="text-2xl">{occ.icon}</span>
                <div>
                  <p className={`font-bold text-sm ${selected ? 'text-[#1B6B4A]' : 'text-[#1a1a1a]'}`}>{occ.label}</p>
                  <p className="text-xs text-[#888]">{occ.desc}</p>
                </div>
                {selected && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-[#1B6B4A] flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Step3({ profile, setProfile }: { profile: Partial<UserProfile>; setProfile: (p: Partial<UserProfile>) => void }) {
  return (
    <div className="space-y-5 pb-4">
      {/* Income */}
      <div>
        <p className="text-sm font-bold text-[#1a1a1a] mb-1">소득 수준</p>
        <p className="text-xs text-[#888] mb-3">기준 중위소득을 기준으로 선택해 주세요</p>
        <div className="space-y-2">
          {INCOME_LEVELS.map((inc) => {
            const selected = profile.incomeLevel === inc.value;
            return (
              <button
                key={inc.value}
                onClick={() => setProfile({ ...profile, incomeLevel: inc.value })}
                className={`w-full rounded-xl p-4 flex items-center justify-between text-left transition-all border ${
                  selected
                    ? 'bg-[#E0F2EC] border-[#1B6B4A]'
                    : 'bg-white border-gray-100 hover:border-[#2A9D8F]/30'
                }`}
              >
                <div>
                  <p className={`font-bold text-sm ${selected ? 'text-[#1B6B4A]' : 'text-[#1a1a1a]'}`}>{inc.label}</p>
                  <p className="text-xs text-[#888]">{inc.desc}</p>
                </div>
                {selected && (
                  <div className="w-5 h-5 rounded-full bg-[#1B6B4A] flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Household */}
      <div>
        <p className="text-sm font-bold text-[#1a1a1a] mb-3">가구 유형</p>
        <div className="grid grid-cols-2 gap-2">
          {HOUSEHOLD_TYPES.map((h) => {
            const selected = profile.householdType === h.value;
            return (
              <button
                key={h.value}
                onClick={() => setProfile({ ...profile, householdType: h.value })}
                className={`rounded-2xl p-4 flex flex-col items-center gap-2 transition-all border-2 ${
                  selected
                    ? 'bg-[#E0F2EC] border-[#1B6B4A]'
                    : 'bg-white border-gray-100 hover:border-[#2A9D8F]/30'
                }`}
              >
                <span className="text-3xl">{h.icon}</span>
                <p className={`text-xs font-bold text-center ${selected ? 'text-[#1B6B4A]' : 'text-[#1a1a1a]'}`}>
                  {h.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Privacy notice */}
      <div className="bg-blue-50 rounded-2xl p-4 flex gap-3">
        <span className="text-blue-500 text-lg mt-0.5">🔒</span>
        <p className="text-xs text-blue-700 leading-relaxed">
          입력하신 정보는 혜택 추천에만 사용되며, 기기 내에만 저장됩니다. 개인정보는 수집·저장되지 않아요.
        </p>
      </div>
    </div>
  );
}
