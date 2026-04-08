import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/common/ServiceWorkerRegistrar";
import NavDirectionTracker from "@/components/common/NavDirectionTracker";
import { ViewTransitions } from "next-view-transitions";

const BASE_URL = "https://findmymoney.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "혜택줍줍 — 내 조건에 맞는 정부 지원 혜택 찾기",
    template: "%s | 혜택줍줍",
  },
  description:
    "나이·지역·직업·소득 조건만 입력하면 받을 수 있는 정부 지원금·복지 혜택을 바로 찾아드려요. 취업·주거·육아·교육·창업 분야 300개 이상의 혜택을 한눈에.",
  keywords: [
    "혜택줍줍", "정부지원금", "복지혜택", "정부혜택", "지원금찾기",
    "청년혜택", "청년지원금", "주거지원", "취업지원", "육아지원",
    "교육비지원", "창업지원", "맞춤혜택추천", "복지로", "정부24",
    "내게맞는정부지원금", "숨은혜택",
  ],

  // ── Canonical ──────────────────────────────────────────────────────────
  alternates: {
    canonical: BASE_URL,
  },

  // ── Icons ──────────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icon-192.png",
  },

  // ── PWA ────────────────────────────────────────────────────────────────
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "혜택줍줍",
    startupImage: "/icon-512.png",
  },

  // ── Open Graph (카카오·페이스북·슬랙 미리보기) ──────────────────────────
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: BASE_URL,
    siteName: "혜택줍줍",
    title: "혜택줍줍 — 내 조건에 맞는 정부 지원 혜택 찾기",
    description:
      "나이·지역·직업 조건만 입력하면 받을 수 있는 정부 지원금을 바로 찾아드려요.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "혜택줍줍 — 내 조건에 맞는 정부 지원 혜택 찾기",
      },
    ],
  },

  // ── Twitter / X 카드 ────────────────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "혜택줍줍 — 내 조건에 맞는 정부 지원 혜택 찾기",
    description: "나이·지역·직업 조건만 입력하면 받을 수 있는 정부 지원금을 바로 찾아드려요.",
    images: ["/og-image.png"],
  },

  // ── Robots ─────────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },

  // ── Google Search Console 소유권 확인 ──────────────────────────────────
  verification: {
    google: 'UqqVWxR6WNXvWnv66Cod24CsoN0fKdO1opwN9PFOpcg',
  },
};

export const viewport: Viewport = {
  themeColor: "#1B6B4A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '혜택줍줍',
    alternateName: '혜택줍줍 - 정부지원금 맞춤 추천',
    url: BASE_URL,
    description: '나이·지역·직업·소득 조건만 입력하면 받을 수 있는 정부 지원금·복지 혜택을 바로 찾아드려요. 청년·주거·육아·교육·창업 분야 300개 이상의 혜택.',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    inLanguage: 'ko-KR',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '혜택줍줍',
    alternateName: '혜택줍줍 - 정부지원금 찾기',
    url: BASE_URL,
    description: '내 조건에 맞는 정부 지원 혜택을 찾아주는 서비스, 혜택줍줍',
    inLanguage: 'ko-KR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/results`,
      },
      'query-input': '정부지원금 혜택 검색',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '혜택줍줍',
    url: BASE_URL,
    description: '정부 지원금·복지 혜택 맞춤 추천 서비스 혜택줍줍',
    logo: `${BASE_URL}/icon-512.png`,
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ViewTransitions>
      <html lang="ko" className="h-full">
        <head>
          {/* AdSense 스크립트는 콘텐츠 페이지에서만 로드 (AdBanner 컴포넌트 참조) */}
          {jsonLd.map((schema, i) => (
            <script
              key={i}
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />
          ))}
        </head>
        <body className="min-h-full">
          <ServiceWorkerRegistrar />
          <NavDirectionTracker />
          {children}
        </body>
      </html>
    </ViewTransitions>
  );
}
