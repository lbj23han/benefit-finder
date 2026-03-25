import { describe, it, expect } from 'vitest';
import { getBestUrl } from '@/lib/deeplink';

describe('getBestUrl', () => {
  it('detailUrl 있으면 자세히 보기 반환', () => {
    const r = getBestUrl('https://example.go.kr/policy/123', undefined, undefined, '정책명');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.label).toBe('자세히 보기');
  });

  it('applyUrl만 있으면 신청하러 가기 반환', () => {
    const r = getBestUrl(undefined, 'https://example.go.kr/apply', undefined, '정책명');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.label).toBe('신청하러 가기');
  });

  it('WLF ID면 복지로 링크 반환', () => {
    const r = getBestUrl(undefined, undefined, 'WLF12345', '정책명');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.label).toBe('복지로에서 보기');
      expect(r.url).toContain('bokjiro.go.kr');
    }
  });

  it('URL도 WLF ID도 없으면 정부24 검색 폴백 반환', () => {
    const r = getBestUrl(undefined, undefined, 'seoul-youth-rent', '서울 청년 월세 지원');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.label).toBe('정부24에서 검색');
      expect(r.url).toContain('gov.kr');
      expect(r.url).toContain(encodeURIComponent('서울 청년 월세 지원'));
    }
  });

  it('모든 인자 없으면 ok: false', () => {
    const r = getBestUrl(undefined, undefined, undefined, undefined);
    expect(r.ok).toBe(false);
  });
});
