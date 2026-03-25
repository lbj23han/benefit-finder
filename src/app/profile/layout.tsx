import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '내 정보 관리',
  description: '프로필 정보를 수정하고 내 조건에 맞는 최신 정부 혜택을 다시 확인하세요.',
  robots: { index: false },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
