import type { Metadata, Viewport } from "next";
import "./globals.css";

const BASE_URL = "https://benefit-finder-jet.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "혜택줍줍 — 내 조건에 맞는 정부 지원 혜택 찾기",
    template: "%s | 혜택줍줍",
  },
  description:
    "나이·지역·직업·소득 조건만 입력하면 받을 수 있는 정부 지원금·복지 혜택을 바로 찾아드려요. 취업·주거·육아·교육·창업 분야 300개 이상의 혜택을 한눈에.",
  keywords: [
    "정부지원금", "복지혜택", "정부혜택", "지원금찾기", "청년혜택",
    "주거지원", "취업지원", "육아지원", "교육비지원", "창업지원",
    "복지로", "정부24", "맞춤혜택", "혜택줍줍",
  ],

  // ── Icons ──────────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
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
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "혜택줍줍 로고",
      },
    ],
  },

  // ── Twitter / X 카드 ────────────────────────────────────────────────────
  twitter: {
    card: "summary",
    title: "혜택줍줍 — 내 조건에 맞는 정부 지원 혜택 찾기",
    description: "나이·지역·직업 조건만 입력하면 받을 수 있는 정부 지원금을 바로 찾아드려요.",
    images: ["/icon-512.png"],
  },

  // ── Robots ─────────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  themeColor: "#1B6B4A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
