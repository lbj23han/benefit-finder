'use client';

import { useEffect, useRef, useState } from 'react';
import AdBanner from '@/components/common/AdBanner';

interface Props {
  className?: string;
  rootMargin?: string;
}

export default function LazyAdBanner({
  className = '',
  rootMargin = '600px 0px',
}: Props) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) return;
    const target = targetRef.current;
    if (!target) return;

    if (typeof IntersectionObserver === 'undefined') {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [rootMargin, shouldRender]);

  return (
    <div ref={targetRef} className={className}>
      {shouldRender ? <AdBanner /> : <div className="h-px" />}
    </div>
  );
}
