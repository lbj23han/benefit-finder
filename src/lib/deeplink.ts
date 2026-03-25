/**
 * Deep link utilities for Korean government policy URLs.
 *
 * Strategy:
 * 1. Prefer detailUrl (specific policy page)
 * 2. Fall back to applyUrl if it's a valid deep link
 * 3. Return null + reason string if neither qualifies
 */

/** Returns true if the URL has a non-trivial path or query string. */
export function isDeepLink(url: string): boolean {
  try {
    const { pathname, search } = new URL(url);
    // Root or near-root paths are not deep links
    const isRootPath = pathname === '/' || pathname === '';
    const hasQuery = search.length > 1;
    const hasDeepPath = pathname.split('/').filter(Boolean).length >= 2;
    return !isRootPath || hasQuery || hasDeepPath;
  } catch {
    return false;
  }
}

export type DeepLinkResult =
  | { ok: true; url: string; label: '신청하러 가기' | '자세히 보기' | '복지로에서 보기' | '정부24에서 검색' }
  | { ok: false; reason: string };

/** Constructs a bokjiro.go.kr direct link for WLF* IDs. */
export function getBokjiroUrl(policyId: string): string | null {
  if (/^WLF\d+$/.test(policyId)) {
    return `https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=${policyId}`;
  }
  return null;
}

/**
 * Picks the best navigable URL for a policy.
 * Priority: detailUrl → applyUrl (if deep) → applyUrl (any) → bokjiro WLF → gov.kr search fallback
 */
export function getBestUrl(
  detailUrl?: string,
  applyUrl?: string,
  policyId?: string,
  policyTitle?: string,
): DeepLinkResult {
  if (detailUrl && isDeepLink(detailUrl)) {
    return { ok: true, url: detailUrl, label: '자세히 보기' };
  }
  if (applyUrl && isDeepLink(applyUrl)) {
    return { ok: true, url: applyUrl, label: '신청하러 가기' };
  }
  // applyUrl exists but is root-only — still usable as last resort
  if (applyUrl) {
    return { ok: true, url: applyUrl, label: '신청하러 가기' };
  }
  // Fallback: auto-generate bokjiro link from WLF policy ID
  if (policyId) {
    const bokjiroUrl = getBokjiroUrl(policyId);
    if (bokjiroUrl) {
      return { ok: true, url: bokjiroUrl, label: '복지로에서 보기' };
    }
  }
  // Last resort: 정부24 검색
  if (policyTitle) {
    const searchUrl = `https://www.gov.kr/search?query=${encodeURIComponent(policyTitle)}`;
    return { ok: true, url: searchUrl, label: '정부24에서 검색' };
  }
  return {
    ok: false,
    reason: '상세 페이지 바로 이동이 지원되지 않습니다.',
  };
}
