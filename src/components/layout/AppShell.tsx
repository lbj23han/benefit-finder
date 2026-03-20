import BottomNav from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

export default function AppShell({ children, showBottomNav = true }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#F4F8F6]">
      {showBottomNav && <BottomNav />}
      {/* Content area: full width on mobile, offset for sidebar on desktop */}
      <div
        className={[
          'min-h-screen flex flex-col',
          showBottomNav ? 'pb-16 lg:pb-0 lg:ml-56' : '',
        ].join(' ')}
      >
        {/* Inner content: constrained on mobile, wider on tablet/desktop */}
        <div className="w-full max-w-[430px] mx-auto lg:max-w-none lg:mx-0">
          {children}
        </div>
      </div>
    </div>
  );
}
