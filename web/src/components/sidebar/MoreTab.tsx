"use client";

import React from 'react';
import styles from '../Sidebar.module.css';
import { UI_SIZES, UI_STROKE_WIDTHS, SECURITY_QUESTIONS } from '@/constants';

interface MoreTabProps {
  sheetHeight: number | null;
  minHeight: number;
  touchHandlers: any;
  style?: React.CSSProperties;
  member: any;
  isProfileOpen: boolean;
  setIsProfileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  profileError: string;
  setProfileError: (msg: string) => void;
  profileSuccess: string;
  setProfileSuccess: (msg: string) => void;
  profileCurPwd: string;
  setProfileCurPwd: (pwd: string) => void;
  profileNewPwd: string;
  setProfileNewPwd: (pwd: string) => void;
  profileNewPwdConfirm: string;
  setProfileNewPwdConfirm: (pwd: string) => void;
  isProfileSubmitting: boolean;
  handleProfileUpdate: (type: 'password' | 'security') => void;
  profileSecQ: string;
  setProfileSecQ: (q: string) => void;
  profileSecA: string;
  setProfileSecA: (a: string) => void;
  setAuthModalOpen: (open: boolean) => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
  setActiveModal: (modal: 'privacy' | 'terms' | null) => void;
}

export default function MoreTab({
  sheetHeight,
  minHeight,
  touchHandlers,
  style,
  member,
  isProfileOpen,
  setIsProfileOpen,
  profileError,
  setProfileError,
  profileSuccess,
  setProfileSuccess,
  profileCurPwd,
  setProfileCurPwd,
  profileNewPwd,
  setProfileNewPwd,
  profileNewPwdConfirm,
  setProfileNewPwdConfirm,
  isProfileSubmitting,
  handleProfileUpdate,
  profileSecQ,
  setProfileSecQ,
  profileSecA,
  setProfileSecA,
  setAuthModalOpen,
  toggleTheme,
  isDarkMode,
  setActiveModal,
}: MoreTabProps) {
  return (
    <div 
      className={styles['more-panel-container']}
      style={{ 
        height: sheetHeight ? `${sheetHeight}px` : undefined,
        '--sheet-min-height': `${minHeight}px`,
        ...style
      } as React.CSSProperties}
      {...touchHandlers}
    >
      {/* 모바일 화면 전용 상단 드래그 핸들바 */}
      <div className={styles['drag-handle-bar']} />

      <div 
        className={styles['more-list-container']}
        style={{ 
          overflowY: 'auto'
        } as React.CSSProperties}
      >
        {/* 회원정보 영역 */}
        {member ? (
          <div className={styles['more-profile-section']}>
            {/* 프로필 헤더 영역 - 클릭 시 아코디언 토글 */}
            <div
              className={`${styles['more-profile-header']} ${isProfileOpen ? styles['more-profile-header-open'] : ''}`}
              onClick={() => { setIsProfileOpen(v => !v); setProfileError(''); setProfileSuccess(''); }}
            >
              <div className={styles['more-profile-avatar']}>{member.id.charAt(0).toUpperCase()}</div>
              <div className={styles['more-profile-info']}>
                <span className={styles['more-profile-id']}>{member.id}</span>
                <span className={styles['more-profile-sub']}>회원정보 수정</span>
              </div>
              <svg
                className={`${styles['more-profile-chevron']} ${isProfileOpen ? styles['more-profile-chevron-open'] : ''}`}
                width={16} height={16} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {/* 아코디언 펼침 영역: 회원정보 수정 폼 */}
            {isProfileOpen && (
              <div className={styles['more-profile-body']}>
                {profileError && <div className={styles['profile-error-banner']}>{profileError}</div>}
                {profileSuccess && <div className={styles['profile-success-banner']}>{profileSuccess}</div>}

                {/* 비밀번호 변경 */}
                <div className={styles['profile-form-group']}>
                  <p className={styles['profile-form-title']}>비밀번호 변경</p>
                  <label className={styles['profile-label']}>현재 비밀번호</label>
                  <input
                    type="password"
                    className={styles['profile-input']}
                    placeholder="현재 비밀번호"
                    value={profileCurPwd}
                    onChange={e => setProfileCurPwd(e.target.value)}
                  />
                  <label className={styles['profile-label']}>새 비밀번호 <span className={styles['profile-hint']}>(6자 이상)</span></label>
                  <input
                    type="password"
                    className={styles['profile-input']}
                    placeholder="새 비밀번호"
                    value={profileNewPwd}
                    onChange={e => setProfileNewPwd(e.target.value)}
                  />
                  <label className={styles['profile-label']}>새 비밀번호 확인</label>
                  <input
                    type="password"
                    className={styles['profile-input']}
                    placeholder="새 비밀번호 재입력"
                    value={profileNewPwdConfirm}
                    onChange={e => setProfileNewPwdConfirm(e.target.value)}
                  />
                  <button
                    className={styles['profile-submit-btn']}
                    disabled={isProfileSubmitting}
                    onClick={() => handleProfileUpdate('password')}
                  >
                    {isProfileSubmitting ? '변경 중...' : '비밀번호 변경'}
                  </button>
                </div>

                {/* 보안 질문/답변 수정 */}
                <div className={styles['profile-form-group']}>
                  <p className={styles['profile-form-title']}>보안 질문/답변 수정</p>
                  <label className={styles['profile-label']}>질문 선택</label>
                  <select
                    className={styles['profile-input']}
                    value={profileSecQ}
                    onChange={e => setProfileSecQ(e.target.value)}
                  >
                    {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                  <label className={styles['profile-label']}>답변</label>
                  <input
                    type="text"
                    className={styles['profile-input']}
                    placeholder="보안 질문 답변"
                    value={profileSecA}
                    onChange={e => setProfileSecA(e.target.value)}
                  />
                  <button
                    className={styles['profile-submit-btn']}
                    disabled={isProfileSubmitting}
                    onClick={() => handleProfileUpdate('security')}
                  >
                    {isProfileSubmitting ? '변경 중...' : '질문/답변 변경'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles['guest-login-prompt']}>
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <p className={styles['guest-login-text']}>로그인 후 다양한<br />맞춤 서비스를 이용해보세요.</p>
            <button
              className={styles['guest-login-btn']}
              onClick={() => setAuthModalOpen(true)}
            >
              로그인하기
            </button>
          </div>
        )}

        <div className={styles['more-menu-group']}>
          <div className={styles['more-menu-item']} onClick={toggleTheme}>
            <span className={styles['more-menu-label']}>지도 모드</span>
            <div className={styles['more-menu-value-wrapper']}>
              <span className={styles['more-menu-value']}>{isDarkMode ? "다크 모드" : "라이트 모드"}</span>
              <div
                className={`${styles['theme-toggle-switch']} ${isDarkMode ? styles['dark'] : ''}`}
                role="switch"
                aria-checked={isDarkMode}
                title={isDarkMode ? "다크 모드로 설정됨" : "라이트 모드로 설정됨"}
              >
                <div className={styles['theme-toggle-knob']}>
                  {isDarkMode ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#facc15" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5"></circle>
                      <line x1="12" y1="1" x2="12" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="23"></line>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                      <line x1="1" y1="12" x2="3" y2="12"></line>
                      <line x1="21" y1="12" x2="23" y2="12"></line>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={styles['more-menu-item']} onClick={() => setActiveModal('terms')}>
            <span className={styles['more-menu-label']}>이용약관 및 정책</span>
            <span className={styles['more-menu-chevron']}>
              <svg width={UI_SIZES.ICON_XS} height={UI_SIZES.ICON_XS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={UI_STROKE_WIDTHS.BOLD} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </span>
          </div>
          <div className={styles['more-menu-item']} onClick={() => setActiveModal('privacy')}>
            <span className={styles['more-menu-label']}>개인정보처리방침</span>
            <span className={styles['more-menu-chevron']}>
              <svg width={UI_SIZES.ICON_XS} height={UI_SIZES.ICON_XS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={UI_STROKE_WIDTHS.BOLD} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </span>
          </div>
        </div>

        <div className={styles['more-info-box-wrapper']}>
          <div className={styles['info-box']}>
            <h4 className={styles['info-box-title']}>
              <svg className={styles['info-box-icon']} width={UI_SIZES.ICON_XS + 2} height={UI_SIZES.ICON_XS + 2} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={UI_STROKE_WIDTHS.MEDIUM} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              법적 고지 및 데이터 출처
            </h4>
            <p className={styles['info-box-desc']}>
              본 서비스의 주택 공급 정보와 일정은 LH, GH 등 공공기관의 공고문 데이터를 기반으로 제공됩니다.
            </p>
            <p className={styles['info-box-desc']}>
              정확한 청약 신청은 시행기관의 공식 홈페이지에서 최종 확인해 주시기 바라며, 제공 정보의 불일치로 인한 법적 책임은 지지 않습니다.
            </p>
          </div>
        </div>

        <div className={styles['more-footer']}>
          <p>&copy; 2026 공공맵 All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
