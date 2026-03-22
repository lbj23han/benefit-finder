export interface UserProfile {
  ageGroup: '20s' | '30s' | '40s' | '50s' | '60plus';
  gender?: 'male' | 'female' | 'other';
  region: string; // 서울, 경기, 부산, etc.
  district?: string;
  occupation: 'employed' | 'self-employed' | 'student' | 'unemployed' | 'freelancer';
  incomeLevel: 'low' | 'middle-low' | 'middle' | 'high';
  householdType: 'single' | 'with-parents' | 'couple' | 'family-with-children' | 'single-parent';
  // 상세 조건 선택 (선택사항, 미설정 = 해당 없음)
  hasDisability?: 'yes';    // 복지카드 · 장애 등록
  isMigrantFamily?: 'yes';  // 다문화가족 · 결혼이민
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
  genderCondition?: string[]; // ['male'] | ['female'] — omit for gender-neutral
  /** Specialty target group — hard-blocks non-matching profiles */
  targetSpecialty?: string; // 'veteran' | 'military' | 'maritime' | 'hansen' | 'foreign-national' | 'disability-severe' | 'agriculture' | 'religion'
  /** 0–1: how applicable to a general urban Korean adult (from Claude enrichment) */
  relevanceScore?: number;
  /** Short AI-estimated benefit text when API didn't provide a numeric amount */
  estimatedBenefitText?: string;
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
