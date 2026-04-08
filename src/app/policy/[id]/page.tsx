'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import BookmarkButton from '@/components/common/BookmarkButton';
import { Info, Clock, Frown } from 'lucide-react';
import { formatAmount, getCategoryLabel, getCategoryIcon, getEligibilityIcon } from '@/lib/utils';
import { getDaysUntilDeadline } from '@/lib/recommendation';
import { getBestUrl } from '@/lib/deeplink';
import AdBanner from '@/components/common/AdBanner';
import { usePolicies } from '@/hooks/usePolicies';

export default function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // usePolicies: Phase1(큐레이션 25개 즉시) → Phase2(전체 6060개 백그라운드 로드)
  const { policies, loading } = usePolicies();
  const policy = policies.find((p) => p.id === id);

  // 아직 로딩 중이고 정책도 못 찾은 상태 → 스피너
  if (loading && !policy) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-[#1B6B4A] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  // 로딩 완료 후에도 없으면 404
  if (!policy) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <div className="mb-4 text-[#888]"><Frown size={56} /></div>
          <h2 className="text-xl font-bold text-[#1a1a1a] mb-2">혜택을 찾을 수 없어요</h2>
          <p className="text-sm text-[#888] mb-6">삭제됐거나 잘못된 링크예요</p>
          <Link href="/results" className="bg-[#1B6B4A] text-white font-bold py-3 px-8 rounded-xl">
            혜택 목록으로
          </Link>
        </div>
      </AppShell>
    );
  }

  const days = getDaysUntilDeadline(policy);
  const isUrgent = days !== null && days >= 0 && days <= 7;

  const benefitTypeLabel: Record<string, string> = {
    cash: '현금 지원',
    loan: '저금리 대출',
    service: '서비스 지원',
    'tax-reduction': '세금 감면',
    voucher: '바우처',
  };

  // detailUrl / applyUrl 은 큐레이션 정책에만 존재. API 정책은 WLF ID로 bokjiro 링크 자동 생성.
  const link = getBestUrl(policy.detailUrl, policy.applyUrl, policy.id, policy.title);

  return (
    <AppShell>
      <div className="flex flex-col">
        {/* Header */}
        <header className="bg-white px-5 pt-12 pb-4 lg:pt-8 sticky top-0 z-30 border-b border-gray-50">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100" aria-label="뒤로 가기">
              <svg className="w-5 h-5 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-[#1B6B4A]">혜택줍줍</span>
            <BookmarkButton policyId={policy.id} />
          </div>
        </header>

        <div className="px-5 py-5 space-y-5 lg:max-w-2xl lg:px-8">
          {/* Category + title */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-[#2A9D8F] uppercase tracking-wider">혜택줍줍 •</span>
              <span className="text-xs font-bold text-[#555]">{getCategoryLabel(policy.category)} 지원 정책</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#1a1a1a] leading-tight mb-2">{policy.title}</h1>
            <p className="text-sm text-[#555] leading-relaxed">{policy.summary}</p>

            {/* Tags */}
            {policy.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {policy.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-[#E0F2EC] text-[#1B6B4A] font-medium">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* MAX BENEFIT box */}
          {policy.benefitAmount && (
            <div className="border-2 border-[#1B6B4A] rounded-2xl p-5 bg-[#F4F8F6]">
              <p className="text-xs font-black text-[#2A9D8F] uppercase tracking-widest mb-2">MAX BENEFIT</p>
              <p className="text-4xl font-black text-[#1B6B4A]">{formatAmount(policy.benefitAmount)}</p>
              {policy.benefitDescription && (
                <p className="text-xs text-[#555] mt-2">{policy.benefitDescription}</p>
              )}
            </div>
          )}

          {/* Benefit type + org */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <p className="text-[10px] text-[#888] mb-1">지원 유형</p>
              <p className="text-sm font-bold text-[#1a1a1a]">{benefitTypeLabel[policy.benefitType] ?? policy.benefitType}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <p className="text-[10px] text-[#888] mb-1">주관 기관</p>
              <p className="text-sm font-bold text-[#1a1a1a]">{policy.sourceOrg}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <p className="text-[10px] text-[#888] mb-1">지원 지역</p>
              <p className="text-sm font-bold text-[#1a1a1a]">{policy.region.join(', ')}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <p className="text-[10px] text-[#888] mb-1">신청 기간</p>
              {policy.isAlwaysOpen ? (
                <p className="text-sm font-bold text-green-600">상시 접수</p>
              ) : (
                <p className={`text-sm font-bold ${isUrgent ? 'text-red-600' : 'text-[#1a1a1a]'}`}>
                  {isUrgent
                    ? <span className="flex items-center gap-1"><Clock size={12} />{days}일 남음</span>
                    : policy.applicationEnd ? `~${policy.applicationEnd}` : '미정'}
                </p>
              )}
            </div>
          </div>

          {/* Description — 큐레이션 정책에만 있음 */}
          {policy.description && (
            <div>
              <h2 className="text-base font-extrabold text-[#1a1a1a] mb-3">사업 개요</h2>
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="text-sm text-[#555] leading-relaxed">{policy.description}</p>
              </div>
            </div>
          )}

          {/* Eligibility — 큐레이션 정책에만 있음 */}
          {policy.eligibility?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-extrabold text-[#1a1a1a]">신청 자격 요건</h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#E0F2EC] text-[#1B6B4A]">CHECKLIST</span>
              </div>
              <div className="space-y-2">
                {policy.eligibility.map((rule, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 flex gap-3 items-start">
                    {getEligibilityIcon(rule.icon)}
                    <div>
                      <p className="text-sm font-bold text-[#1a1a1a]">{rule.label}</p>
                      <p className="text-xs text-[#888] mt-0.5">{rule.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-blue-50 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-700 mb-1">참고 사항</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  지원 내용 및 자격 조건은 변경될 수 있습니다. 정확한 정보는 {policy.sourceOrg} 공식 홈페이지 또는 주민센터에서 확인하세요.
                </p>
              </div>
            </div>
          </div>

          {/* Apply CTA */}
          <div className="space-y-3">
            {link.ok ? (
              <>
                {!policy.urlVerified && (
                  <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 rounded-2xl border border-amber-100">
                    <span className="text-amber-500 text-sm flex-shrink-0 mt-0.5">⚠</span>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      링크가 공식 사이트로 연결되지만, 정확한 페이지는 직접 확인이 필요할 수 있어요.
                      사이트 내에서 <strong>&quot;{policy.title}&quot;</strong>를 검색해 보세요.
                    </p>
                  </div>
                )}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-[#1B6B4A] text-white font-extrabold py-5 rounded-2xl shadow-md text-base"
                >
                  {link.label} →
                </a>
                <p className="text-center text-xs text-[#888]">
                  {policy.urlVerified ? '공식 페이지로 이동합니다' : '외부 사이트로 이동합니다'}
                </p>
                {/* 광고 배너 — 신청 버튼 아래 */}
                <AdBanner className="mt-4" />
              </>
            ) : (
              <>
                <div className="w-full text-center bg-gray-100 text-gray-400 font-bold py-5 rounded-2xl text-base">
                  주민센터 방문 신청
                </div>
                <p className="text-center text-xs text-amber-500">⚠ {link.reason}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
