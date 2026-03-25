import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '나에게 맞는 혜택 찾기',
  description: '나이, 지역, 직업, 소득 정보를 입력하면 받을 수 있는 정부 지원금과 복지 혜택을 바로 추천해드려요. 1분이면 충분해요.',
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
