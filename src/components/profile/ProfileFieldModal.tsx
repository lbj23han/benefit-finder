'use client';

import { useEffect, useRef } from 'react';
import { UserProfile } from '@/types';

type FieldKey = 'ageGroup' | 'gender' | 'region' | 'district' | 'occupation' | 'incomeLevel' | 'householdType';

interface Option {
  value: string;
  label: string;
  description?: string;
}

const FIELD_CONFIG: Record<FieldKey, { title: string; options: Option[] }> = {
  gender: {
    title: '성별',
    options: [
      { value: 'male',   label: '남성' },
      { value: 'female', label: '여성' },
      { value: 'other',  label: '선택 안 함', description: '성별 무관 혜택을 모두 표시해요' },
    ],
  },
  ageGroup: {
    title: '나이대',
    options: [
      { value: '20s',    label: '20대', description: '만 20~29세' },
      { value: '30s',    label: '30대', description: '만 30~39세' },
      { value: '40s',    label: '40대', description: '만 40~49세' },
      { value: '50s',    label: '50대', description: '만 50~59세' },
      { value: '60plus', label: '60대 이상', description: '만 60세 이상' },
    ],
  },
  region: {
    title: '거주 지역',
    options: [
      { value: '서울', label: '서울' },
      { value: '경기', label: '경기' },
      { value: '인천', label: '인천' },
      { value: '부산', label: '부산' },
      { value: '대구', label: '대구' },
      { value: '광주', label: '광주' },
      { value: '대전', label: '대전' },
      { value: '울산', label: '울산' },
      { value: '세종', label: '세종' },
      { value: '강원', label: '강원' },
      { value: '충북', label: '충북' },
      { value: '충남', label: '충남' },
      { value: '전북', label: '전북' },
      { value: '전남', label: '전남' },
      { value: '경북', label: '경북' },
      { value: '경남', label: '경남' },
      { value: '제주', label: '제주' },
    ],
  },
  occupation: {
    title: '직업',
    options: [
      { value: 'employed', label: '직장인' },
      { value: 'self-employed', label: '자영업' },
      { value: 'student', label: '학생' },
      { value: 'unemployed', label: '미취업' },
      { value: 'freelancer', label: '프리랜서' },
    ],
  },
  incomeLevel: {
    title: '소득 수준',
    options: [
      { value: 'low',        label: '기초/차상위', description: '중위소득 50% 이하 · 1인 월 약 119만원 이하' },
      { value: 'middle-low', label: '중위 이하',   description: '중위소득 50~100% · 1인 월 119~239만원' },
      { value: 'middle',     label: '중위 이상',   description: '중위소득 100~150% · 1인 월 239~359만원' },
      { value: 'high',       label: '고소득',      description: '중위소득 150% 초과 · 1인 월 359만원 초과' },
    ],
  },
  householdType: {
    title: '가구 유형',
    options: [
      { value: 'single',               label: '1인 가구',       description: '혼자 독립해서 살아요' },
      { value: 'with-parents',         label: '부모와 함께',     description: '부모님 집에서 같이 살아요' },
      { value: 'couple',               label: '부부 가구',       description: '배우자와 둘이 살아요' },
      { value: 'family-with-children', label: '자녀 있는 가구',  description: '자녀와 함께 살아요' },
      { value: 'single-parent',        label: '한부모 가구',     description: '혼자 자녀를 키워요' },
    ],
  },
  district: {
    title: '세부 지역 (구/시/군)',
    options: [], // dynamically overridden via overrideOptions prop
  },
};

interface ProfileFieldModalProps {
  field: FieldKey;
  currentValue: string;
  onSave: (field: FieldKey, value: string) => void;
  onClose: () => void;
  overrideOptions?: Option[];
}

export default function ProfileFieldModal({ field, currentValue, onSave, onClose, overrideOptions }: ProfileFieldModalProps) {
  const config = FIELD_CONFIG[field];
  const options = overrideOptions ?? config.options;
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-3xl px-5 pt-6 pb-5 max-h-[80dvh] overflow-y-auto">

        <h2 className="text-lg font-extrabold text-[#1a1a1a] mb-4">{config.title} 선택</h2>

        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSave(field, opt.value)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-colors text-left ${
                currentValue === opt.value
                  ? 'border-[#1B6B4A] bg-[#E0F2EC]'
                  : 'border-gray-100 bg-white hover:bg-gray-50'
              }`}
            >
              <div>
                <p className={`font-semibold text-sm ${currentValue === opt.value ? 'text-[#1B6B4A]' : 'text-[#1a1a1a]'}`}>
                  {opt.label}
                </p>
                {opt.description && (
                  <p className="text-xs text-[#888] mt-0.5">{opt.description}</p>
                )}
              </div>
              {currentValue === opt.value && (
                <span className="text-[#1B6B4A] text-lg">✓</span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-3.5 rounded-2xl border border-gray-200 text-sm font-semibold text-[#555]"
        >
          취소
        </button>
      </div>
    </div>
  );
}

export { FIELD_CONFIG };
export type { FieldKey };
