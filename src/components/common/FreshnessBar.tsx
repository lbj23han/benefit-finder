'use client';

interface FreshnessBarProps {
  fetchedAt: Date | null;
  source: 'api' | 'mock' | null;
  isStale: boolean;
  loading: boolean;
  onRefresh: () => void;
}

function formatKoreanDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${mo}.${day} ${h}:${m}`;
}

export default function FreshnessBar({
  fetchedAt,
  source,
  isStale,
  loading,
  onRefresh,
}: FreshnessBarProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-5 py-2 bg-amber-50 border-b border-amber-100">
        <div className="w-3 h-3 border border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <span className="text-xs text-amber-700">최신 정책 정보를 다시 불러오고 있어요</span>
      </div>
    );
  }

  if (isStale) {
    return (
      <div className="flex items-center gap-2 px-5 py-2 bg-amber-50 border-b border-amber-100">
        <span className="text-amber-500 text-sm flex-shrink-0">⚠</span>
        <span className="text-xs text-amber-700 flex-1">데이터가 오래됐어요</span>
        <button
          onClick={onRefresh}
          className="text-xs font-bold text-amber-700 underline flex-shrink-0"
        >
          새로 고침
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-5 py-2 bg-[#F4F8F6] border-b border-gray-100">
      <span className="text-[10px] text-[#888]">
        최종 업데이트:{' '}
        <span className="font-medium text-[#555]">
          {fetchedAt ? formatKoreanDate(fetchedAt) : '—'}
        </span>
      </span>
      {source === 'mock' && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 font-medium ml-1">
          샘플 데이터
        </span>
      )}
      <button
        onClick={onRefresh}
        className="ml-auto text-[10px] text-[#2A9D8F] font-medium flex items-center gap-1"
        aria-label="새로 고침"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        새로 고침
      </button>
    </div>
  );
}
