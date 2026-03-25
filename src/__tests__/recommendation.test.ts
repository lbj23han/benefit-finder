import { describe, it, expect } from 'vitest';
import { getRecommendations, getDaysUntilDeadline } from '@/lib/recommendation';
import type { Policy, UserProfile } from '@/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseProfile: UserProfile = {
  ageGroup: '30s',
  gender: 'male',
  region: '서울',
  occupation: 'employed',
  incomeLevel: 'middle',
  householdType: 'single',
};

/**
 * makePolicy: 실제 데이터에 가까운 mock 정책 생성.
 * 기본적으로 ageMin/ageMax와 relevanceScore를 포함해 현실적인 점수 범위를 만든다.
 */
function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    id: 'test-001',
    title: '청년 취업 지원',
    summary: '취업을 원하는 청년을 지원합니다',
    description: '',
    category: 'employment',
    region: ['전국'],
    eligibility: [],
    ageMin: 19,
    ageMax: 69,
    occupationTarget: ['employed'],
    benefitType: 'cash',
    benefitDescription: '지원금',
    isAlwaysOpen: true,
    sourceOrg: '고용노동부',
    tags: [],
    relevanceScore: 0.75,
    ...overrides,
  };
}

// 점수 추출 헬퍼
function scoreOf(policy: Policy, profile: UserProfile = baseProfile): number {
  const results = getRecommendations([policy], profile);
  return results.find(r => r.policy.id === policy.id)?.score ?? -1;
}

// ─── 1. 만료된 정책 필터링 ────────────────────────────────────────────────────

describe('만료 정책 필터링', () => {
  it('applicationEnd가 과거인 정책은 결과에서 제외된다', () => {
    const expired = makePolicy({ id: 'exp-1', applicationEnd: '2020-01-01' });
    const results = getRecommendations([expired], baseProfile);
    expect(results.find(r => r.policy.id === 'exp-1')).toBeUndefined();
  });

  it('isAlwaysOpen이어도 applicationEnd가 과거면 제외된다', () => {
    const expired = makePolicy({ id: 'exp-2', isAlwaysOpen: true, applicationEnd: '2024-01-01' });
    const results = getRecommendations([expired], baseProfile);
    expect(results.find(r => r.policy.id === 'exp-2')).toBeUndefined();
  });

  it('applicationEnd가 미래인 정책은 포함된다', () => {
    const active = makePolicy({ id: 'active-1', applicationEnd: '2030-01-01' });
    expect(getRecommendations([active], baseProfile).find(r => r.policy.id === 'active-1')).toBeDefined();
  });

  it('applicationEnd가 없고 isAlwaysOpen인 정책은 포함된다', () => {
    const always = makePolicy({ id: 'always-1', isAlwaysOpen: true });
    expect(getRecommendations([always], baseProfile).find(r => r.policy.id === 'always-1')).toBeDefined();
  });
});

// ─── 2. 특수 집단 하드 블록 ───────────────────────────────────────────────────

describe('특수 집단 하드 블록 (score ≤ 10 기대)', () => {
  const BLOCKED = 10;

  it('국가유공자 정책 → 일반 직장인에게 차단', () => {
    expect(scoreOf(makePolicy({ title: '국가유공자 생활안정지원금' }))).toBeLessThanOrEqual(BLOCKED);
  });

  it('현역 군인 정책 → 일반 직장인에게 차단', () => {
    expect(scoreOf(makePolicy({ title: '현역 군인 복지 지원' }))).toBeLessThanOrEqual(BLOCKED);
  });

  it('농업인 정책 → 일반 직장인에게 차단', () => {
    expect(scoreOf(makePolicy({ title: '농업인 경영안정 직불금' }))).toBeLessThanOrEqual(BLOCKED);
  });

  it('원양어선 선원 정책 → 일반 직장인에게 차단', () => {
    expect(scoreOf(makePolicy({ title: '원양어선 선원 복지 지원' }))).toBeLessThanOrEqual(BLOCKED);
  });

  it('폐광 이직근로자 정책 → 일반 직장인에게 차단', () => {
    expect(scoreOf(makePolicy({ title: '폐광 및 감축 이직근로자대책비 지원' }))).toBeLessThanOrEqual(BLOCKED);
  });

  it('광업 종사 근로자 정책 → 일반 직장인에게 차단', () => {
    expect(scoreOf(makePolicy({ title: '광업 종사 근로자 건강진단 지원' }))).toBeLessThanOrEqual(BLOCKED);
  });

  it('SPECIALIST(유휴간호사) → employed에게도 차단', () => {
    expect(scoreOf(makePolicy({ title: '유휴간호사 등 교육 및 취업 연계 서비스 제공' }),
      { ...baseProfile, occupation: 'employed' })).toBeLessThanOrEqual(BLOCKED);
  });

  it('SPECIALIST(유휴간호사) → 자영업자에게도 차단', () => {
    expect(scoreOf(makePolicy({ title: '유휴간호사 등 교육 및 취업 연계 서비스 제공' }),
      { ...baseProfile, occupation: 'self-employed' })).toBeLessThanOrEqual(BLOCKED);
  });

  it('한센인 정책 → 최저 점수', () => {
    expect(scoreOf(makePolicy({ title: '한센인 정착농원 지원' }))).toBeLessThanOrEqual(5);
  });

  it('장애인 정책 → 장애 미등록 사용자에게 차단', () => {
    const p = makePolicy({ title: '장애인 보조기기 지원사업', occupationTarget: [] });
    expect(scoreOf(p, { ...baseProfile, hasDisability: undefined })).toBeLessThanOrEqual(BLOCKED);
  });

  it('장애인 정책 → 장애 등록 사용자에게는 정상 점수', () => {
    const p = makePolicy({ title: '장애인 보조기기 지원사업', occupationTarget: [] });
    expect(scoreOf(p, { ...baseProfile, hasDisability: 'yes' })).toBeGreaterThan(BLOCKED);
  });
});

// ─── 3. EMPLOYER_FACING 블록 ─────────────────────────────────────────────────

describe('사업주 대상(EMPLOYER_FACING) 블록', () => {
  it('채용지원 정책 → 직장인(employed)에게 낮은 점수', () => {
    expect(scoreOf(makePolicy({ title: '청년 채용지원 장려금' }),
      { ...baseProfile, occupation: 'employed' })).toBeLessThanOrEqual(10);
  });

  it('채용지원 정책 → 자영업자도 낮은 점수 (사업주 신청용이지만 개인혜택 아님)', () => {
    const score = scoreOf(makePolicy({ title: '청년 채용지원 장려금' }),
      { ...baseProfile, occupation: 'self-employed' });
    expect(score).toBeLessThanOrEqual(35); // 0.18 eligibility → 낮지만 완전차단은 아님
  });
});

// ─── 4. 지역 필터링 ──────────────────────────────────────────────────────────

describe('지역 필터링', () => {
  const BLOCKED = 10;

  it('서울 사용자에게 전남 지역 정책은 낮은 점수', () => {
    expect(scoreOf(makePolicy({ region: ['전남'] }))).toBeLessThanOrEqual(BLOCKED);
  });

  it('서울 사용자에게 서울 지역 정책은 전남보다 높은 점수', () => {
    const seoulScore = scoreOf(makePolicy({ region: ['서울'] }));
    const jeonnamScore = scoreOf(makePolicy({ id: 'jn', region: ['전남'] }));
    expect(seoulScore).toBeGreaterThan(jeonnamScore);
  });

  it('전국 + 제주 추론 가능 제목 → 서울 사용자에게 낮은 점수', () => {
    expect(scoreOf(makePolicy({ title: '제주도 청년 취업 지원사업', region: ['전국'] }))).toBeLessThanOrEqual(BLOCKED);
  });

  it('전국 + 제주 추론 가능 제목 → 제주 사용자에게는 서울 사용자보다 높은 점수', () => {
    const p = makePolicy({ title: '제주도 청년 취업 지원사업', region: ['전국'] });
    const jeju = scoreOf(p, { ...baseProfile, region: '제주' });
    const seoul = scoreOf(p, { ...baseProfile, region: '서울' });
    expect(jeju).toBeGreaterThan(seoul);
  });

  it('전국 + 부산진구 org → 경기 사용자에게 낮은 점수', () => {
    expect(scoreOf(makePolicy({
      title: '부산진구 청년 자격시험 응시료 지원',
      sourceOrg: '부산진구', region: ['전국'],
    }), { ...baseProfile, region: '경기' })).toBeLessThanOrEqual(BLOCKED);
  });

  it('전국 + 남동구 org → 부산 사용자에게 낮은 점수', () => {
    expect(scoreOf(makePolicy({
      title: '남동형 청년재직자 내일채움공제 플러스',
      sourceOrg: '남동구', region: ['전국'],
    }), { ...baseProfile, region: '부산' })).toBeLessThanOrEqual(BLOCKED);
  });

  it('전국 + 은평구 org → 부산 사용자에게 낮은 점수', () => {
    expect(scoreOf(makePolicy({
      title: '은평구 청년 주거환경 개선 사업',
      sourceOrg: '은평구', region: ['전국'],
    }), { ...baseProfile, region: '부산' })).toBeLessThanOrEqual(BLOCKED);
  });

  it('전국 + 강동구 org → 서울 사용자에게 은평구를 부산 사용자에게보다 높은 점수', () => {
    const p = makePolicy({ title: '강동구 미취업 청년 응시료 지원', sourceOrg: '강동구', region: ['전국'] });
    const seoulScore = scoreOf(p, { ...baseProfile, region: '서울' });
    const busanScore = scoreOf(p, { ...baseProfile, region: '부산' });
    expect(seoulScore).toBeGreaterThan(busanScore);
  });
});

// ─── 5. 연령 필터링 ──────────────────────────────────────────────────────────

describe('연령 필터링', () => {
  it('ageMax=29인 정책 → 30대(35세) 사용자에게 낮은 점수', () => {
    expect(scoreOf(makePolicy({ ageMax: 29 }))).toBeLessThanOrEqual(10);
  });

  it('ageMax=34인 정책 → 30대(35세) 사용자에게 낮은 점수', () => {
    expect(scoreOf(makePolicy({ ageMax: 34 }))).toBeLessThanOrEqual(10);
  });

  it('ageMin=19, ageMax=39인 정책 → 30대에게 정상 점수', () => {
    expect(scoreOf(makePolicy({ ageMin: 19, ageMax: 39 }))).toBeGreaterThan(30);
  });

  it('제목에 노인/어르신 → 30대에게 낮은 점수', () => {
    // ageMin/ageMax 미설정 시 inferAgeRangeFromTitle이 동작
    expect(scoreOf(makePolicy({ title: '노인 돌봄 서비스 지원', ageMin: undefined, ageMax: undefined }))).toBeLessThanOrEqual(10);
  });

  it('제목에 영유아 → 성인에게 낮은 점수', () => {
    expect(scoreOf(makePolicy({ title: '영유아 누리과정 지원', ageMin: undefined, ageMax: undefined }))).toBeLessThanOrEqual(10);
  });
});

// ─── 6. 가구/아동 필터링 ─────────────────────────────────────────────────────

describe('가구 · 아동 필터링', () => {
  it('childcare 카테고리 → 자녀 없는 사용자에게 낮은 점수', () => {
    const p = makePolicy({ category: 'childcare', occupationTarget: [] });
    expect(scoreOf(p, { ...baseProfile, householdType: 'single' })).toBeLessThanOrEqual(10);
  });

  it('childcare 카테고리 → 자녀 있는 사용자에게는 더 높은 점수', () => {
    const p = makePolicy({ category: 'childcare', occupationTarget: [] });
    const withKids = scoreOf(p, { ...baseProfile, householdType: 'family-with-children' });
    const noKids = scoreOf(p, { ...baseProfile, householdType: 'single' });
    expect(withKids).toBeGreaterThan(noKids);
  });

  it('한부모 정책 → 일반 커플에게 낮은 점수', () => {
    const p = makePolicy({
      title: '한부모가족 자녀양육비 지원',
      occupationTarget: [],
      householdCondition: ['single-parent'],
    });
    expect(scoreOf(p, { ...baseProfile, householdType: 'couple' })).toBeLessThanOrEqual(10);
  });

  it('한부모 정책 → 한부모 가구에게는 커플보다 높은 점수', () => {
    const p = makePolicy({
      title: '한부모가족 자녀양육비 지원',
      occupationTarget: [],
      householdCondition: ['single-parent'],
    });
    const single = scoreOf(p, { ...baseProfile, householdType: 'single-parent' });
    const couple = scoreOf(p, { ...baseProfile, householdType: 'couple' });
    expect(single).toBeGreaterThan(couple);
  });

  it('다문화가족 정책 → isMigrantFamily 미설정 사용자에게 낮은 점수', () => {
    expect(scoreOf(makePolicy({ title: '다문화가족 방문교육서비스' }),
      { ...baseProfile, isMigrantFamily: undefined })).toBeLessThanOrEqual(10);
  });

  it('산후조리 정책 → 자녀 없는 사용자에게 낮은 점수', () => {
    expect(scoreOf(makePolicy({ title: '산후조리원 비용 지원사업' }),
      { ...baseProfile, householdType: 'single' })).toBeLessThanOrEqual(10);
  });

  it('출산전후휴가 정책 → 남성에게 낮은 점수', () => {
    expect(scoreOf(makePolicy({ title: '출산전후휴가 급여 지원' }),
      { ...baseProfile, gender: 'male' })).toBeLessThanOrEqual(10);
  });

  it('임산부 지원 정책 → 남성에게 낮은 점수', () => {
    expect(scoreOf(makePolicy({ title: '임신부 건강관리 지원사업' }),
      { ...baseProfile, gender: 'male' })).toBeLessThanOrEqual(10);
  });

  it('산후 지원 정책 → 남성에게 낮은 점수', () => {
    expect(scoreOf(makePolicy({ title: '산후우울증 예방 지원' }),
      { ...baseProfile, gender: 'male' })).toBeLessThanOrEqual(10);
  });

  it('배우자 출산휴가 → 남성에게 정상 점수', () => {
    expect(scoreOf(makePolicy({ title: '배우자 출산휴가 급여' }),
      { ...baseProfile, gender: 'male' })).toBeGreaterThan(10);
  });

  it('title에는 키워드 없고 summary에 임산부 키워드 → 남성에게 낮은 점수', () => {
    expect(scoreOf(makePolicy({
      title: '여성 건강 지원사업',
      summary: '임산부 및 출산전후 여성을 대상으로 건강관리 서비스를 제공합니다',
    }), { ...baseProfile, gender: 'male' })).toBeLessThanOrEqual(10);
  });

  it('title에는 키워드 없고 summary에 산후 키워드 → 남성에게 낮은 점수', () => {
    expect(scoreOf(makePolicy({
      title: '모성보호 프로그램',
      summary: '산후조리 비용 및 산후우울증 예방 서비스를 지원합니다',
    }), { ...baseProfile, gender: 'male' })).toBeLessThanOrEqual(10);
  });
});

// ─── 7. 소득 조건 ────────────────────────────────────────────────────────────

describe('소득 조건 필터링', () => {
  it('incomeCondition low → 고소득 사용자에게 낮은 점수', () => {
    const p = makePolicy({ incomeCondition: ['low'] });
    expect(scoreOf(p, { ...baseProfile, incomeLevel: 'high' })).toBeLessThan(50);
  });

  it('incomeCondition low → 저소득 사용자가 고소득보다 높은 점수', () => {
    const p = makePolicy({ incomeCondition: ['low'] });
    const low = scoreOf(p, { ...baseProfile, incomeLevel: 'low' });
    const high = scoreOf(p, { ...baseProfile, incomeLevel: 'high' });
    expect(low).toBeGreaterThan(high);
  });
});

// ─── 8. 직업 조건 ────────────────────────────────────────────────────────────

describe('직업 조건 필터링', () => {
  it('occupationTarget unemployed → 재직자보다 실업자에게 높은 점수', () => {
    const p = makePolicy({ occupationTarget: ['unemployed'] });
    const employed = scoreOf(p, { ...baseProfile, occupation: 'employed' });
    const unemployed = scoreOf(p, { ...baseProfile, occupation: 'unemployed' });
    expect(unemployed).toBeGreaterThan(employed);
  });

  it('국민내일배움카드 → occupationTarget unemployed여도 재직자에게 차단 안 됨 (UNIVERSAL_EMPLOYMENT)', () => {
    const p = makePolicy({ title: '국민내일배움카드', occupationTarget: ['unemployed'] });
    expect(scoreOf(p, { ...baseProfile, occupation: 'employed' })).toBeGreaterThan(20);
  });
});

// ─── 9. 인기 정책 부스트 ─────────────────────────────────────────────────────

describe('인기 정책 부스트', () => {
  it('청년도약계좌 → 일반 청년 정책보다 높은 점수', () => {
    const popular = makePolicy({ title: '청년도약계좌' });
    const normal = makePolicy({ id: 'normal', title: '청년 취업 지원사업' });
    const profile20 = { ...baseProfile, ageGroup: '20s' as const };
    expect(scoreOf(popular, profile20)).toBeGreaterThan(scoreOf(normal, profile20));
  });

  it('두루누리 사회보험 → 일반 재직자 정책보다 높은 점수', () => {
    const popular = makePolicy({ title: '두루누리 사회보험' });
    const normal = makePolicy({ id: 'normal', title: '청년 취업 지원사업' });
    const profileEmp = { ...baseProfile, occupation: 'employed' as const };
    expect(scoreOf(popular, profileEmp)).toBeGreaterThan(scoreOf(normal, profileEmp));
  });

  it('국가장학금 → 일반 교육 정책보다 20대에게 높은 점수', () => {
    const popular = makePolicy({ title: '국가장학금', category: 'education' });
    const normal = makePolicy({ id: 'normal', title: '일반 학습 지원', category: 'education' });
    const profile20 = { ...baseProfile, ageGroup: '20s' as const };
    expect(scoreOf(popular, profile20)).toBeGreaterThan(scoreOf(normal, profile20));
  });
});

// ─── 10. 청년 1인가구 주거 부스트 ───────────────────────────────────────────

describe('청년 1인가구 주거 부스트', () => {
  it('housing 카테고리 → 청년 1인가구가 커플보다 높은 점수', () => {
    const p = makePolicy({ category: 'housing', householdCondition: [] });
    const singleYouth = { ...baseProfile, ageGroup: '20s' as const, householdType: 'single' as const };
    const couple = { ...baseProfile, ageGroup: '20s' as const, householdType: 'couple' as const };
    expect(scoreOf(p, singleYouth)).toBeGreaterThan(scoreOf(p, couple));
  });
});

// ─── 11. 저소득층 현금 지원 우선 ─────────────────────────────────────────────

describe('저소득층 현금 지원 우선', () => {
  it('cash 혜택 → 저소득층이 고소득층보다 높은 점수', () => {
    const p = makePolicy({ benefitType: 'cash', incomeCondition: ['low', 'middle-low'] });
    const low = scoreOf(p, { ...baseProfile, incomeLevel: 'low' });
    const high = scoreOf(p, { ...baseProfile, incomeLevel: 'high' });
    expect(low).toBeGreaterThan(high);
  });

  it('loan 혜택 → 저소득층에게 cash 혜택보다 낮은 점수 (부채 부담)', () => {
    const cash = makePolicy({ benefitType: 'cash', incomeCondition: ['low', 'middle-low'] });
    const loan = makePolicy({ id: 'loan', benefitType: 'loan', incomeCondition: ['low', 'middle-low'] });
    const lowProfile = { ...baseProfile, incomeLevel: 'low' as const };
    expect(scoreOf(cash, lowProfile)).toBeGreaterThan(scoreOf(loan, lowProfile));
  });
});

// ─── 12. getDaysUntilDeadline ─────────────────────────────────────────────────

describe('getDaysUntilDeadline', () => {
  it('isAlwaysOpen → null 반환', () => {
    expect(getDaysUntilDeadline(makePolicy({ isAlwaysOpen: true }))).toBeNull();
  });

  it('applicationEnd 없음 → null 반환', () => {
    expect(getDaysUntilDeadline(makePolicy({ isAlwaysOpen: false }))).toBeNull();
  });

  it('applicationEnd가 10일 후 → 양수 반환', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const days = getDaysUntilDeadline(makePolicy({
      isAlwaysOpen: false,
      applicationEnd: future.toISOString().split('T')[0],
    }));
    expect(days).not.toBeNull();
    expect(days!).toBeGreaterThan(0);
    expect(days!).toBeLessThanOrEqual(11);
  });

  it('applicationEnd가 과거 → 음수 반환', () => {
    const days = getDaysUntilDeadline(makePolicy({
      isAlwaysOpen: false,
      applicationEnd: '2020-01-01',
    }));
    expect(days).not.toBeNull();
    expect(days!).toBeLessThan(0);
  });
});

// ─── 13. 소상공인 전용(BIZ_ONLY) 블록 ───────────────────────────────────────

describe('소상공인 전용 정책', () => {
  it('소상공인 지원 → 자영업자가 직장인보다 높은 점수', () => {
    const p = makePolicy({ title: '소상공인 정책자금 지원', occupationTarget: ['self-employed'] });
    const selfEmployed = scoreOf(p, { ...baseProfile, occupation: 'self-employed' });
    const employed = scoreOf(p, { ...baseProfile, occupation: 'employed' });
    expect(selfEmployed).toBeGreaterThan(employed);
  });

  it('소상공인 지원 → 직장인에게 낮은 점수', () => {
    expect(scoreOf(makePolicy({ title: '소상공인 정책자금 지원' }),
      { ...baseProfile, occupation: 'employed' })).toBeLessThan(20);
  });
});

// ─── 14. 실제 정책 데이터 통합 테스트 ─────────────────────────────────────────

describe('실제 정책 데이터 통합', () => {
  let policies: Policy[] = [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data = require('../../src/data/policies.generated.json');
    policies = Array.isArray(data) ? data : (data.policies ?? []);
  } catch {
    // 파일 없으면 스킵
  }

  it('서울 30대 직장인 — 제주 지역 정책이 상위 20위 안에 없어야 한다', () => {
    if (policies.length === 0) return;
    const profile: UserProfile = {
      ageGroup: '30s', gender: 'female', region: '서울', district: '종로구',
      occupation: 'employed', incomeLevel: 'middle', householdType: 'single',
    };
    const results = getRecommendations(policies, profile).slice(0, 20);
    const jeju = results.filter(r =>
      /제주/.test(r.policy.title + ' ' + (r.policy.sourceOrg ?? '')) &&
      !r.policy.region.includes('서울')
    );
    expect(jeju.map(r => r.policy.title)).toEqual([]);
  });

  it('서울 사용자 — 부산진구 정책이 상위 30위 안에 없어야 한다', () => {
    if (policies.length === 0) return;
    const profile: UserProfile = {
      ageGroup: '20s', gender: 'female', region: '서울',
      occupation: 'student', incomeLevel: 'low', householdType: 'with-parents',
    };
    const results = getRecommendations(policies, profile).slice(0, 30);
    const busanjin = results.filter(r =>
      /부산진구/.test(r.policy.title + ' ' + (r.policy.sourceOrg ?? ''))
    );
    expect(busanjin.map(r => r.policy.title)).toEqual([]);
  });

  it('경기 30대 직장인 — 남동형 정책이 상위 30위 안에 없어야 한다', () => {
    if (policies.length === 0) return;
    const profile: UserProfile = {
      ageGroup: '30s', gender: 'male', region: '경기',
      occupation: 'employed', incomeLevel: 'middle', householdType: 'single',
    };
    const results = getRecommendations(policies, profile).slice(0, 30);
    const namdong = results.filter(r =>
      /남동형|남동구/.test(r.policy.title + ' ' + (r.policy.sourceOrg ?? ''))
    );
    expect(namdong.map(r => r.policy.title)).toEqual([]);
  });

  it('폐광 정책이 일반 프로필 상위 50위 안에 없어야 한다', () => {
    if (policies.length === 0) return;
    const profiles: UserProfile[] = [
      { ageGroup: '30s', region: '서울', occupation: 'employed', incomeLevel: 'middle', householdType: 'single' },
      { ageGroup: '40s', region: '경기', occupation: 'self-employed', incomeLevel: 'middle-low', householdType: 'family-with-children' },
      { ageGroup: '20s', region: '부산', occupation: 'student', incomeLevel: 'low', householdType: 'with-parents' },
    ];
    for (const profile of profiles) {
      const mining = getRecommendations(policies, profile)
        .slice(0, 50)
        .filter(r => /폐광|탄광|광업.*종사/.test(r.policy.title));
      expect(mining.map(r => r.policy.title)).toEqual([]);
    }
  });

  it('유휴간호사 정책이 일반 직장인 프로필 상위 50위 안에 없어야 한다', () => {
    if (policies.length === 0) return;
    const profile: UserProfile = {
      ageGroup: '50s', gender: 'female', region: '서울', district: '광진구',
      occupation: 'employed', incomeLevel: 'middle-low', householdType: 'family-with-children',
    };
    const nurse = getRecommendations(policies, profile)
      .slice(0, 50)
      .filter(r => /유휴간호사/.test(r.policy.title));
    expect(nurse.map(r => r.policy.title)).toEqual([]);
  });

  it('청년도약계좌가 저소득 20대 학생 결과에 포함되고 상위 30위 안에 있어야 한다', () => {
    if (policies.length === 0) return;
    // 청년도약계좌 incomeCondition=['low','middle-low'] → 저소득 프로필 사용
    const profile: UserProfile = {
      ageGroup: '20s', region: '서울',
      occupation: 'student', incomeLevel: 'low', householdType: 'single',
    };
    const results = getRecommendations(policies, profile).slice(0, 30);
    const found = results.some(r => /청년도약계좌/.test(r.policy.title));
    expect(found).toBe(true);
  });
});
