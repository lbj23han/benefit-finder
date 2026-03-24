/**
 * Policy data freshness layer.
 *
 * Data flow:
 *   /data/policies.json  — static file in public/, updated by GitHub Actions + committed
 *                          served via HTTP (cacheable by browser + SW), NOT bundled in JS
 *   policies.ts          — hand-curated fallback, always available instantly
 *
 * Caching strategy:
 *   1. Show curated policies immediately (no network wait)
 *   2. Fetch /data/policies.json in background (SW caches it after first load)
 *   3. Merge + deduplicate, update UI
 */

import { Policy, PolicyCache } from '@/types';
import { curatedPolicies, dataSource, dataFetchedAt } from '@/data/index';

const POLICIES_URL = '/data/policies.json';

// ---------------------------------------------------------------------------
// localStorage — stores only a lightweight cache-control header (not full data)
// Full data is cached by the Service Worker / browser HTTP cache.
// ---------------------------------------------------------------------------

const CACHE_META_KEY = 'benefit_finder_cache_meta';

interface CacheMeta {
  fetchedAt: string;
  source: 'api' | 'mock';
  count: number;
}

function getCacheMeta(): CacheMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_META_KEY);
    return raw ? (JSON.parse(raw) as CacheMeta) : null;
  } catch {
    return null;
  }
}

function saveCacheMeta(meta: CacheMeta): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Kept for backward compatibility with existing code that calls these
// ---------------------------------------------------------------------------

export function getCachedPolicies(): PolicyCache | null { return null; }
export function saveCachedPolicies(_cache: PolicyCache): void { }
export function invalidateCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_META_KEY);
}
export function shouldRefetchPolicies(_cache: PolicyCache | null): boolean { return false; }
export function validateFreshness(_cache: PolicyCache | null): boolean { return true; }

// ---------------------------------------------------------------------------
// Normalization
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
// Title-based dedup (same logic as data/index.ts)
// ---------------------------------------------------------------------------

function mergePolicies(fetched: Policy[], curated: Policy[]): Policy[] {
  const fetchedTitles = new Set(fetched.map((p) => p.title.trim()));
  const uniqueCurated = curated.filter((p) => !fetchedTitles.has(p.title.trim()));
  return [...fetched, ...uniqueCurated];
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
  // Try fetching the full dataset from the static file.
  // The Service Worker and browser HTTP cache will serve this from cache on
  // subsequent loads — no extra network round trip after first visit.
  try {
    const res = await fetch(POLICIES_URL, {
      // 'default': use browser/SW HTTP cache, revalidate if stale
      cache: _forceRefetch ? 'reload' : 'default',
    });

    if (res.ok) {
      const json = await res.json() as { policies: Policy[]; fetchedAt: string; source: string; count: number };
      const merged   = mergePolicies(json.policies as Policy[], curatedPolicies);
      const normalized = normalizePolicies(merged);
      const fetchedAt = json.fetchedAt ? new Date(json.fetchedAt) : new Date();
      const source    = json.source === 'bokjiro-api' ? ('api' as const) : ('mock' as const);

      saveCacheMeta({ fetchedAt: json.fetchedAt, source, count: normalized.length });

      return { policies: normalized, fetchedAt, source, wasStale: false };
    }
  } catch { /* network error — fall through */ }

  // Fallback: return curated policies instantly (always available)
  const normalized = normalizePolicies(curatedPolicies);
  const meta = getCacheMeta();
  return {
    policies: normalized,
    fetchedAt: meta ? new Date(meta.fetchedAt) : (dataFetchedAt ?? new Date()),
    source: meta?.source ?? dataSource,
    wasStale: true,
  };
}

// ---------------------------------------------------------------------------
// Policy status helper
// ---------------------------------------------------------------------------

export function getPolicyStatus(policy: Policy): import('@/types').PolicyStatus {
  if (policy.isAlwaysOpen) return 'always-open';
  const now = new Date();
  const start = policy.applicationStart ? new Date(policy.applicationStart) : null;
  const end   = policy.applicationEnd   ? new Date(policy.applicationEnd)   : null;
  if (end && end < now) return 'closed';
  if (start && start > now) return 'upcoming';
  if ((!start || start <= now) && (!end || end >= now)) return 'active';
  return 'unknown';
}
