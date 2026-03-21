import { Policy, UserProfile, RecommendationResult } from '@/types';

// ─── Age mapping ─────────────────────────────────────────────────────────────

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

// ─── [1] Eligibility Score (0~1, weight 0.5) ─────────────────────────────────
//
// Rules:
// - Region mismatch → near-zero (user will not qualify)
// - Age outside range → near-zero
// - Occupation/income/household mismatches → heavy multiplicative penalties
// - No explicit condition → conservative neutral (not full score)

function eligibilityScore(policy: Policy, profile: UserProfile, age: number): number {
  // Region — hardest constraint
  if (!policy.region.includes('전국') && !policy.region.includes(profile.region)) {
    return 0.05; // wrong region → almost certain disqualification
  }

  let score = 1.0;

  // Age — if specified, binary
  if (policy.ageMin !== undefined || policy.ageMax !== undefined) {
    const min = policy.ageMin ?? 0;
    const max = policy.ageMax ?? 999;
    if (age < min || age > max) return 0.05; // age mismatch → disqualified
    // confirmed age match — keep full score on this dimension
  } else {
    score *= 0.75; // no age condition → conservative (policy might have unlisted age limit)
  }

  // Occupation — if explicitly listed, strong constraint
  if (policy.occupationTarget && policy.occupationTarget.length > 0) {
    if (policy.occupationTarget.includes(profile.occupation)) {
      score *= 1.0; // confirmed match
    } else {
      score *= 0.15; // target occupation doesn't match → heavy penalty
    }
  } else {
    score *= 0.88; // no occupation condition → slightly uncertain
  }

  // Income — if explicitly listed
  if (policy.incomeCondition && policy.incomeCondition.length > 0) {
    if (policy.incomeCondition.includes(profile.incomeLevel)) {
      score *= 1.0;
    } else {
      score *= 0.2; // income doesn't qualify → heavy penalty
    }
  } else {
    score *= 0.9;
  }

  // Household — if explicitly listed
  if (policy.householdCondition && policy.householdCondition.length > 0) {
    if (policy.householdCondition.includes(profile.householdType)) {
      score *= 1.0;
    } else {
      score *= 0.4;
    }
  } else {
    score *= 0.95;
  }

  return clamp(score);
}

// ─── [2] Benefit Score (0~1, weight 0.3) ─────────────────────────────────────
//
// Higher for large, immediate, tangible financial gains.

const BENEFIT_TYPE_WEIGHT: Record<Policy['benefitType'], number> = {
  cash:            1.0,
  voucher:         0.85,
  'tax-reduction': 0.65,
  loan:            0.45,
  service:         0.35,
};

const MAX_USEFUL_AMOUNT = 5000; // 만원 — normalize against this ceiling

function benefitScore(policy: Policy): number {
  const typeWeight = BENEFIT_TYPE_WEIGHT[policy.benefitType] ?? 0.5;

  const amountScore = policy.benefitAmount
    ? clamp(policy.benefitAmount / MAX_USEFUL_AMOUNT)
    : 0.25; // no amount listed → assume moderate/unknown benefit

  // Weighted: 70% amount magnitude, 30% immediacy of benefit type
  return clamp(amountScore * 0.7 + typeWeight * 0.3);
}

// ─── [3] Practicality Score (0~1, weight 0.2) ────────────────────────────────
//
// How easy it is to apply and receive.

function practicalityScore(policy: Policy): number {
  let score = 0.5;

  // Application period
  if (policy.isAlwaysOpen) {
    score += 0.3; // can apply anytime
  } else if (isActive(policy)) {
    score += 0.15; // currently open
  } else {
    score -= 0.3; // expired or not yet open
  }

  // Simpler benefit types tend to have simpler application flows
  const typeBonus: Record<Policy['benefitType'], number> = {
    cash:            0.15,
    voucher:         0.1,
    'tax-reduction': 0.05,
    loan:            -0.05,
    service:         0.05,
  };
  score += typeBonus[policy.benefitType] ?? 0;

  return clamp(score);
}

// ─── Reason builder ───────────────────────────────────────────────────────────

function buildReasons(
  policy: Policy,
  profile: UserProfile,
  age: number,
  e: number,
  b: number,
  p: number,
): string[] {
  const reasons: string[] = [];

  if (e >= 0.7) {
    if (policy.region.includes(profile.region)) reasons.push('거주 지역이 일치해요');
    if (policy.ageMin !== undefined || policy.ageMax !== undefined) reasons.push('연령 조건에 부합해요');
    if (policy.occupationTarget?.includes(profile.occupation)) reasons.push('직업 조건과 잘 맞아요');
    if (policy.incomeCondition?.includes(profile.incomeLevel)) reasons.push('소득 조건에 해당해요');
    if (policy.householdCondition?.includes(profile.householdType)) reasons.push('가구 유형이 맞아요');
  } else if (e < 0.15) {
    reasons.push('자격 조건 미충족 가능성 높음');
  }

  if (b >= 0.6 && policy.benefitAmount) reasons.push(`최대 ${policy.benefitAmount.toLocaleString()}만원 지원`);
  if (p >= 0.7) reasons.push(policy.isAlwaysOpen ? '상시 접수 가능' : '현재 신청 가능');

  return reasons.slice(0, 3);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getRecommendations(
  policies: Policy[],
  profile: UserProfile,
): RecommendationResult[] {
  const age = getAgeFromGroup(profile.ageGroup);

  return policies
    .map((policy): RecommendationResult => {
      const e = eligibilityScore(policy, profile, age);
      const b = benefitScore(policy);
      const p = practicalityScore(policy);

      // Eligibility gate: < 0.4 → push to bottom regardless of other scores
      const finalRaw = e < 0.4
        ? e * 0.5 * 0.5 + b * 0.3 * 0.3 + p * 0.2 * 0.3  // heavily discounted
        : e * 0.5 + b * 0.3 + p * 0.2;

      const score = Math.round(clamp(finalRaw) * 100);
      const isFullMatch = e >= 0.65 && score >= 70;

      return {
        policy,
        score,
        matchReasons: buildReasons(policy, profile, age, e, b, p),
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
