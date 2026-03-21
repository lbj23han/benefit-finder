export interface UserProfile {
  ageGroup: '20s' | '30s' | '40s' | '50s' | '60plus';
  region: string; // 서울, 경기, 부산, etc.
  district?: string;
  occupation: 'employed' | 'self-employed' | 'student' | 'unemployed' | 'freelancer';
  incomeLevel: 'low' | 'middle-low' | 'middle' | 'high';
  householdType: 'single' | 'with-parents' | 'couple' | 'family-with-children' | 'single-parent';
}

export interface Policy {
  id: string;
  title: string;
  summary: string;
  description: string;
  category: 'housing' | 'employment' | 'youth' | 'education' | 'childcare' | 'welfare' | 'business';
  region: string[]; // ['전국'] or ['서울', '경기'] etc.
  eligibility: EligibilityRule[];
  ageMin?: number;
  ageMax?: number;
  occupationTarget?: string[];
  incomeCondition?: string[];
  householdCondition?: string[];
  benefitType: 'cash' | 'loan' | 'service' | 'tax-reduction' | 'voucher';
  benefitAmount?: number; // in 만원
  benefitDescription: string;
  applicationStart?: string;
  applicationEnd?: string;
  isAlwaysOpen: boolean;
  sourceOrg: string;
  applyUrl?: string;
  detailUrl?: string;
  /** true = URL manually verified to reach the correct page; false/undefined = pattern-constructed, may be stale */
  urlVerified?: boolean;
  tags: string[];
}

export interface EligibilityRule {
  icon: string;
  label: string;
  description: string;
}

export interface RecommendationResult {
  policy: Policy;
  score: number;
  matchReasons: string[];
  isFullMatch: boolean;
}

export interface FilterState {
  category: string | null;
  activeOnly: boolean;
  keyword: string;
}

export type SortOption = 'recommended' | 'amount' | 'deadline';

export interface BookmarkStorage {
  ids: string[];
}

export type PolicyStatus = 'active' | 'upcoming' | 'closed' | 'always-open' | 'unknown';

export interface PolicyCache {
  data: Policy[];
  fetchedAt: string; // ISO string
  source: 'api' | 'mock';
  version?: string;
}
