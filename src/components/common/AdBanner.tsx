'use client';

import { TossAds } from '@apps-in-toss/web-framework';
import { useEffect, useId, useRef, useState } from 'react';
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
const TOSS_AD_GROUP_ID = 'ait.v2.live.79f3c51e19144f41';
const isTossBuild = process.env.NEXT_PUBLIC_TOSS_BUILD === 'true';

export default function AdBanner({ className = '' }: Props) {
  const tossTargetId = useId().replace(/:/g, '-');
  const tossTargetRef = useRef<HTMLDivElement | null>(null);
  const [isTossAdRendered, setIsTossAdRendered] = useState(false);
  const pushed = useRef(false);

  useEffect(() => {
    if (isTossBuild) return;
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded yet
    }
  }, []);

  useEffect(() => {
    if (!isTossBuild || !tossTargetRef.current) return;
    try {
      if (!TossAds.initialize.isSupported() || !TossAds.attachBanner.isSupported()) return;
    } catch (error) {
      console.info('Toss Ads is not supported in this environment:', error);
      return;
    }

    let banner: ReturnType<typeof TossAds.attachBanner> | null = null;
    let disposed = false;

    const attachBanner = () => {
      if (disposed || !tossTargetRef.current || banner) return;

      banner = TossAds.attachBanner(TOSS_AD_GROUP_ID, tossTargetRef.current, {
        theme: 'auto',
        tone: 'grey',
        variant: 'expanded',
        callbacks: {
          onAdRendered: () => setIsTossAdRendered(true),
          onNoFill: () => setIsTossAdRendered(false),
          onAdFailedToRender: (payload) => {
            console.info('Toss banner failed:', payload.error.message);
            setIsTossAdRendered(false);
          },
        },
      });
    };

    TossAds.initialize({
      callbacks: {
        onInitialized: attachBanner,
        onInitializationFailed: (error) => {
          console.info('Toss Ads initialization failed:', error);
        },
      },
    });

    return () => {
      disposed = true;
      banner?.destroy();
    };
  }, []);

  if (isTossBuild) {
    return (
      <div
        id={tossTargetId}
        ref={tossTargetRef}
        className={[
          'w-full overflow-hidden transition-[min-height] duration-200',
          isTossAdRendered ? 'min-h-24' : 'min-h-0',
          className,
        ].join(' ')}
      />
    );
  }

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
