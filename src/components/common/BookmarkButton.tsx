'use client';

import { useState, useEffect } from 'react';
import { addBookmark, removeBookmark, isBookmarked } from '@/lib/storage';

interface BookmarkButtonProps {
  policyId: string;
  onToggle?: (saved: boolean) => void;
}

export default function BookmarkButton({ policyId, onToggle }: BookmarkButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isBookmarked(policyId));
  }, [policyId]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saved) {
      removeBookmark(policyId);
      setSaved(false);
      onToggle?.(false);
    } else {
      addBookmark(policyId);
      setSaved(true);
      onToggle?.(true);
    }
  };

  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
      aria-label={saved ? '북마크 해제' : '북마크 추가'}
    >
      {saved ? (
        <svg className="w-5 h-5 text-[#1B6B4A] fill-current" viewBox="0 0 24 24">
          <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3-7 3V5z" />
        </svg>
      )}
    </button>
  );
}
