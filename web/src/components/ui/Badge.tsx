import React from 'react';

interface BadgeProps {
  institution: string;
}

export default function Badge({ institution }: BadgeProps) {
  const badgeClass = institution.includes('SH') 
    ? 'badge-sh' 
    : institution.includes('LH') 
      ? 'badge-lh' 
      : institution.includes('HUG')
        ? 'badge-hug'
        : institution.includes('경기') || institution.includes('GH')
          ? 'badge-gh'
          : 'badge-private';

  return <span className={`badge ${badgeClass}`}>{institution}</span>;
}
