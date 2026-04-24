'use client';

import Link from 'next/link';
import { Check, Clock } from 'lucide-react';
import { Policy } from '@/types';
import { formatAmount, getCategoryLabel, getCategoryColor, getCategoryIcon, getRegionLabel } from '@/lib/utils';
import { getDaysUntilDeadline } from '@/lib/recommendation';
import BookmarkButton from '@/components/common/BookmarkButton';

interface PolicyCardProps {
  policy: Policy;
  score?: number;
  matchReasons?: string[];
  isFullMatch?: boolean;
  regionMatched?: boolean;
  compact?: boolean;
}

export default function PolicyCard({ policy, score, matchReasons, isFullMatch, regionMatched = true }: PolicyCardProps) {
  const days = getDaysUntilDeadline(policy);
  const isUrgent = days !== null && days >= 0 && days <= 7;
  const isExpired = days !== null && days < 0;
  const href = `/policy/${policy.id}/`;

  const BADGE = 'inline-flex items-center gap-1 h-5 text-xs font-semibold px-2 rounded-full whitespace-nowrap leading-none';

  const statusBadge = () => {
    if (isFullMatch) return (
      <span className={`${BADGE} bg-[#E0F2EC] text-[#1B6B4A]`}><Check size={10} strokeWidth={3} /> 신청 가능성 높음</span>
    );
    if (score && score >= 60 && regionMatched) return (
      <span className={`${BADGE} bg-blue-100 text-blue-700`}>◈ 조건 일치</span>
    );
    if (score !== undefined && score >= 35 && regionMatched) return (
      <span className={`${BADGE} bg-gray-100 text-gray-500`}>△ 조건 확인 필요</span>
    );
    return null;
  };

  const content = (
    <>
      {/* Fixed height card — content truncates, never grows */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-4 hover:shadow-md transition-shadow h-[210px] flex flex-col overflow-hidden">

        {/* Row 1: category + status badge + bookmark */}
        <div className="flex items-center justify-between mb-2 h-5">
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            <span className={`${BADGE} flex-shrink-0 ${getCategoryColor(policy.category)}`}>
              {getCategoryIcon(policy.category)} {getCategoryLabel(policy.category)}
            </span>
            <span className="flex-shrink-0 flex items-center">{statusBadge()}</span>
          </div>
          <span className="flex-shrink-0 ml-1">
            <BookmarkButton policyId={policy.id} />
          </span>
        </div>

        {/* Row 2: title — always 1 line */}
        <h3 className="font-bold text-[#1a1a1a] text-base leading-snug truncate mb-1">
          {policy.title}
        </h3>

        {/* Row 3: summary — always 2 lines */}
        <p className="text-xs text-[#888] line-clamp-2 leading-relaxed mb-2 flex-shrink-0" style={{ minHeight: '2.5rem' }}>
          {policy.summary}
        </p>

        {/* Row 4: amount / estimated benefit / description */}
        <div className="mb-2 flex-shrink-0" style={{ minHeight: '2rem' }}>
          {policy.benefitAmount ? (
            <>
              <p className="text-[10px] text-[#888] uppercase tracking-wide leading-none mb-0.5">최대 지원 금액</p>
              <p className="text-lg font-extrabold text-[#1B6B4A] leading-tight">{formatAmount(policy.benefitAmount)}</p>
            </>
          ) : policy.estimatedBenefitText ? (
            <>
              <p className="text-[10px] text-[#aaa] leading-none mb-0.5">예상 혜택</p>
              <p className="text-sm font-semibold text-[#2A9D8F] leading-tight truncate">{policy.estimatedBenefitText}</p>
            </>
          ) : (
            <p className="text-xs text-[#888] line-clamp-2 leading-relaxed">
              {policy.benefitDescription && policy.benefitDescription !== '지원 내용은 상세 페이지를 참고하세요.'
                ? policy.benefitDescription.slice(0, 50)
                : policy.summary.slice(0, 50)}
            </p>
          )}
        </div>

        {/* Row 5: footer — always at bottom */}
        <div className="flex items-center justify-between mt-auto overflow-hidden">
          <div className="flex items-center gap-1.5 overflow-hidden min-w-0 h-5">
            <span className="inline-flex items-center h-5 text-xs px-2 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap flex-shrink-0 leading-none">
              {getRegionLabel(policy.region)}
            </span>
            {isUrgent && (
              <span className="inline-flex items-center gap-1 h-5 text-xs px-2 rounded-full bg-red-100 text-red-600 font-semibold whitespace-nowrap flex-shrink-0 leading-none">
                <Clock size={10} /> {days}일 남음
              </span>
            )}
            {isExpired && (
              <span className="inline-flex items-center h-5 text-xs px-2 rounded-full bg-gray-100 text-gray-400 whitespace-nowrap flex-shrink-0 leading-none">
                마감됨
              </span>
            )}
            {!isUrgent && !isExpired && policy.isAlwaysOpen && (
              <span className="inline-flex items-center h-5 text-xs px-2 rounded-full bg-green-50 text-green-600 whitespace-nowrap flex-shrink-0 leading-none">
                상시접수
              </span>
            )}
            {matchReasons && matchReasons[0] && (
              <span className="inline-flex items-center h-5 text-[10px] px-2 rounded-full bg-[#F4F8F6] text-[#1B6B4A] truncate max-w-[100px] leading-none">
                {matchReasons[0]}
              </span>
            )}
          </div>
          <span className="text-xs text-[#2A9D8F] font-medium whitespace-nowrap ml-2 flex-shrink-0">보기 ›</span>
        </div>
      </div>
    </>
  );

  return (
    <Link href={href} className="block h-full active:scale-[0.97] transition-transform duration-150">
      {content}
    </Link>
  );
}
