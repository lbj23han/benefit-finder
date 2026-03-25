import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '내 맞춤 혜택 결과',
  description: '나이·지역·직업·소득 조건에 맞는 정부 지원금·복지 혜택을 확인하세요. 취업·주거·육아·교육·창업 분야 혜택을 한눈에 비교할 수 있어요.',
};

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
