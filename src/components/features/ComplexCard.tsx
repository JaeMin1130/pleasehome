import React from 'react';
import { Complex } from '@/types';
import styles from './ComplexCard.module.css';

interface ComplexCardProps {
  complex: Complex;
  isActive: boolean;
  isBookmarked?: boolean;
  onBookmarkToggle?: (e: React.MouseEvent) => void;
  onClick: () => void;
}

export default function ComplexCard({ 
  complex, 
  isActive, 
  isBookmarked = false,
  onBookmarkToggle,
  onClick 
}: ComplexCardProps) {
  return (
    <div 
      className={`${styles['complex-card']} ${isActive ? styles.active : ''}`}
      onClick={onClick}
    >
      <div className={styles['card-top-row']}>
        <span className={styles['complex-name']}>{complex.name}</span>
        {onBookmarkToggle && (
          <button 
            className={`${styles['bookmark-btn']} ${isBookmarked ? styles.bookmarked : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onBookmarkToggle(e);
            }}
            title={isBookmarked ? "관심 단지 해제" : "관심 단지 추가"}
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill={isBookmarked ? "var(--color-gold)" : "none"} 
              stroke={isBookmarked ? "var(--color-gold)" : "currentColor"} 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
        )}
      </div>
      <span className={styles['complex-address']}>
        <svg 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        {complex.address}
      </span>
    </div>
  );
}

