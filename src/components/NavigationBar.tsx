"use client";

import styles from './NavigationBar.module.css';

export type NavigationTabType = 'SEARCH' | 'CALENDAR' | 'BOOKMARK' | 'MORE';

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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
          <svg className={styles['nav-icon']} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
            <line x1="9" y1="22" x2="9" y2="16"></line>
            <line x1="15" y1="22" x2="15" y2="16"></line>
            <line x1="9" y1="16" x2="15" y2="16"></line>
            <path d="M9 6h6M9 10h6"></path>
          </svg>
          <span className={styles['nav-label']}>공고</span>
        </button>

        <button
          className={`${styles['nav-item']} ${!isSidebarCollapsed && activeTab === 'CALENDAR' ? styles.active : ''}`}
          onClick={() => onTabSelect('CALENDAR')}
          title="일정 달력"
        >
          <svg className={styles['nav-icon']} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span className={styles['nav-label']}>달력</span>
        </button>

        <button
          className={`${styles['nav-item']} ${!isSidebarCollapsed && activeTab === 'BOOKMARK' ? styles.active : ''}`}
          onClick={() => onTabSelect('BOOKMARK')}
          title="관심 주택"
        >
          <svg className={styles['nav-icon']} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span className={styles['nav-label']}>저장</span>
        </button>
      </div>

      {/* 하단 그룹 (설정 및 더보기, 프로필/메뉴 바둑판) */}
      <div className={styles['nav-group-bottom']}>
        <button
          className={`${styles['nav-item']} ${!isSidebarCollapsed && activeTab === 'MORE' ? styles.active : ''}`}
          onClick={() => onTabSelect('MORE')}
          title="더보기"
          style={{ marginBottom: '16px' }}
        >
          <svg className={styles['nav-icon']} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="5" cy="12" r="1" fill="currentColor"></circle>
            <circle cx="12" cy="12" r="1" fill="currentColor"></circle>
            <circle cx="19" cy="12" r="1" fill="currentColor"></circle>
          </svg>
          <span className={styles['nav-label']}>더보기</span>
        </button>

        <div className={styles['nav-footer-icons']}>
          <div className={styles['footer-icon-btn']} title="프로필">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div className={styles['footer-icon-btn']} title="메뉴">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </div>
        </div>
      </div>
    </nav>
  );
}
