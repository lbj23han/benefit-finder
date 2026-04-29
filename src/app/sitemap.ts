import { MetadataRoute } from 'next';
import { policies } from '@/data/policies';

export const dynamic = 'force-static';

const BASE_URL = 'https://findmymoney.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const policyEntries: MetadataRoute.Sitemap = policies.map((p) => ({
    url: `${BASE_URL}/policy/${p.id}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/results`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/onboarding`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...policyEntries,
  ];
}
