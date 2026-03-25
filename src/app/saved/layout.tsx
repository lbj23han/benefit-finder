import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '저장한 혜택',
  description: '북마크한 정부 지원금·복지 혜택 목록을 확인하고 신청 방법을 알아보세요.',
  robots: { index: false },
};

export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
