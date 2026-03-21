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

// ─── Employer / specialist policy detector ───────────────────────────────────
//
// Many Gov24 policies target *companies* (채용 보조금, 연구인력 지원)
// or highly specialized roles (연구원, 박사급 등).
// Individual job seekers / general users rarely qualify.

const EMPLOYER_PATTERNS  = /채용지원|고경력.*채용|신진연구인력|기술인력|연구인력|산업전문인력|고용보조금/;
const SPECIALIST_PATTERNS = /박사급|연구원|특수목적|전문인력|기술개발인력/;
const BIZONLY_ORG        = /중소벤처기업부|산업통상|고용노동부.*기업|고용보조/;

function isLikelyEmployerFacing(policy: Policy): boolean {
  return (
    EMPLOYER_PATTERNS.test(policy.title) ||
    SPECIALIST_PATTERNS.test(policy.title) ||
    BIZONLY_ORG.test(policy.sourceOrg ?? '')
  );
}

// ─── [1] Eligibility Score (0~1, weight 0.5) ─────────────────────────────────
//
// Key principle: conservative by default.
// When a policy has NO explicit condition → assign low-trust multipliers
// (the policy *might* have unlisted requirements, and we can't verify).
// Only confirmed matches get high scores.

function eligibilityScore(policy: Policy, profile: UserProfile, age: number): number {

  // Employer-facing policies: individual users almost never qualify
  if (isLikelyEmployerFacing(policy)) {
    if (profile.occupation !== 'self-employed' && profile.occupation !== 'employed') {
      return 0.08;
    }
    // Even employed users are the employee, not the hiring company → low
    return 0.2;
  }

  // Region — hardest constraint
  if (!policy.region.includes('전국') && !policy.region.includes(profile.region)) {
    return 0.05;
  }

  let score = 1.0;

  // Age — binary gate
  if (policy.ageMin !== undefined || policy.ageMax !== undefined) {
    const min = policy.ageMin ?? 0;
    const max = policy.ageMax ?? 999;
    if (age < min || age > max) return 0.05;
    // confirmed age match — good
  } else {
    // No age condition → uncertain (policy may have unlisted age requirements)
    score *= 0.6;
  }

  // Occupation — if listed, strict
  if (policy.occupationTarget && policy.occupationTarget.length > 0) {
    if (policy.occupationTarget.includes(profile.occupation)) {
      score *= 1.0; // confirmed match
    } else {
      score *= 0.12;
    }
  } else {
    score *= 0.72; // no occupation info → conservative
  }

  // Income
  if (policy.incomeCondition && policy.incomeCondition.length > 0) {
    if (policy.incomeCondition.includes(profile.incomeLevel)) {
      score *= 1.0;
    } else {
      score *= 0.15;
    }
  } else {
    score *= 0.82;
  }

  // Household
  if (policy.householdCondition && policy.householdCondition.length > 0) {
    if (policy.householdCondition.includes(profile.householdType)) {
      score *= 1.0;
    } else {
      score *= 0.35;
    }
  } else {
    score *= 0.92;
  }

  return clamp(score);
}

// ─── [2] Practicality Score (0~1, weight 0.3) ────────────────────────────────
//
// How easily can the user actually apply and receive the benefit.
// Weighted more than raw benefit amount — "신청하기 쉬운 게 우선".

function practicalityScore(policy: Policy): number {
  let score = 0.45;

  // Application period
  if (policy.isAlwaysOpen) {
    score += 0.35;
  } else if (isActive(policy)) {
    score += 0.2;
  } else {
    score -= 0.3; // expired or not yet open
  }

  // Benefit type: cash/voucher is simpler to receive than loan/tax
  const typeBonus: Record<Policy['benefitType'], number> = {
    cash:            0.18,
    voucher:         0.12,
    'tax-reduction': 0.05,
    loan:            -0.05,
    service:         0.08,
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

  if (policy.region.includes(profile.region)) reasons.push('거주 지역이 일치해요');
  if ((policy.ageMin !== undefined || policy.ageMax !== undefined) && e > 0.5)
    reasons.push('연령 조건에 부합해요');
  if (policy.occupationTarget?.includes(profile.occupation)) reasons.push('직업 조건과 잘 맞아요');
  if (policy.incomeCondition?.includes(profile.incomeLevel)) reasons.push('소득 조건에 해당해요');
  if (policy.householdCondition?.includes(profile.householdType)) reasons.push('가구 유형이 맞아요');
  if (p >= 0.7) reasons.push(policy.isAlwaysOpen ? '상시 신청 가능' : '지금 신청 가능');
  if (b >= 0.6 && policy.benefitAmount) reasons.push(`최대 ${policy.benefitAmount.toLocaleString()}만원`);

  return reasons.slice(0, 3);
}

// ─── Public API ───────────────────────────────────────────────────────────────
//
// Final Score = Eligibility×0.5 + Practicality×0.3 + Benefit×0.2
//
// Practicality weighted above Benefit:
// "신청하기 쉽고, 금액 클수록" — accessibility first, then amount.
//
// Eligibility gate: < 0.35 → score heavily capped (pushed to bottom).

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
        // Hard gate: ineligible → floor the score
        finalRaw = e * 0.5 * 0.4 + b * 0.3 * 0.2 + p * 0.2 * 0.2;
      } else {
        // Normal: eligibility 50%, practicality 30%, benefit 20%
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
