'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Policy } from '@/types';
import PolicyDetailView from '@/components/policy/PolicyDetailView';
import { getSelectedPolicy } from '@/lib/selectedPolicy';

export default function PolicyQueryClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [policy, setPolicy] = useState<Policy | null>(null);

  useEffect(() => {
    setPolicy(getSelectedPolicy(id));
  }, [id]);

  return (
    <PolicyDetailView
      policy={policy}
      emptyDescription="목록에서 다시 선택하면 상세 내용을 볼 수 있어요"
    />
  );
}
