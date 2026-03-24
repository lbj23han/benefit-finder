import BottomNav from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

export default function AppShell({ children, showBottomNav = true }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-[#F4F8F6]">
      {showBottomNav && <BottomNav />}
      {/* Content area: full width on mobile, offset for sidebar on desktop */}
      <div
        className={[
          'min-h-dvh flex flex-col',
          showBottomNav ? 'pb-16 lg:pb-0 lg:ml-56' : '',
        ].join(' ')}
      >
        {/* page-content: view-transition-name 지정 — 이 영역만 슬라이드 애니메이션 */}
        <div
          className="w-full max-w-[430px] mx-auto lg:max-w-none lg:mx-0"
          style={{ viewTransitionName: 'page-content' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
