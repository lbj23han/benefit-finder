'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

interface Props {
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal';
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

const CLIENT_ID = 'ca-pub-5992854033857462';

export default function AdBanner({ slot, format = 'auto', className = '' }: Props) {
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
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    </>
  );
}
