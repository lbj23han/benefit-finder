'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/',
    label: '홈',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-[#1B6B4A]' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/results',
    label: '혜택찾기',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-[#1B6B4A]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 0 5 11a6 6 0 0 0 12 0z" />
      </svg>
    ),
  },
  {
    href: '/saved',
    label: '저장',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-[#1B6B4A]' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3-7 3V5z" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: '내 정보',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-[#1B6B4A]' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile: bottom bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 px-4 py-1 min-w-[60px] active:scale-90 transition-transform duration-100"
              >
                {item.icon(active)}
                <span className={`text-[10px] font-medium ${active ? 'text-[#1B6B4A]' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop: left sidebar */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-100 z-50 py-6">
        <div className="px-5 mb-8">
          <span className="text-xl font-extrabold text-[#1B6B4A]">혜택줍줍</span>
        </div>
        <div className="flex flex-col gap-1 px-3 flex-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  active
                    ? 'bg-[#E0F2EC] text-[#1B6B4A]'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {item.icon(active)}
                <span className={`text-sm font-semibold ${active ? 'text-[#1B6B4A]' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="px-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">나에게 맞는 혜택을 찾아드려요</p>
        </div>
      </nav>
    </>
  );
}
