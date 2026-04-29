'use client';

import { useEffect } from 'react';

const isTossBuild = process.env.NEXT_PUBLIC_TOSS_BUILD === 'true';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (isTossBuild) {
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW 등록 실패는 무시 — 앱 동작에 영향 없음
      });
    }
  }, []);

  return null;
}
