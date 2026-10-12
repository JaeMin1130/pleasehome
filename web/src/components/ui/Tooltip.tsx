import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

export default function Tooltip({ label, children, position = 'top', offset = 6 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (position === 'bottom') {
      setCoords({
        top: rect.bottom + offset,
        left: rect.left + rect.width / 2,
      });
    } else {
      setCoords({
        top: rect.top - offset,
        left: rect.left + rect.width / 2,
      });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  if (!label) return <>{children}</>;

  return (
    <div
      ref={containerRef}
      className={styles.tooltipContainer}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {mounted && isVisible && createPortal(
        <div
          className={`${styles.tooltipBubble} ${position === 'bottom' ? styles.bottom : styles.top}`}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 9999,
          }}
          role="tooltip"
        >
          {label}
        </div>,
        document.body
      )}
    </div>
  );
}
