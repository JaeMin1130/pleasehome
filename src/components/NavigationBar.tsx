"use client";

import styles from './NavigationBar.module.css';
import { UI_SIZES, UI_STROKE_WIDTHS } from '@/constants';

export type NavigationTabType = 'SEARCH' | 'MORE';

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
        <div className={styles['nav-brand']}>
          {/* 공공맵 고유의 미니멀한 SVG 지도 로고 */}
          <svg width={UI_SIZES.ICON_LG - 2} height={UI_SIZES.ICON_LG - 2} viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth={UI_STROKE_WIDTHS.BOLD} strokeLinecap="round" strokeLinejoin="round">
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
          <svg className={styles['nav-icon']} width={UI_SIZES.ICON_MD} height={UI_SIZES.ICON_MD} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={UI_STROKE_WIDTHS.THICK} strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
            <line x1="9" y1="22" x2="9" y2="16"></line>
            <line x1="15" y1="22" x2="15" y2="16"></line>
            <line x1="9" y1="16" x2="15" y2="16"></line>
            <path d="M9 6h6M9 10h6"></path>
          </svg>
          <span className={styles['nav-label']}>공고</span>
        </button>

        <button
          className={`${styles['nav-item']} ${!isSidebarCollapsed && activeTab === 'MORE' ? styles.active : ''}`}
          onClick={() => onTabSelect('MORE')}
          title="더보기"
        >
          <svg className={styles['nav-icon']} width={UI_SIZES.ICON_MD} height={UI_SIZES.ICON_MD} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={UI_STROKE_WIDTHS.BOLD} strokeLinecap="round">
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
