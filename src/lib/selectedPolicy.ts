'use client';

import type { Policy } from '@/types';

const SELECTED_POLICY_KEY = 'benefit_finder_selected_policy';

export function saveSelectedPolicy(policy: Policy): void {
  try {
    sessionStorage.setItem(SELECTED_POLICY_KEY, JSON.stringify(policy));
  } catch {
    // Ignore storage errors.
  }
}

export function getSelectedPolicy(expectedId?: string | null): Policy | null {
  try {
    const raw = sessionStorage.getItem(SELECTED_POLICY_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Policy;
    if (expectedId && parsed.id !== expectedId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
