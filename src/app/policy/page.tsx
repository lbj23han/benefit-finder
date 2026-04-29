import { Suspense } from 'react';
import PolicyQueryClient from '@/components/policy/PolicyQueryClient';

export default function PolicyQueryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-[#1B6B4A] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PolicyQueryClient />
    </Suspense>
  );
}
