import React from 'react';
import { Complex } from '@/types';
import styles from './ComplexCard.module.css';

interface ComplexCardProps {
  complex: Complex;
  isActive: boolean;
  onClick: () => void;
  isBookmarked: boolean;
  onBookmarkToggle: () => void;
  announcementTitle?: string;
  announcementStatus?: string;
  announcementInstitution?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function ComplexCard({ 
  complex, 
  isActive, 
  onClick,
  isBookmarked,
  onBookmarkToggle,
  announcementTitle,
  announcementStatus,
  announcementInstitution,
  onMouseEnter,
  onMouseLeave
}: ComplexCardProps) {
  return (
    <div 
      className={`${styles['complex-card']} ${isActive ? styles.active : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles['card-top-row']}>
        <span className={styles['complex-name']}>{complex.name}</span>
        <button 
          className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onBookmarkToggle();
          }}
          title={isBookmarked ? "저장한 단지 해제" : "단지 저장하기"}
        >
          <svg className={styles['star-icon']} width="16" height="16" viewBox="0 0 24 24" fill={isBookmarked ? 'var(--color-warning-text)' : 'none'} stroke={isBookmarked ? 'var(--color-warning-text)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </button>
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

      {announcementTitle && (
        <div className={styles['card-ann-info']}>
          <span className={styles['ann-badge']}>{announcementInstitution || '공고'}</span>
          <span className={styles['ann-title']} title={announcementTitle}>
            {announcementTitle}
          </span>
          {announcementStatus && (
            <span className={`${styles['status-badge']} ${styles[announcementStatus.toLowerCase()]}`}>
              {announcementStatus === 'ONGOING' ? '접수중' : announcementStatus === 'UPCOMING' ? '접수예정' : '접수마감'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

