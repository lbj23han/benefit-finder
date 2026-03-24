'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// 페이지 깊이 — 낮을수록 루트에 가까움
const PAGE_DEPTH: Record<string, number> = {
  '/':            0,
  '/results':     1,
  '/saved':       1,
  '/profile':     1,
  '/onboarding':  1,
  '/privacy':     2,
  '/terms':       2,
};

function getDepth(path: string): number {
  if (path.startsWith('/policy/')) return 2;
  return PAGE_DEPTH[path] ?? 1;
}

/**
 * 내비게이션 방향을 <html data-nav="…"> 속성으로 기록.
 * CSS view-transition 규칙이 이 값을 읽어 애니메이션 방향을 결정한다.
 *
 *   forward — 더 깊은 페이지로 이동 (iOS push)
 *   back    — 상위 페이지로 이동  (iOS pop)
 *   tab     — 같은 깊이 탭 전환  (cross-fade)
 */
export default function NavDirectionTracker() {
  const pathname = usePathname();
  const prevDepth = useRef(getDepth(pathname));
  const prevPath  = useRef(pathname);

  useEffect(() => {
    if (pathname === prevPath.current) return;

    const currentDepth = getDepth(pathname);
    const prev = prevDepth.current;

    let dir: 'forward' | 'back' | 'tab';
    if (currentDepth > prev)       dir = 'forward';
    else if (currentDepth < prev)  dir = 'back';
    else                           dir = 'tab';

    document.documentElement.dataset.nav = dir;
    prevDepth.current = currentDepth;
    prevPath.current  = pathname;
  }, [pathname]);

  return null;
}
