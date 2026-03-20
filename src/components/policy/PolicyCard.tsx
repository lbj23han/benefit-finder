'use client';

import Link from 'next/link';
import { Policy } from '@/types';
import { formatAmount, getCategoryLabel, getCategoryColor, getCategoryIcon, getRegionLabel } from '@/lib/utils';
import { getDaysUntilDeadline } from '@/lib/recommendation';
import BookmarkButton from '@/components/common/BookmarkButton';

interface PolicyCardProps {
  policy: Policy;
  score?: number;
  matchReasons?: string[];
  isFullMatch?: boolean;
  compact?: boolean;
}

export default function PolicyCard({ policy, score, matchReasons, isFullMatch, compact }: PolicyCardProps) {
  const days = getDaysUntilDeadline(policy);
  const isUrgent = days !== null && days >= 0 && days <= 7;
  const isExpired = days !== null && days < 0;

  const statusBadge = () => {
    if (isFullMatch) {
      return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E0F2EC] text-[#1B6B4A]">✓ 신청 가능성 높음</span>;
    }
    if (score && score >= 50) {
      return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">◈ 조건 일치</span>;
    }
    if (score !== undefined) {
      return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">○ 분석 중</span>;
    }
    return null;
  };

  return (
    <Link href={`/policy/${policy.id}`} className="block">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-4 hover:shadow-md transition-shadow cursor-pointer">
        {/* Top row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getCategoryColor(policy.category)}`}>
              {getCategoryIcon(policy.category)} {getCategoryLabel(policy.category)}
            </span>
            {statusBadge()}
          </div>
          <BookmarkButton policyId={policy.id} />
        </div>

        {/* Title */}
        <h3 className="font-bold text-[#1a1a1a] text-base leading-snug mb-1">{policy.title}</h3>
        {!compact && <p className="text-xs text-[#888] mb-3 line-clamp-2">{policy.summary}</p>}

        {/* Amount */}
        {policy.benefitAmount && (
          <div className="mb-3">
            <p className="text-[10px] text-[#888] uppercase tracking-wide mb-0.5">최대 지원 금액</p>
            <p className="text-xl font-extrabold text-[#1B6B4A]">{formatAmount(policy.benefitAmount)}</p>
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              {getRegionLabel(policy.region)}
            </span>
            {(policy.ageMin || policy.ageMax) && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {policy.ageMin && policy.ageMax
                  ? `${policy.ageMin}~${policy.ageMax}세`
                  : policy.ageMin
                  ? `${policy.ageMin}세 이상`
                  : `${policy.ageMax}세 이하`}
              </span>
            )}
            {isUrgent && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">
                ⏰ {days}일 남음
              </span>
            )}
            {isExpired && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                마감됨
              </span>
            )}
            {policy.isAlwaysOpen && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                상시접수
              </span>
            )}
          </div>
          <span className="text-xs text-[#2A9D8F] font-medium">자세히 보기 ›</span>
        </div>

        {/* Match reasons */}
        {matchReasons && matchReasons.length > 0 && !compact && (
          <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-1">
            {matchReasons.slice(0, 3).map((reason, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4F8F6] text-[#1B6B4A]">
                {reason}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
