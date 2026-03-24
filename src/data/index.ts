/**
 * Policy data entry point.
 *
 * The large generated dataset (public/data/policies.json) is NOT imported here
 * to avoid bundling ~9 MB of JSON into the JS chunks.
 * It is fetched at runtime via policyCache.ts → fetch('/data/policies.json').
 *
 * This file exports only the hand-curated fallback policies (< 30 entries)
 * used when the network fetch fails or on first load before the fetch completes.
 */

import type { Policy } from '@/types';
import generated from './policies.generated.json';
import { policies as curatedPolicies } from './policies';

// Re-export curated policies so policyCache.ts can reference them.
export { curatedPolicies };

// Metadata from the stub generated file (populated by fetchPolicies.mjs).
export const dataSource: 'api' | 'mock' =
  generated.source === 'bokjiro-api' ? 'api' : 'mock';

export const dataFetchedAt: Date | null =
  generated.fetchedAt ? new Date(generated.fetchedAt) : null;

// Kept for backward compatibility — callers that used activePolicies
// now get curated only; full data comes from loadPolicies() in policyCache.ts.
export const activePolicies: Policy[] = curatedPolicies as Policy[];
