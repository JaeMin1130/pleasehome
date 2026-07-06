"use client";

import styles from './NavigationBar.module.css';
import { UI_SIZES, UI_STROKE_WIDTHS } from '@/constants';

export type NavigationTabType = 'SEARCH' | 'BOOKMARK' | 'MORE';

interface NavigationBarProps {
  activeTab: NavigationTabType;
  isSidebarCollapsed: boolean;
  onTabSelect: (tab: NavigationTabType) => void;
}

export default function NavigationBar({
  activeTab,
  isSidebarCollapsed,
  onTabSelect,
}: NavigationBarProps) {
  return (
    <nav className={styles['nav-bar']}>
      {/* 상단 그룹 (로고 및 주요 메뉴) */}
      <div className={styles['nav-group']}>
        <div className={styles['nav-brand-wrapper']}>
          {/* 최좌측 상단에 듬직하게 고정되는 통합 로고 (사이즈를 키워 여백 축소) */}
          <svg className={styles['nav-brand-logo']} width={UI_SIZES.ICON_XL + 5} height={UI_SIZES.ICON_XL + 5} viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth={UI_STROKE_WIDTHS.BOLD} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
            <line x1="9" y1="3" x2="9" y2="18"></line>
            <line x1="15" y1="6" x2="15" y2="21"></line>
          </svg>
        </div>

        <button
          className={`${styles['nav-item']} ${!isSidebarCollapsed && activeTab === 'SEARCH' ? styles.active : ''}`}
          onClick={() => onTabSelect('SEARCH')}
          title="공고 검색"
        >
          <svg className={styles['nav-icon']} width={UI_SIZES.ICON_XL} height={UI_SIZES.ICON_XL} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={UI_STROKE_WIDTHS.THICK} strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
            <line x1="9" y1="22" x2="9" y2="16"></line>
            <line x1="15" y1="22" x2="15" y2="16"></line>
            <line x1="9" y1="16" x2="15" y2="16"></line>
            <path d="M9 6h6M9 10h6"></path>
          </svg>
          <span className={styles['nav-label']}>공고</span>
        </button>

        <button
          className={`${styles['nav-item']} ${!isSidebarCollapsed && activeTab === 'BOOKMARK' ? styles.active : ''}`}
          onClick={() => onTabSelect('BOOKMARK')}
          title="저장한 단지"
        >
          <svg className={styles['nav-icon']} width={UI_SIZES.ICON_XL} height={UI_SIZES.ICON_XL} viewBox="0 0 24 24" fill={!isSidebarCollapsed && activeTab === 'BOOKMARK' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={UI_STROKE_WIDTHS.BOLD} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span className={styles['nav-label']}>저장</span>
        </button>

        <button
          className={`${styles['nav-item']} ${!isSidebarCollapsed && activeTab === 'MORE' ? styles.active : ''}`}
          onClick={() => onTabSelect('MORE')}
          title="더보기"
        >
          <svg className={styles['nav-icon']} width={UI_SIZES.ICON_XL} height={UI_SIZES.ICON_XL} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={UI_STROKE_WIDTHS.BOLD} strokeLinecap="round">
            <circle cx="5" cy="12" r="1" fill="currentColor"></circle>
            <circle cx="12" cy="12" r="1" fill="currentColor"></circle>
            <circle cx="19" cy="12" r="1" fill="currentColor"></circle>
          </svg>
          <span className={styles['nav-label']}>더보기</span>
        </button>
      </div>
    </nav>
  );
}
