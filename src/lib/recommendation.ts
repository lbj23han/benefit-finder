import { Policy, UserProfile, RecommendationResult } from '@/types';

// ─── Age mapping ──────────────────────────────────────────────────────────────

function getAgeFromGroup(ageGroup: UserProfile['ageGroup']): number {
  switch (ageGroup) {
    case '20s':    return 25;
    case '30s':    return 35;
    case '40s':    return 45;
    case '50s':    return 55;
    case '60plus': return 65;
  }
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

function isActive(policy: Policy): boolean {
  if (policy.isAlwaysOpen) return true;
  const now = new Date();
  if (policy.applicationStart && new Date(policy.applicationStart) > now) return false;
  if (policy.applicationEnd   && new Date(policy.applicationEnd)   < now) return false;
  return true;
}

// ─── Hard-block pattern library ──────────────────────────────────────────────
//
// These patterns identify policies that target extremely narrow populations.
// They return very low scores (0.03–0.06) to push irrelevant results to bottom.
// Applied BEFORE any scoring so niche policies never bubble up.

// 국가유공자 / 보훈 / 참전
const VETERAN = /국가유공자|보훈|참전유공자|전몰군경|순직(?:군인|경찰|소방)|6\.25|육이오|호국|고엽제|특수임무유공자|의사상자(?:자녀|가족)/;

// 현역 군인 / 군무원
const MILITARY = /현역\s*(?:군인|병사|장병|복무)|군무원|병역의무\s*이행|군복무\s*중|방위병|사관생도|부사관|장교\s*(?:복무|임관)|육해공군\s*(?:복무|지원)/;

// 원양·어업 종사자 (일반 직종 아님)
const MARITIME_WORKER = /원양어선|어업인|어민|귀어\s*귀촌|어촌\s*정착|수산업\s*종사|해기사|어선\s*원|수산물\s*생산|연근해/;

// 한센인
const HANSEN = /한센인|나병|음성\s*한센/;

// 농업인 / 농민 (귀농은 포함하되 단순 귀촌 지원은 제외 → 별도 체크)
const AGRICULTURE = /농업인|농민|농가\s*(?:지원|소득|경영)|영농\s*후계|귀농\s*(?:지원|정착)|농지\s*임대|농업경영체/;

// 외국인·귀화자 특화
const FOREIGN_NATIONAL = /외국인\s*(?:등록|근로자|유학생)|귀화\s*(?:외국인|자)|이주\s*(?:여성|민|노동자)|결혼이민자(?!\s*가족)/;

// 엄격한 장애 등급 조건 (중증 장애인 한정)
const SEVERE_DISABILITY = /(?:1|2)급\s*장애|중증\s*장애(?:인|자)|최중증\s*장애|지체.*(?:1|2)급|뇌병변.*(?:1|2)급/;

// 고소득자·자산가 대상 (일반 저소득 사용자 해당 없음)
const HIGH_INCOME_ONLY = /고액\s*자산가|고소득\s*창업|벤처\s*투자자|엔젤\s*투자/;

// 고용주·기업 채용 지원 (개인 구직자 아님)
const EMPLOYER_FACING = /채용지원|고경력.*채용|신진연구인력|기술인력|연구인력|산업전문인력|고용보조금|인력\s*채용\s*지원|근로자\s*채용/;
const SPECIALIST_PATTERNS = /박사급\s*(?:연구|채용)|연구원\s*채용|전문연구요원|특수목적\s*대학원/;

// ─── Title-based implicit age detector ───────────────────────────────────────
// When policy has no ageMin/ageMax in structured fields, infer from title.

function inferAgeRangeFromTitle(title: string): { min?: number; max?: number } {
  if (/치매|노인|어르신|경로당|고령자|노년|노령|실버\s*(?:산업|용품)/.test(title)) return { min: 65 };
  if (/틀니|임플란트|의치|보청기|노안|백내장|황반변성/.test(title)) return { min: 60 };
  if (/영유아|누리과정|유아학비|유치원/.test(title)) return { max: 6 };
  if (/방과\s*후\s*아동|아동돌봄|어린이\s*(?!집\s*지원)/.test(title)) return { max: 12 };
  if (/아동\s*수당|영아\s*수당|입양\s*아동/.test(title)) return { max: 18 };
  if (/청소년\s*(?!부모)/.test(title)) return { min: 13, max: 24 };
  if (/중장년|장년층/.test(title)) return { min: 40, max: 64 };
  return {};
}

// ─── [1] Eligibility Score (0~1, weight 0.5) ─────────────────────────────────
//
// Key principle: aggressive gating for niche populations, conservative defaults.
// Hard blocks return 0.03–0.06 to push irrelevant policies to the bottom.

function eligibilityScore(policy: Policy, profile: UserProfile, age: number): number {
  const t = policy.title;
  const desc = (policy.description || policy.summary || '').slice(0, 500);
  const full = `${t} ${desc}`;

  // ── [A] Hard blocks — niche specialty populations ─────────────────────────

  // targetSpecialty from Claude enrichment → immediate block
  if (policy.targetSpecialty) {
    const s = policy.targetSpecialty;
    if (s.includes('veteran') || s.includes('military') || s.includes('maritime') ||
        s.includes('hansen') || s.includes('foreign-national') ||
        s.includes('agriculture') || s.includes('religion')) return 0.04;
    if (s.includes('disability-severe')) return 0.05;
  }

  // Title/desc pattern hard blocks
  if (VETERAN.test(full))          return 0.04;
  if (MILITARY.test(full))         return 0.04;
  if (MARITIME_WORKER.test(full))  return 0.04;
  if (HANSEN.test(full))           return 0.03;
  if (AGRICULTURE.test(full))      return 0.04;
  if (FOREIGN_NATIONAL.test(full)) return 0.04;
  if (SEVERE_DISABILITY.test(full) && !full.includes('장애인 가족')) return 0.05;
  if (HIGH_INCOME_ONLY.test(full)) return 0.04;

  // Employer-facing (companies hiring employees, not individual job-seekers)
  if (EMPLOYER_FACING.test(t) || SPECIALIST_PATTERNS.test(t)) {
    if (profile.occupation !== 'self-employed' && profile.occupation !== 'employed') return 0.07;
    return 0.18; // even employed → it's the employer that applies, not the individual
  }

  // ── [B] Region — hard constraint ─────────────────────────────────────────
  if (!policy.region.includes('전국') && !policy.region.includes(profile.region)) {
    return 0.05;
  }

  // ── [C] Child-specific policies (자녀 없으면 해당 없음) ───────────────────
  const hasChildren = profile.householdType === 'family-with-children' || profile.householdType === 'single-parent';
  const isSingle    = profile.householdType === 'single';
  const isCouple    = profile.householdType === 'couple';

  if (policy.category === 'childcare' && !hasChildren) return 0.05;

  const CHILD_SPECIFIC = /다문화.*자녀|자녀.*다문화|소년소녀\s*가(?:정|장)|방과\s*후\s*아동|아동\s*수당|영아\s*수당|입양\s*아동|영유아\s*돌봄|육아\s*휴직\s*급여|출산\s*(?:장려금|축하금|바우처)|산모.*신생아|임산부\s*(?:지원|건강)|다자녀\s*가(?:구|정)|자녀\s*장려금|자녀\s*(?:수당|보조금)|양육\s*지원\s*금/;
  if (CHILD_SPECIFIC.test(full) && !hasChildren) return 0.05;

  // 부부합산 / 세대합산 소득 조건 → 1인가구는 해당 없음
  const COUPLE_INCOME = /부부합산|세대합산|배우자\s*소득|공동명의\s*(?:자산|재산)|맞벌이\s*(?:지원|우대)/;
  if (COUPLE_INCOME.test(full) && (isSingle || profile.householdType === 'with-parents')) return 0.06;

  // 자영업자 / 사업주 한정
  if (policy.category === 'business') {
    if (profile.occupation !== 'self-employed') return 0.07;
  }
  const BIZ_ONLY = /소상공인\s*(?:지원|경영|자금)|사업자\s*(?:지원|등록)\s*(?:보조|혜택)|법인세\s*감면|사업\s*운영\s*지원/;
  if (BIZ_ONLY.test(full) && profile.occupation !== 'self-employed') return 0.07;

  // 해양 사고·안전 정책 (일반인 무관)
  const MARITIME_SAFETY = /해양사고|선원\s*(?:재해|복지|보험)|어선\s*보험|해양\s*안전\s*기금/;
  if (MARITIME_SAFETY.test(full)) return 0.05;

  // relevanceScore 낮으면 감점 (Claude가 "일반인 비해당"으로 판단)
  if (policy.relevanceScore !== undefined && policy.relevanceScore < 0.25) return 0.05;

  // ── [D] 구조화 필드로 적합성 계산 ────────────────────────────────────────
  let score = 1.0;

  // ── Age ──────────────────────────────────────────────────────────────────
  const structuredAgeMin = policy.ageMin;
  const structuredAgeMax = policy.ageMax;

  if (structuredAgeMin !== undefined || structuredAgeMax !== undefined) {
    const min = structuredAgeMin ?? 0;
    const max = structuredAgeMax ?? 999;
    if (age < min || age > max) return 0.05;
    // confirmed age match
  } else {
    // 구조화 나이 없으면 제목에서 추론
    const inferred = inferAgeRangeFromTitle(t);
    if (inferred.min !== undefined && age < inferred.min) return 0.05;
    if (inferred.max !== undefined && age > inferred.max) return 0.05;
    if (inferred.min !== undefined || inferred.max !== undefined) {
      // inferred match — fairly confident
      score *= 0.85;
    } else {
      // completely unknown age condition — uncertain
      score *= 0.62;
    }
  }

  // ── Occupation ────────────────────────────────────────────────────────────
  if (policy.occupationTarget && policy.occupationTarget.length > 0) {
    if (policy.occupationTarget.includes(profile.occupation)) {
      score *= 1.0;
    } else if (policy.occupationTarget.includes('unemployed') && profile.occupation === 'freelancer') {
      score *= 0.6; // freelancer ≈ unemployed for most policies
    } else {
      score *= 0.10;
    }
  } else {
    // 직업 조건 미기재 → 보수적
    // 취업/일자리 카테고리인데 재직자면 덜 보수적
    const isEmploymentCategory = policy.category === 'employment';
    if (isEmploymentCategory && profile.occupation === 'unemployed') {
      score *= 0.80; // 취업 지원 정책 → 미취업자에게 유리
    } else {
      score *= 0.72;
    }
  }

  // ── Income ────────────────────────────────────────────────────────────────
  if (policy.incomeCondition && policy.incomeCondition.length > 0) {
    if (policy.incomeCondition.includes(profile.incomeLevel)) {
      score *= 1.0;
    } else {
      // 소득 조건 불일치
      // low income policy, high income user → hard fail
      // high income policy, low income user → fail
      score *= 0.12;
    }
  } else {
    score *= 0.82; // 소득 조건 미기재 → 다소 불확실
  }

  // ── Household ─────────────────────────────────────────────────────────────
  if (policy.householdCondition && policy.householdCondition.length > 0) {
    if (policy.householdCondition.includes(profile.householdType)) {
      score *= 1.0;
    } else {
      score *= 0.30;
    }
  } else {
    score *= 0.90;
  }

  // ── Gender ────────────────────────────────────────────────────────────────
  if (profile.gender && profile.gender !== 'other') {
    if (policy.genderCondition && policy.genderCondition.length > 0) {
      score *= policy.genderCondition.includes(profile.gender) ? 1.0 : 0.05;
    } else {
      const FEMALE_ONLY = /여성\s*(?:전용|만\s*대상|창업|일자리)|임산부|산모|모성\s*보호|경력단절\s*여성|여성\s*폭력\s*피해|성폭력\s*피해|여성\s*농업인|여성\s*어업인/;
      const MALE_ONLY   = /병역\s*지원|현역\s*장병|군\s*장병|남성\s*(?:전용|한정)/;
      if (FEMALE_ONLY.test(t) && profile.gender !== 'female') score *= 0.07;
      if (MALE_ONLY.test(t)   && profile.gender !== 'male')   score *= 0.07;
    }
  }

  // ── relevanceScore from Claude ────────────────────────────────────────────
  if (policy.relevanceScore !== undefined) {
    if (policy.relevanceScore < 0.4) {
      score *= 0.4; // niche but not specialty-blocked → still penalize
    } else if (policy.relevanceScore < 0.6) {
      score *= 0.75; // somewhat limited applicability
    }
    // >= 0.6 → no penalty

    // Universal policies (relevanceScore >= 0.75) with no specific conditions
    // should NOT fall below the eligibility gate just because they list no requirements.
    // These are genuinely applicable to broad populations.
    if (policy.relevanceScore >= 0.75) {
      score = Math.max(score, 0.40);
    } else if (policy.relevanceScore >= 0.60) {
      score = Math.max(score, 0.36);
    }
  }

  return clamp(score);
}

// ─── [2] Practicality Score (0~1, weight 0.3) ────────────────────────────────

function practicalityScore(policy: Policy): number {
  let score = 0.42;

  if (policy.isAlwaysOpen) {
    score += 0.35;
  } else if (isActive(policy)) {
    score += 0.20;
  } else {
    score -= 0.30;
  }

  const typeBonus: Record<Policy['benefitType'], number> = {
    cash:            0.20,
    voucher:         0.14,
    service:         0.08,
    'tax-reduction': 0.04,
    loan:            -0.05,
  };
  score += typeBonus[policy.benefitType] ?? 0;

  return clamp(score);
}

// ─── [3] Benefit Score (0~1, weight 0.2) ─────────────────────────────────────

const BENEFIT_TYPE_WEIGHT: Record<Policy['benefitType'], number> = {
  cash:            1.0,
  voucher:         0.85,
  'tax-reduction': 0.65,
  loan:            0.45,
  service:         0.35,
};

const MAX_USEFUL_AMOUNT = 5000; // 만원

function benefitScore(policy: Policy): number {
  const typeWeight = BENEFIT_TYPE_WEIGHT[policy.benefitType] ?? 0.5;
  const amountScore = policy.benefitAmount
    ? clamp(policy.benefitAmount / MAX_USEFUL_AMOUNT)
    : 0.2;
  return clamp(amountScore * 0.7 + typeWeight * 0.3);
}

// ─── Reason builder ───────────────────────────────────────────────────────────

function buildReasons(
  policy: Policy,
  profile: UserProfile,
  e: number,
  b: number,
  p: number,
): string[] {
  const reasons: string[] = [];

  if (e < 0.15) {
    reasons.push('자격 조건 미충족 가능성 높음');
    return reasons;
  }

  if (policy.region.includes(profile.region)) reasons.push('거주 지역 일치');
  if ((policy.ageMin !== undefined || policy.ageMax !== undefined) && e > 0.5)
    reasons.push('연령 조건 부합');
  if (policy.occupationTarget?.includes(profile.occupation)) reasons.push('직업 조건 일치');
  if (policy.incomeCondition?.includes(profile.incomeLevel)) reasons.push('소득 조건 해당');
  if (policy.householdCondition?.includes(profile.householdType)) reasons.push('가구 유형 일치');
  if (p >= 0.7) reasons.push(policy.isAlwaysOpen ? '상시 신청 가능' : '지금 신청 가능');
  if (b >= 0.6 && policy.benefitAmount) reasons.push(`최대 ${policy.benefitAmount.toLocaleString()}만원`);

  return reasons.slice(0, 3);
}

// ─── Public API ───────────────────────────────────────────────────────────────
//
// Final Score = Eligibility×0.5 + Practicality×0.3 + Benefit×0.2
//
// Eligibility hard gate: < 0.35 → score aggressively capped.

export function getRecommendations(
  policies: Policy[],
  profile: UserProfile,
): RecommendationResult[] {
  const age = getAgeFromGroup(profile.ageGroup);

  return policies
    .map((policy): RecommendationResult => {
      const e = eligibilityScore(policy, profile, age);
      const p = practicalityScore(policy);
      const b = benefitScore(policy);

      let finalRaw: number;
      if (e < 0.35) {
        // Hard gate: ineligible → floor the score dramatically
        finalRaw = e * 0.5 * 0.3 + b * 0.2 * 0.15 + p * 0.3 * 0.15;
      } else {
        finalRaw = e * 0.5 + p * 0.3 + b * 0.2;
      }

      const score = Math.round(clamp(finalRaw) * 100);
      const isFullMatch = e >= 0.6 && score >= 65;

      return {
        policy,
        score,
        matchReasons: buildReasons(policy, profile, e, b, p),
        isFullMatch,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function getDaysUntilDeadline(policy: Policy): number | null {
  if (!policy.applicationEnd) return null;
  const end = new Date(policy.applicationEnd);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
