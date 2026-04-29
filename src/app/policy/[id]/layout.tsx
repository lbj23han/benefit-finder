import type { Metadata } from 'next';
import Script from 'next/script';
import { policies } from '@/data/policies';
import { formatAmount, getCategoryLabel } from '@/lib/utils';

const BASE_URL = 'https://findmymoney.vercel.app';

function buildDescription(policy: ReturnType<typeof policies.find>): string {
  if (!policy) return '';
  const parts: string[] = [];

  if (policy.benefitAmount) {
    parts.push(`최대 ${formatAmount(policy.benefitAmount)} 지원`);
  } else if (policy.estimatedBenefitText) {
    parts.push(policy.estimatedBenefitText);
  }

  if (policy.isAlwaysOpen) {
    parts.push('상시 신청 가능');
  } else if (policy.applicationEnd) {
    parts.push(`신청 기한 ${policy.applicationEnd}까지`);
  }

  const base = policy.summary;
  if (parts.length === 0) return base;
  return `${base} | ${parts.join(' · ')}`;
}

export async function generateStaticParams() {
  return policies.map((policy) => ({ id: policy.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const policy = policies.find((policy) => policy.id === id);

  if (!policy) {
    return { title: '혜택 상세' };
  }

  const description = buildDescription(policy);

  return {
    title: policy.title,
    description,
    alternates: {
      canonical: `${BASE_URL}/policy/${id}/`,
    },
    openGraph: {
      type: 'article',
      url: `${BASE_URL}/policy/${id}/`,
      title: policy.title,
      description,
    },
  };
}

export default async function PolicyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const policy = policies.find((policy) => policy.id === id);

  if (!policy) return <>{children}</>;

  const categoryLabel = getCategoryLabel(policy.category);
  const description = buildDescription(policy);
  const pageUrl = `${BASE_URL}/policy/${id}/`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '혜택줍줍', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: `${categoryLabel} 지원`, item: `${BASE_URL}/results` },
      { '@type': 'ListItem', position: 3, name: policy.title, item: pageUrl },
    ],
  };

  const benefitTypeMap: Record<string, string> = {
    cash: '현금 지원',
    loan: '저금리 대출',
    service: '서비스 지원',
    'tax-reduction': '세금 감면',
    voucher: '바우처',
  };

  const governmentBenefitSchema = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    name: policy.title,
    description,
    url: pageUrl,
    provider: {
      '@type': 'GovernmentOrganization',
      name: policy.sourceOrg,
    },
    areaServed: policy.region.includes('전국')
      ? { '@type': 'Country', name: '대한민국' }
      : policy.region.map((r) => ({ '@type': 'AdministrativeArea', name: r })),
    serviceType: benefitTypeMap[policy.benefitType] ?? policy.benefitType,
    ...(policy.benefitAmount && {
      offers: {
        '@type': 'Offer',
        price: policy.benefitAmount * 10000,
        priceCurrency: 'KRW',
        description: policy.benefitDescription,
      },
    }),
    ...(policy.applicationEnd && !policy.isAlwaysOpen && {
      availabilityEnds: policy.applicationEnd,
    }),
  };

  return (
    <>
      <Script
        id="schema-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="schema-government-benefit"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(governmentBenefitSchema) }}
      />
      {children}
    </>
  );
}
