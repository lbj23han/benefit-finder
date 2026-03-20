/**
 * Policy data freshness layer.
 *
 * Data flow:
 *   Build time: src/data/index.ts resolves activePolicies
 *               (generated JSON if available, fallback mock otherwise)
 *   Runtime:    usePolicies() hook returns activePolicies + metadata
 *               No browser-side API calls needed — data is fresh from the last build
 *
 * "Freshness" here means: when was the last GitHub Actions run that updated the data?
 * That timestamp is stored in policies.generated.json and surfaced in the UI.
 */

import { Policy, PolicyCache } from '@/types';
import { activePolicies, dataSource, dataFetchedAt } from '@/data/index';

const CACHE_KEY = 'benefit_finder_policy_cache';

// ---------------------------------------------------------------------------
// localStorage cache (preserves fetchedAt across page reloads)
// ---------------------------------------------------------------------------

export function getCachedPolicies(): PolicyCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PolicyCache;
    if (!Array.isArray(parsed.data) || !parsed.fetchedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCachedPolicies(cache: PolicyCache): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full — fail silently
  }
}

export function invalidateCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
}

// ---------------------------------------------------------------------------
// Freshness (based on build-time data timestamp, not TTL)
// ---------------------------------------------------------------------------

export function shouldRefetchPolicies(_cache: PolicyCache | null): boolean {
  // Data is refreshed at build time via GitHub Actions.
  // No browser-side refetch needed — always return false.
  return false;
}

export function validateFreshness(_cache: PolicyCache | null): boolean {
  return true;
}

// ---------------------------------------------------------------------------
// Normalization (post-processing applied at runtime)
// ---------------------------------------------------------------------------

export function normalizePolicies(raw: Policy[]): Policy[] {
  const today = new Date();
  const currentYear = today.getFullYear();

  return raw.map((policy) => {
    const updates: Partial<Policy> = {};
    if (policy.applicationStart) {
      const d = new Date(policy.applicationStart);
      if (d.getFullYear() < currentYear) {
        updates.applicationStart = policy.applicationStart.replace(/^\d{4}/, String(currentYear));
      }
    }
    if (policy.applicationEnd) {
      const d = new Date(policy.applicationEnd);
      if (d.getFullYear() < currentYear) {
        updates.applicationEnd = policy.applicationEnd.replace(/^\d{4}/, String(currentYear));
      }
    }
    return { ...policy, ...updates };
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface LoadPoliciesResult {
  policies: Policy[];
  fetchedAt: Date;
  source: 'api' | 'mock';
  wasStale: boolean;
}

export async function loadPolicies(_forceRefetch = false): Promise<LoadPoliciesResult> {
  const normalized = normalizePolicies(activePolicies);
  const fetchedAt = dataFetchedAt ?? new Date();

  return {
    policies: normalized,
    fetchedAt,
    source: dataSource,
    wasStale: false,
  };
}

// ---------------------------------------------------------------------------
// Policy status helper
// ---------------------------------------------------------------------------

export function getPolicyStatus(policy: Policy): import('@/types').PolicyStatus {
  if (policy.isAlwaysOpen) return 'always-open';
  const now = new Date();
  const start = policy.applicationStart ? new Date(policy.applicationStart) : null;
  const end = policy.applicationEnd ? new Date(policy.applicationEnd) : null;
  if (end && end < now) return 'closed';
  if (start && start > now) return 'upcoming';
  if ((!start || start <= now) && (!end || end >= now)) return 'active';
  return 'unknown';
}
