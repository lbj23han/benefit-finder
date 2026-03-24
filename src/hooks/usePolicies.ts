'use client';

/**
 * React hook that manages policy data with two-phase loading:
 * - Phase 1 (instant): curated policies from bundle — renders immediately, no spinner
 * - Phase 2 (background): full dataset from /data/policies.json — updates UI when ready
 * - Refetch on tab focus (visibilitychange)
 * - Periodic background refresh every 30 minutes
 */

import { useEffect, useRef, useState } from 'react';
import { Policy } from '@/types';
import { loadPolicies, normalizePolicies, LoadPoliciesResult } from '@/lib/policyCache';
import { curatedPolicies } from '@/data/index';

const POLL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export interface UsePoliciesState {
  policies: Policy[];
  fetchedAt: Date | null;
  source: 'api' | 'mock' | null;
  loading: boolean;
  isStale: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePolicies(): UsePoliciesState {
  // Phase 1: curated policies are in the JS bundle — available instantly, no network wait
  const [policies, setPolicies] = useState<Policy[]>(() =>
    normalizePolicies(curatedPolicies as Policy[])
  );
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [source, setSource] = useState<'api' | 'mock' | null>(null);
  const [loading, setLoading] = useState(true); // Phase 2 background fetch in progress
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const doFetch = async (force = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      // Phase 2: fetch full dataset in background (8.7MB, SW-cached after first load)
      const result: LoadPoliciesResult = await loadPolicies(force);
      setPolicies(result.policies);
      setFetchedAt(result.fetchedAt);
      setSource(result.source);
      setIsStale(false);
    } catch {
      setError('정책 데이터를 불러오는 데 실패했어요.');
      setIsStale(true);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Initial load — Phase 2 runs in background after Phase 1 already rendered
  useEffect(() => {
    doFetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch on tab focus
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        doFetch();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic background refresh
  useEffect(() => {
    const timer = setInterval(() => doFetch(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    policies,
    fetchedAt,
    source,
    loading,
    isStale,
    error,
    refresh: () => doFetch(true),
  };
}
