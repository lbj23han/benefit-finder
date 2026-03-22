import React from 'react';
import {
  Home, Briefcase, Sprout, GraduationCap, Baby, Heart, Rocket, ClipboardList,
  Cake, MapPin, Wallet, Clock, AlertTriangle,
} from 'lucide-react';
import { Policy } from '@/types';

export function formatAmount(amount: number): string {
  if (amount >= 10000) {
    const eok = Math.floor(amount / 10000);
    const man = amount % 10000;
    if (man === 0) return `${eok}억원`;
    return `${eok}억 ${man}만원`;
  }
  return `${amount.toLocaleString()}만원`;
}

export function getCategoryLabel(category: Policy['category']): string {
  const map: Record<Policy['category'], string> = {
    housing: '주거',
    employment: '취업·고용',
    youth: '청년',
    education: '교육',
    childcare: '보육·육아',
    welfare: '복지',
    business: '창업·사업',
  };
  return map[category] ?? category;
}

export function getCategoryColor(category: Policy['category']): string {
  const map: Record<Policy['category'], string> = {
    housing: 'bg-blue-100 text-blue-700',
    employment: 'bg-orange-100 text-orange-700',
    youth: 'bg-purple-100 text-purple-700',
    education: 'bg-yellow-100 text-yellow-700',
    childcare: 'bg-pink-100 text-pink-700',
    welfare: 'bg-green-100 text-green-700',
    business: 'bg-indigo-100 text-indigo-700',
  };
  return map[category] ?? 'bg-gray-100 text-gray-700';
}

export function getCategoryIcon(category: Policy['category']): React.ReactNode {
  const props = { size: 12, style: { display: 'inline', flexShrink: 0 } };
  const map: Record<Policy['category'], React.ReactNode> = {
    housing:    React.createElement(Home,          props),
    employment: React.createElement(Briefcase,     props),
    youth:      React.createElement(Sprout,        props),
    education:  React.createElement(GraduationCap, props),
    childcare:  React.createElement(Baby,          props),
    welfare:    React.createElement(Heart,         props),
    business:   React.createElement(Rocket,        props),
  };
  return map[category] ?? React.createElement(ClipboardList, props);
}

/** Maps emoji icon strings (used in eligibility data) to Lucide icons */
export function getEligibilityIcon(icon: string): React.ReactNode {
  const emojiMap: Record<string, React.ReactNode> = {
    '🎂': React.createElement(Cake,          { size: 20, className: 'text-[#1B6B4A] flex-shrink-0 mt-0.5' }),
    '💼': React.createElement(Briefcase,     { size: 20, className: 'text-[#1B6B4A] flex-shrink-0 mt-0.5' }),
    '💰': React.createElement(Wallet,        { size: 20, className: 'text-[#1B6B4A] flex-shrink-0 mt-0.5' }),
    '📍': React.createElement(MapPin,        { size: 20, className: 'text-[#1B6B4A] flex-shrink-0 mt-0.5' }),
    '🏠': React.createElement(Home,          { size: 20, className: 'text-[#1B6B4A] flex-shrink-0 mt-0.5' }),
    '👶': React.createElement(Baby,          { size: 20, className: 'text-[#1B6B4A] flex-shrink-0 mt-0.5' }),
    '🚀': React.createElement(Rocket,        { size: 20, className: 'text-[#1B6B4A] flex-shrink-0 mt-0.5' }),
    '🎓': React.createElement(GraduationCap, { size: 20, className: 'text-[#1B6B4A] flex-shrink-0 mt-0.5' }),
    '⏰': React.createElement(Clock,         { size: 20, className: 'text-[#1B6B4A] flex-shrink-0 mt-0.5' }),
    '🏪': React.createElement(ClipboardList, { size: 20, className: 'text-[#1B6B4A] flex-shrink-0 mt-0.5' }),
    '👨‍👩‍👧': React.createElement(Heart,      { size: 20, className: 'text-[#1B6B4A] flex-shrink-0 mt-0.5' }),
  };
  return emojiMap[icon] ?? React.createElement(AlertTriangle, { size: 20, className: 'text-[#1B6B4A] flex-shrink-0 mt-0.5' });
}

export function getRegionLabel(regions: string[]): string {
  if (regions.includes('전국')) return '전국';
  return regions.join(', ');
}

export function getOccupationLabel(occupation: string): string {
  const map: Record<string, string> = {
    employed: '직장인',
    'self-employed': '자영업자',
    student: '학생',
    unemployed: '미취업',
    freelancer: '프리랜서',
  };
  return map[occupation] ?? occupation;
}

export function getIncomeLabel(level: string): string {
  const map: Record<string, string> = {
    low: '하위 50%',
    'middle-low': '중하위',
    middle: '중산층',
    high: '고소득',
  };
  return map[level] ?? level;
}

export function getHouseholdLabel(type: string): string {
  const map: Record<string, string> = {
    single:                '1인 가구',
    'with-parents':        '부모와 함께',
    couple:                '부부',
    'family-with-children': '자녀 있는 가구',
    'single-parent':       '한부모 가구',
  };
  return map[type] ?? type;
}
