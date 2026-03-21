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
// These patterns identify policies for extremely narrow populations.
// Return 0.03–0.06 to push irrelevant results to the absolute bottom.

const VETERAN         = /국가유공자|보훈|참전유공자|전몰군경|순직(?:군인|경찰|소방)|6\.25|육이오|호국|고엽제|특수임무유공자|의사상자(?:자녀|가족)/;
const MILITARY        = /현역\s*(?:군인|병사|장병|복무)|군무원|병역의무\s*이행|군복무\s*중|방위병|사관생도|부사관|장교\s*(?:복무|임관)|육해공군\s*(?:복무|지원)/;
const MARITIME_WORKER = /원양어선|어업인|어민|귀어\s*귀촌|어촌\s*정착|수산업\s*종사|해기사|어선\s*원|수산물\s*생산|연근해/;
const AGRICULTURE     = /농업인|농민|농가\s*(?:지원|소득|경영)|영농\s*후계|귀농\s*(?:지원|정착)|농지\s*임대|농업경영체/;
const FOREIGN_NATIONAL = /외국인\s*(?:등록|근로자|유학생)|귀화\s*(?:외국인|자)|이주\s*(?:여성|민|노동자)|결혼이민자(?!\s*가족)/;
const MARITIME_SAFETY  = /해양사고|선원\s*(?:재해|복지|보험)|어선\s*보험|해양\s*안전\s*기금/;
const EMPLOYER_FACING  = /채용지원|고경력.*채용|신진연구인력|기술인력|연구인력|산업전문인력|고용보조금|인력\s*채용\s*지원|근로자\s*채용/;
const SPECIALIST       = /박사급\s*(?:연구|채용)|연구원\s*채용|전문연구요원|특수목적\s*대학원|유휴\s*(?:간호사|의사|약사|의료인)|면허\s*재취업|의료인\s*재취업/;

// ─── Child policy patterns ────────────────────────────────────────────────────
const CHILD_SPECIFIC = /다문화.*자녀|자녀.*다문화|소년소녀\s*가(?:정|장)|방과\s*후\s*아동|아동\s*수당|영아\s*수당|입양\s*아동|영유아\s*돌봄|육아\s*휴직\s*급여|출산\s*(?:장려금|축하금|바우처)|산모.*신생아|임산부\s*(?:지원|건강)|다자녀\s*가(?:구|정)|자녀\s*장려금|자녀\s*(?:수당|보조금)|양육\s*지원\s*금/;
const COUPLE_INCOME   = /부부합산|세대합산|배우자\s*소득|공동명의\s*(?:자산|재산)|맞벌이\s*(?:지원|우대)/;
const BIZ_ONLY        = /소상공인|전통시장.*(?:지원|개선|사업)|재래시장.*지원|사업자\s*(?:지원|등록)\s*(?:보조|혜택)|법인세\s*감면|사업\s*운영\s*지원/;

// Vocational high school workforce programs — not for general college students (age > 22)
const VOCATIONAL_SCHOOL = /특성화고\s*인력양성|직업계고.*인력|중소기업\s*인식개선\s*교육/;

// ─── Title-based implicit age inference ───────────────────────────────────────
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

// ─── Normalize incomeCondition to always be string[] ─────────────────────────
// API occasionally returns a string ('low') instead of array (['low']).
function normalizeArray(val: string | string[] | undefined): string[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) return val.length > 0 ? val : undefined;
  return [val]; // wrap bare string
}

// ─── [1] Eligibility Score (0~1, weight 0.5) ─────────────────────────────────
//
// Key rules:
// A) Hard blocks for specialty populations → 0.03–0.06
// B) Structured condition mismatch → low multiplier (stays low, no floor override)
// C) No conditions + high relevanceScore → floor ensures universal policies aren't buried
// D) Condition match + any relevanceScore → no relevanceScore penalty (policy IS relevant to this user)

function eligibilityScore(policy: Policy, profile: UserProfile, age: number): number {
  const t = policy.title;
  const desc = (policy.description || policy.summary || '').slice(0, 500);
  const full = `${t} ${desc}`;

  const hasChildren = profile.householdType === 'family-with-children' || profile.householdType === 'single-parent';
  const isSingle    = profile.householdType === 'single';

  // ── [A] Specialty hard blocks ─────────────────────────────────────────────

  if (policy.targetSpecialty) {
    const s = policy.targetSpecialty;
    if (s.includes('veteran') || s.includes('military') || s.includes('maritime') ||
        s.includes('agriculture') || s.includes('foreign-national') || s.includes('religion')) return 0.04;
    if (s.includes('disability-severe')) return 0.05;
  }

  if (VETERAN.test(full))          return 0.04;
  if (MILITARY.test(full))         return 0.04;
  if (MARITIME_WORKER.test(full))  return 0.04;
  if (AGRICULTURE.test(full))      return 0.04;
  if (MARITIME_SAFETY.test(full))  return 0.05;
  if (FOREIGN_NATIONAL.test(full)) return 0.04;
  if (/한센인|나병/.test(full))    return 0.03;

  if (EMPLOYER_FACING.test(t) || SPECIALIST.test(t)) {
    if (profile.occupation !== 'self-employed' && profile.occupation !== 'employed') return 0.07;
    return 0.18; // employer applies, not the individual
  }

  // Vocational school programs are not for general adult students (college+)
  if (VOCATIONAL_SCHOOL.test(t) && age > 22) return 0.05;

  // ── [B] Region ────────────────────────────────────────────────────────────
  if (!policy.region.includes('전국') && !policy.region.includes(profile.region)) return 0.05;

  // ── [C] Child / family blocks ─────────────────────────────────────────────
  if (policy.category === 'childcare' && !hasChildren) return 0.05;
  if (CHILD_SPECIFIC.test(full) && !hasChildren)       return 0.05;
  if (COUPLE_INCOME.test(full) && isSingle)            return 0.06;
  if (BIZ_ONLY.test(full) && profile.occupation !== 'self-employed') return 0.07;

  // relevanceScore < 0.30: Claude judged this as niche / not for general population
  if (policy.relevanceScore !== undefined && policy.relevanceScore < 0.30) return 0.05;

  // ── [D] Structured condition scoring ─────────────────────────────────────
  const incomeCondition  = normalizeArray(policy.incomeCondition as string | string[] | undefined);
  const occupationTarget = normalizeArray(policy.occupationTarget);
  const householdCond    = normalizeArray(policy.householdCondition);

  let score = 1.0;

  // ── Age ──────────────────────────────────────────────────────────────────
  if (policy.ageMin !== undefined || policy.ageMax !== undefined) {
    const min = policy.ageMin ?? 0;
    const max = policy.ageMax ?? 999;
    if (age < min || age > max) return 0.05;
    // confirmed match — no multiplier needed
  } else {
    const inferred = inferAgeRangeFromTitle(t);
    if (inferred.min !== undefined && age < inferred.min) return 0.05;
    if (inferred.max !== undefined && age > inferred.max) return 0.05;
    if (inferred.min !== undefined || inferred.max !== undefined) {
      score *= 0.88; // inferred match — fairly confident
    } else {
      score *= 0.65; // unknown age condition — uncertain
    }
  }

  // ── Occupation ────────────────────────────────────────────────────────────
  const occMatch = occupationTarget?.includes(profile.occupation) ?? false;
  const occFreelancerProxy = occupationTarget?.includes('unemployed') && profile.occupation === 'freelancer';

  if (occupationTarget && occupationTarget.length > 0) {
    if (occMatch) {
      score *= 1.0;
    } else if (occFreelancerProxy) {
      score *= 0.65;
    } else {
      score *= 0.10;
    }
  } else {
    // no occupation condition — general policy
    const isEmploymentCat = policy.category === 'employment';
    if (isEmploymentCat && profile.occupation === 'unemployed') {
      score *= 0.82; // employment category likely relevant to job-seekers
    } else {
      score *= 0.72;
    }
  }

  // ── Income ────────────────────────────────────────────────────────────────
  const incomeMatch = incomeCondition?.includes(profile.incomeLevel) ?? false;
  if (incomeCondition && incomeCondition.length > 0) {
    if (incomeMatch) {
      score *= 1.0;
    } else {
      score *= 0.10; // income mismatch is a hard fail
    }
  } else {
    score *= 0.82; // unknown — modest penalty
  }

  // ── Household ─────────────────────────────────────────────────────────────
  const householdMatch = householdCond?.includes(profile.householdType) ?? false;
  if (householdCond && householdCond.length > 0) {
    if (householdMatch) {
      score *= 1.0;
    } else {
      score *= 0.28;
    }
  } else {
    score *= 0.90;
  }

  // ── Gender ────────────────────────────────────────────────────────────────
  if (profile.gender && profile.gender !== 'other') {
    const FEMALE_ONLY = /여성\s*(?:전용|만\s*대상|창업|일자리)|임산부|산모|모성\s*보호|경력단절\s*여성|여성\s*폭력\s*피해|성폭력\s*피해|여성\s*농업인/;
    const MALE_ONLY   = /병역\s*지원|현역\s*장병|군\s*장병|남성\s*(?:전용|한정)/;
    if (policy.genderCondition && policy.genderCondition.length > 0) {
      score *= policy.genderCondition.includes(profile.gender) ? 1.0 : 0.05;
    } else {
      if (FEMALE_ONLY.test(t) && profile.gender !== 'female') score *= 0.07;
      if (MALE_ONLY.test(t)   && profile.gender !== 'male')   score *= 0.07;
    }
  }

  // ── relevanceScore adjustment ─────────────────────────────────────────────
  //
  // CRITICAL RULES:
  // 1. If user's profile MATCHES any structured condition → relevanceScore penalty is skipped.
  //    (The policy IS relevant to this specific user even if not to the general population.)
  // 2. If policy has NO structured conditions → relevanceScore floor ensures broad universal
  //    policies aren't buried below the eligibility gate.
  // 3. If policy HAS conditions but NONE match → no floor, low score is correct.

  // 'employed' / 'unemployed' alone are too broad to count as "strong match"
  // (applies to 50%+ of population). Specific occupations (student, self-employed,
  // freelancer) or additional income/household matches make it a real confirmation.
  const isGenericOccupationOnly =
    occMatch &&
    (occupationTarget?.length ?? 0) === 1 &&
    (occupationTarget![0] === 'employed' || occupationTarget![0] === 'unemployed') &&
    !incomeMatch && !householdMatch;

  const hasStrongMatch = (occMatch && !isGenericOccupationOnly) || incomeMatch || householdMatch;
  const hasAnyCondition = (
    policy.ageMin !== undefined || policy.ageMax !== undefined ||
    (occupationTarget?.length ?? 0) > 0 ||
    (incomeCondition?.length ?? 0) > 0 ||
    (householdCond?.length ?? 0) > 0
  );

  if (policy.relevanceScore !== undefined) {
    if (!hasStrongMatch) {
      // No strong condition match → penalize niche policies for this user
      if (policy.relevanceScore < 0.40) score *= 0.40;
      else if (policy.relevanceScore < 0.60) score *= 0.78;
    }
    // When hasStrongMatch = true → no relevanceScore penalty.
    // The early return at relevanceScore < 0.30 already filters out truly niche policies.
    // If a policy has a genuine condition match (occupation/income/household), we trust it.

    // Floor: ONLY for policies with absolutely no structured conditions
    // (truly universal policies must not be buried by stacked uncertainty multipliers)
    if (!hasAnyCondition) {
      if (policy.relevanceScore >= 0.80) score = Math.max(score, 0.44);
      else if (policy.relevanceScore >= 0.65) score = Math.max(score, 0.38);
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
  const incomeCondition = normalizeArray(policy.incomeCondition as string | string[] | undefined);

  if (e < 0.15) {
    reasons.push('자격 조건 미충족 가능성 높음');
    return reasons;
  }

  if (policy.region.includes(profile.region)) reasons.push('거주 지역 일치');
  if ((policy.ageMin !== undefined || policy.ageMax !== undefined) && e > 0.5)
    reasons.push('연령 조건 부합');
  if (policy.occupationTarget?.includes(profile.occupation)) reasons.push('직업 조건 일치');
  if (incomeCondition?.includes(profile.incomeLevel))        reasons.push('소득 조건 해당');
  if (policy.householdCondition?.includes(profile.householdType)) reasons.push('가구 유형 일치');
  if (p >= 0.7) reasons.push(policy.isAlwaysOpen ? '상시 신청 가능' : '지금 신청 가능');
  if (b >= 0.6 && policy.benefitAmount) reasons.push(`최대 ${policy.benefitAmount.toLocaleString()}만원`);

  return reasons.slice(0, 3);
}

// ─── Public API ───────────────────────────────────────────────────────────────
//
// Final Score = Eligibility×0.5 + Practicality×0.3 + Benefit×0.2
//
// For low-income users: cash/housing policies get a direct-benefit bonus
// so that "당장 받을 수 있는 금전적 지원" rises to the top.
//
// Eligibility hard gate: < 0.35 → score aggressively capped.

export function getRecommendations(
  policies: Policy[],
  profile: UserProfile,
): RecommendationResult[] {
  const age = getAgeFromGroup(profile.ageGroup);
  const isLowIncome = profile.incomeLevel === 'low' || profile.incomeLevel === 'middle-low';

  return policies
    .map((policy): RecommendationResult => {
      const e = eligibilityScore(policy, profile, age);
      const p = practicalityScore(policy);
      const b = benefitScore(policy);

      let finalRaw: number;
      if (e < 0.35) {
        finalRaw = e * 0.5 * 0.25 + b * 0.2 * 0.12 + p * 0.3 * 0.12;
      } else {
        finalRaw = e * 0.5 + p * 0.3 + b * 0.2;
      }

      // ── 직접 현금/주거 지원 우선 (저소득층) ────────────────────────────────
      // 저소득층에게 당장 받을 수 있는 현금/바우처/주거 지원 최우선
      if (isLowIncome && e >= 0.40) {
        if (policy.benefitType === 'cash' || policy.benefitType === 'voucher') {
          finalRaw *= 1.18;
        }
        if (policy.category === 'housing') {
          finalRaw *= 1.12;
        }
        // Deprioritize loans for low-income users — debt burden is a real risk
        if (policy.benefitType === 'loan') {
          finalRaw *= 0.78;
        }
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
