import React from 'react';

interface BadgeProps {
  institution: string;
}

const getBadgeClass = (inst: string) => {
  if (inst.includes('SH')) return 'badge-sh';
  if (inst.includes('LH')) return 'badge-lh';
  if (inst.includes('HUG')) return 'badge-hug';
  if (inst.includes('경기') || inst.includes('GH')) return 'badge-gh';
  return 'badge-private';
};

export default function Badge({ institution }: BadgeProps) {
  return <span className={`badge ${getBadgeClass(institution)}`}>{institution}</span>;
}
