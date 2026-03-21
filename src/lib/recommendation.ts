import { Policy, UserProfile, RecommendationResult } from '@/types';

function getAgeFromGroup(ageGroup: UserProfile['ageGroup']): number {
  switch (ageGroup) {
    case '20s':    return 25;
    case '30s':    return 35;
    case '40s':    return 45;
    case '50s':    return 55;
    case '60plus': return 65;
  }
}

function isActive(policy: Policy): boolean {
  if (policy.isAlwaysOpen) return true;
  const now = new Date();
  if (policy.applicationStart && new Date(policy.applicationStart) > now) return false;
  if (policy.applicationEnd && new Date(policy.applicationEnd) < now) return false;
  return true;
}

export function getRecommendations(
  policies: Policy[],
  profile: UserProfile
): RecommendationResult[] {
  const age = getAgeFromGroup(profile.ageGroup);

  return policies
    .map((policy): RecommendationResult => {
      let score = 0;
      const matchReasons: string[] = [];

      // Region match +30
      if (policy.region.includes('전국') || policy.region.includes(profile.region)) {
        score += 30;
        matchReasons.push('거주 지역이 일치해요');
      }

      // Age match +25
      const ageMin = policy.ageMin ?? 0;
      const ageMax = policy.ageMax ?? 999;
      if (age >= ageMin && age <= ageMax) {
        score += 25;
        matchReasons.push('연령 조건에 부합해요');
      }

      // Occupation match +20
      if (!policy.occupationTarget || policy.occupationTarget.includes(profile.occupation)) {
        score += 20;
        matchReasons.push('직업 조건과 잘 맞아요');
      }

      // Income match +15
      if (!policy.incomeCondition || policy.incomeCondition.includes(profile.incomeLevel)) {
        score += 15;
        matchReasons.push('소득 조건에 해당해요');
      }

      // Household match +10
      if (!policy.householdCondition || policy.householdCondition.includes(profile.householdType)) {
        score += 10;
        matchReasons.push('가구 유형이 맞아요');
      }

      // Active period +10
      if (isActive(policy)) {
        score += 10;
      }

      const isFullMatch = score >= 70;

      return { policy, score, matchReasons, isFullMatch };
    })
    .sort((a, b) => b.score - a.score);
}

export function getDaysUntilDeadline(policy: Policy): number | null {
  if (!policy.applicationEnd) return null;
  const end = new Date(policy.applicationEnd);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}
