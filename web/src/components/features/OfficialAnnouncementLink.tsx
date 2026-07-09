'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface OfficialAnnouncementLinkProps {
  dtlUrl?: string | null;
  dtlUrlMob?: string | null;
  className?: string;
  children: React.ReactNode;
}

export default function OfficialAnnouncementLink({
  dtlUrl,
  dtlUrlMob,
  className,
  children,
}: OfficialAnnouncementLinkProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    setIsMobile(media.matches);

    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const targetUrl = isMobile 
    ? (dtlUrlMob || dtlUrl) 
    : (dtlUrl || dtlUrlMob);

  if (!targetUrl) return null;

  return (
    <Link 
      href={targetUrl} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={className}
    >
      {children}
    </Link>
  );
}
