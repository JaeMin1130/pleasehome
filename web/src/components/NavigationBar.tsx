"use client";

import { useState, useRef, useEffect } from 'react';
import styles from './NavigationBar.module.css';
import { UI_SIZES, UI_STROKE_WIDTHS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/ui/AuthModal';

export type NavigationTabType = 'SEARCH' | 'COMPLEX' | 'BOOKMARK' | 'MORE';
 
interface NavigationBarProps {
  activeTab: NavigationTabType | null;
  isSidebarCollapsed: boolean;
  onTabSelect: (tab: NavigationTabType | null) => void;
}
 
export default function NavigationBar({
  activeTab,
  isSidebarCollapsed,
  onTabSelect,
}: NavigationBarProps) {
  const { member, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // 프로필 메뉴 외부 클릭(데스크톱) 및 터치(모바일) 시 자동 닫힘
  useEffect(() => {
    if (!showProfileMenu) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [showProfileMenu]);

  return (
    <>
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
                    {member ? (
            <div className={styles['profile-wrapper']} ref={profileRef}>
              <button
                id="nav-profile-btn"
                className={styles['nav-item']}
                onClick={() => setShowProfileMenu(v => !v)}
                title={`${member.id} 님`}
              >
                <div className={styles['avatar']}>
                  {member.id.charAt(0).toUpperCase()}
                </div>
                <span className={styles['nav-label']} style={{ maxWidth: 40, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                  {member.id}
                </span>
              </button>
              {showProfileMenu && (
                <div className={styles['profile-menu']}>
                  <div className={styles['profile-menu-id']}>{member.id}</div>
                  <button
                    id="nav-logout-btn"
                    className={styles['profile-menu-item']}
                    onClick={async () => { setShowProfileMenu(false); await logout(); }}
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              id="nav-login-btn"
              className={styles['nav-item']}
              onClick={() => setAuthModalOpen(true)}
              title="로그인"
            >
              <svg className={styles['nav-icon']} width={UI_SIZES.ICON_XL} height={UI_SIZES.ICON_XL} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={UI_STROKE_WIDTHS.NORMAL} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              <span className={styles['nav-label']}>로그인</span>
            </button>
          )}
          <button
            className={`${styles['nav-item']} ${activeTab === 'SEARCH' ? styles.active : ''}`}
            onClick={() => onTabSelect(activeTab === 'SEARCH' ? null : 'SEARCH')}
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
            className={`${styles['nav-item']} ${activeTab === 'COMPLEX' ? styles.active : ''}`}
            onClick={() => onTabSelect(activeTab === 'COMPLEX' ? null : 'COMPLEX')}
            title="단지 탐색"
          >
            <svg className={styles['nav-icon']} width={UI_SIZES.ICON_XL} height={UI_SIZES.ICON_XL} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={UI_STROKE_WIDTHS.BOLD} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span className={styles['nav-label']}>단지</span>
          </button>
 
          <button
            className={`${styles['nav-item']} ${activeTab === 'BOOKMARK' ? styles.active : ''}`}
            onClick={() => onTabSelect(activeTab === 'BOOKMARK' ? null : 'BOOKMARK')}
            title="저장한 단지"
          >
            <svg className={styles['nav-icon']} width={UI_SIZES.ICON_XL} height={UI_SIZES.ICON_XL} viewBox="0 0 24 24" fill={activeTab === 'BOOKMARK' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={UI_STROKE_WIDTHS.BOLD} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span className={styles['nav-label']}>저장</span>
          </button>
 
          <button
            className={`${styles['nav-item']} ${activeTab === 'MORE' ? styles.active : ''}`}
            onClick={() => onTabSelect(activeTab === 'MORE' ? null : 'MORE')}
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

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
