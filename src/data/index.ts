/**
 * Policy data entry point.
 *
 * Priority:
 *   1. policies.generated.json  — auto-updated daily by GitHub Actions (복지로 API)
 *   2. policies.ts              — hand-curated fallback (always current)
 *
 * The generated file starts empty (count: 0). Once GitHub Actions runs with a
 * valid DATA_GO_KR_KEY, it will be populated and committed, triggering a
 * Vercel redeploy. The app always works even before that happens.
 */

import type { Policy } from '@/types';
import generated from './policies.generated.json';
import { policies as fallbackPolicies } from './policies';

const generatedPolicies = generated.policies as unknown as Policy[];

export const activePolicies: Policy[] =
  generatedPolicies.length > 0 ? generatedPolicies : fallbackPolicies;

export const dataSource: 'api' | 'mock' =
  generated.source === 'bokjiro-api' ? 'api' : 'mock';

export const dataFetchedAt: Date | null =
  generated.fetchedAt ? new Date(generated.fetchedAt) : null;
