import type { Metadata } from 'next';
import { policies } from '@/data/policies';

const BASE_URL = 'https://benefit-finder-jet.vercel.app';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const policy = policies.find((p) => p.id === id);

  if (!policy) {
    return { title: '혜택 상세' };
  }

  return {
    title: policy.title,
    description: policy.summary,
    alternates: {
      canonical: `${BASE_URL}/policy/${id}`,
    },
    openGraph: {
      type: 'article',
      url: `${BASE_URL}/policy/${id}`,
      title: policy.title,
      description: policy.summary,
    },
  };
}

export default function PolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
