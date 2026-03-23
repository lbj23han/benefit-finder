/**
 * Policy data entry point.
 *
 * Always merges:
 *   1. policies.generated.json  — auto-updated daily by GitHub Actions (복지로 API)
 *   2. policies.ts              — hand-curated policies (always included)
 *
 * Curated policies use custom IDs that never conflict with API IDs.
 * Title-based dedup prevents the same policy from appearing twice.
 */

import type { Policy } from '@/types';
import generated from './policies.generated.json';
import { policies as curatedPolicies } from './policies';

const generatedPolicies = generated.policies as unknown as Policy[];

// Always include curated policies — deduplicate by exact title match.
function mergePolicies(gen: Policy[], curated: Policy[]): Policy[] {
  if (gen.length === 0) return curated;
  const genTitles = new Set(gen.map((p) => p.title.trim()));
  const uniqueCurated = curated.filter((p) => !genTitles.has(p.title.trim()));
  return [...gen, ...uniqueCurated];
}

export const activePolicies: Policy[] = mergePolicies(generatedPolicies, curatedPolicies);

export const dataSource: 'api' | 'mock' =
  generated.source === 'bokjiro-api' ? 'api' : 'mock';

export const dataFetchedAt: Date | null =
  generated.fetchedAt ? new Date(generated.fetchedAt) : null;
