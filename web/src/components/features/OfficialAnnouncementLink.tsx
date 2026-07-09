'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface OfficialAnnouncementLinkProps {
  institution: string;
  dtlUrl?: string | null;
  dtlUrlMob?: string | null;
  className?: string;
  children: React.ReactNode;
}

export default function OfficialAnnouncementLink({
  institution,
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

  const isLH = institution.includes('LH');
  const isSH = institution.includes('SH');

  let targetUrl = '';
  if (isLH) {
    targetUrl = isMobile 
      ? (dtlUrlMob || dtlUrl || '') 
      : (dtlUrl || dtlUrlMob || '');
  } else if (isSH) {
    targetUrl = 'https://www.i-sh.co.kr/app/lay2/program/S48T1588C614/m_27/appNoti/appUser_list.do?splyTy=02';
  }

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
