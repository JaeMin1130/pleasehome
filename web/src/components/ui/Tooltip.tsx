import React from 'react';
import styles from './Tooltip.module.css';

export interface TooltipProps {
  label: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  withArrow?: boolean;
  color?: string;
  offset?: number;
  transitionProps?: any;
}

export default function Tooltip({ label, children }: TooltipProps) {
  if (!label) return <>{children}</>;

  return (
    <div className={styles.tooltipContainer}>
      {children}
      <div className={styles.tooltipBubble} role="tooltip">
        {label}
      </div>
    </div>
  );
}
