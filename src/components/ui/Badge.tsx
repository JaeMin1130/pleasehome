import React from 'react';

interface BadgeProps {
  institution: string;
}

export default function Badge({ institution }: BadgeProps) {
  const badgeClass = institution.includes('SH') 
    ? 'badge-sh' 
    : institution.includes('LH') 
      ? 'badge-lh' 
      : 'badge-gh';

  return <span className={`badge ${badgeClass}`}>{institution}</span>;
}
