'use client';

/**
 * React hook that manages policy data with:
 * - Initial load on mount
 * - Refetch on tab focus (visibilitychange)
 * - Periodic background refresh every 30 minutes
 */

import { useEffect, useRef, useState } from 'react';
import { Policy } from '@/types';
import { loadPolicies, LoadPoliciesResult } from '@/lib/policyCache';

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
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [source, setSource] = useState<'api' | 'mock' | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetch = async (force = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
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

  // Initial load
  useEffect(() => {
    fetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch on tab focus
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetch();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic background refresh
  useEffect(() => {
    const timer = setInterval(() => fetch(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    policies,
    fetchedAt,
    source,
    loading,
    isStale,
    error,
    refresh: () => fetch(true),
  };
}
