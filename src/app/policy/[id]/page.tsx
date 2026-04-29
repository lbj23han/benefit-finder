'use client';

import { use } from 'react';
import { usePolicies } from '@/hooks/usePolicies';
import PolicyDetailView from '@/components/policy/PolicyDetailView';

export default function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { policies, loading } = usePolicies();
  const policy = policies.find((item) => item.id === id) ?? null;

  if (loading && !policy) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#1B6B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <PolicyDetailView policy={policy} />;
}
