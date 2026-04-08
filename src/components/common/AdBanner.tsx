'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

interface Props {
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

const CLIENT_ID = 'ca-pub-5992854033857462';
const SLOT_ID = '9143719859';

export default function AdBanner({ className = '' }: Props) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded yet
    }
  }, []);

  return (
    <>
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`}
        crossOrigin="anonymous"
        strategy="lazyOnload"
      />
      <div className={`overflow-hidden ${className}`}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={CLIENT_ID}
          data-ad-slot={SLOT_ID}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />
      </div>
    </>
  );
}
