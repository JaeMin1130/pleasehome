"use client";

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import AboutPage from '@/app/about/AboutContent';
import TermsOfService from '@/app/terms/page';
import PrivacyPolicy from '@/app/privacy/page';
import authStyles from './AuthModal.module.css';
import styles from './PolicyModal.module.css';

export type PolicyPage = 'about' | 'terms' | 'privacy';

const PAGES = {
  about: { title: '서비스 소개', Content: AboutPage },
  terms: { title: '이용약관 및 정책', Content: TermsOfService },
  privacy: { title: '개인정보처리방침', Content: PrivacyPolicy },
};

// 더보기의 소개·약관을 지도 화면 위 팝업으로 보여준다 (새 탭 없이 보던 지도·필터 상태 유지). 본문은 각 페이지 컴포넌트를 그대로 재사용.
export default function PolicyModal({ page, onClose }: { page: PolicyPage | null; onClose: () => void }) {
  useEffect(() => {
    if (!page) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [page, onClose]);

  if (!page) return null;
  const { title, Content } = PAGES[page];

  // 바텀시트(transform) 안에서 렌더되면 fixed 오버레이가 시트 기준으로 잘리므로 body로 띄운다
  return createPortal(
    <div className={authStyles.overlay} onClick={onClose}>
      <div className={`${authStyles.modal} ${styles.modal}`} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className={authStyles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={authStyles.closeBtn} onClick={onClose} aria-label="닫기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className={styles.content}>
          <Content />
        </div>
      </div>
    </div>,
    document.body
  );
}
