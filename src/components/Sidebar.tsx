"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Announcement, ApplicationStatus, Complex } from '@/types';
import AnnouncementCard from '@/components/features/AnnouncementCard';
import ComplexCard from '@/components/features/ComplexCard';
import styles from './Sidebar.module.css';
import {
  HEADER_ACCORDION_MIN_HEIGHT,
  HEADER_ACCORDION_MAX_HEIGHT,
  HEADER_ACCORDION_DEFAULT_HEIGHT,
} from '@/constants';

interface SidebarProps {
  announcements: Announcement[];
  activeAnnId: number | null;
  onSelectAnnouncement: (id: number | null) => void;
  width?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  displayComplexes: Complex[];
  activeComplexId: number | null;
  onSelectComplex: (complex: Complex) => void;
  activeTab: 'SEARCH' | 'MORE';
  allComplexes: Complex[];
  style?: React.CSSProperties;
}

export default function Sidebar({ 
  announcements, activeAnnId, onSelectAnnouncement, 
  width, isCollapsed, onToggleCollapse,
  displayComplexes, activeComplexId, onSelectComplex,
  activeTab, allComplexes, style
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [complexSearchTerm, setComplexSearchTerm] = useState('');
  const [activeTabStatus, setActiveTabStatus] = useState<ApplicationStatus>('ONGOING');
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  
  // 높이 조절 상태 추가 (아코디언을 열었을 때 적용할 최대 높이 상태)
  const [headerHeight, setHeaderHeight] = useState(HEADER_ACCORDION_MAX_HEIGHT);
  const [isResizingHeader, setIsResizingHeader] = useState(false);



  // 다크 모드 상태
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dark = document.body.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
      setIsDarkMode(dark);
      if (dark) {
        document.body.classList.add('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        if (next) {
          document.body.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        } else {
          document.body.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        }
      }
      return next;
    });
  };

  // 모달 약관 노출 상태
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | null>(null);

  const startResizingHeader = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizingHeader(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';

    const startHeight = headerHeight;
    const startY = mouseDownEvent.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newHeight = Math.max(HEADER_ACCORDION_MIN_HEIGHT, Math.min(HEADER_ACCORDION_MAX_HEIGHT, startHeight + (moveEvent.clientY - startY)));
      setHeaderHeight(newHeight);
    };



    const handleMouseUp = () => {
      setIsResizingHeader(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const getAnnouncementStatus = (ann: Announcement): ApplicationStatus => {
    const applySchedules = ann.schedules.filter(s => s.schedule_type === '신청접수');
    if (applySchedules.length === 0) return 'CLOSED';
    let minStart: Date | null = null, maxEnd: Date | null = null;
    for (const s of applySchedules) {
      if (s.start_date) {
        const start = new Date(s.start_date);
        if (!isNaN(start.getTime())) { if (!minStart || start < minStart) minStart = start; }
      }
      if (s.end_date) {
        const end = new Date(s.end_date);
        if (!isNaN(end.getTime())) { if (!maxEnd || end > maxEnd) maxEnd = end; }
      }
    }
    if (!minStart || !maxEnd) return 'CLOSED';
    const now = new Date();
    if (now < minStart) return 'UPCOMING';
    else if (now >= minStart && now <= maxEnd) return 'ONGOING';
    else return 'CLOSED';
  };

  const getStatusCount = (status: ApplicationStatus) => announcements.filter(ann => getAnnouncementStatus(ann) === status).length;

  const toggleSection = (key: string, annId: number) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCardClick = (annId: number) => {
    if (activeAnnId === annId) return; 
    onSelectAnnouncement(annId);
  };



  const filteredComplexes = displayComplexes.filter(c => 
    c.name.toLowerCase().includes(complexSearchTerm.toLowerCase()) ||
    c.address.toLowerCase().includes(complexSearchTerm.toLowerCase())
  );

  const activeAnn = announcements.find(a => a.id === activeAnnId);

  // 아코디언이 하나라도 열려 있는지 체크
  const isAnyAccordionOpen = Object.values(expandedSections).some(isOpen => isOpen === true);

    // 드래그 중인 경우에는 마우스 위치를 따르고, 그 외에는 아코디언 개폐 여부에 따라 최대 높이(headerHeight)와 초기 높이(HEADER_ACCORDION_DEFAULT_HEIGHT)로 설정
  const currentHeaderHeight = isResizingHeader 
    ? headerHeight 
    : (isAnyAccordionOpen ? headerHeight : HEADER_ACCORDION_DEFAULT_HEIGHT);



  // 약관 상수 텍스트
  const PRIVACY_POLICY = `제 1 조 (목적)
본 방침은 공공맵(이하 '서비스')이 제공하는 위치기반 정보 서비스 및 회원 편의 서비스 이용과 관련하여 회사가 수집하는 개인정보의 처리 목적, 항목, 보유 기간 등을 규정함을 목적으로 합니다.

제 2 조 (수집하는 개인정보 항목 및 수집 방법)
서비스는 회원가입 없이 브라우저 로컬 저장소(localStorage)만을 활용하여 북마크 정보를 저장하므로, 별도의 개인식별정보(이름, 이메일, 전화번호 등)를 서버에 전송하거나 수집하지 않습니다. 다만, 이용 과정에서 IP 주소, 쿠키, 서비스 이용 기록 등이 자동 생성되어 수집될 수 있습니다.

제 3 조 (개인정보의 보유 및 이용기간)
이용자가 브라우저 캐시 및 로컬 저장소를 삭제할 때까지 북마크 데이터 등은 이용자의 기기에 유지됩니다. 서버에 저장되는 로그 데이터는 통계 분석 및 시스템 안정성 확보를 위해 3개월간 보관 후 복구 불가능한 방법으로 파기됩니다.`;

  const TERMS_OF_SERVICE = `제 1 조 (목적)
본 약관은 공공맵 서비스의 이용 조건 및 절차, 이용자와 서비스 제공자 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.

제 2 조 (용어의 정의)
1. "서비스"란 공공주택 공고문 및 단지 정보를 지도 위에 시각화하여 제공하는 웹 서비스를 의미합니다.
2. "이용자"란 본 약관에 동의하고 서비스를 이용하는 웹 브라우저 방문자를 의미합니다.

제 3 조 (서비스의 내용 및 변경)
1. 서비스는 LH, GH 등 공공기관이 공시한 공고문 데이터를 재구성하여 정보 제공 목적으로 제공합니다.
2. 실제 청약 접수 및 최종 당첨 여부는 해당 시행기관(LH 청약플러스, GH 청약센터 등)의 공식 사이트에서 직접 확인하셔야 하며, 서비스에서 발생하는 정보의 불일치로 인한 불이익에 대해 본 서비스는 법적 책임을 지지 않습니다.`;

  return (
    <aside 
      className={`${styles['app-sidebar']} ${isCollapsed ? styles.collapsed : ''}`} 
      style={{ 
        width: width ? `${width}px` : undefined,
        ...style
      }}
    >


      {/* 브랜드 로고 헤더 (모든 탭에서 공통 표시) */}
      <div className={styles['sidebar-brand']}>
        <div className={styles['brand-logo-wrap']}>
          <h1 className={styles['brand-title']}>공공맵</h1>
        </div>
        <span className={styles['brand-desc']}>공공청약 연동 서비스</span>
      </div>

      {/* 탭 분기 렌더링 */}
      {activeTab === 'SEARCH' && (
        activeAnnId === null ? (
          <>
            <div className={styles['sidebar-search']}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type="text" placeholder="공고명 또는 공급기관 검색..." 
                  className={styles['search-input']} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingRight: '32px' }}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      transition: 'color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className={styles['filter-tags']}>
                <span className={`${styles['filter-tag']} ${activeTabStatus === 'UPCOMING' ? styles.active : ''}`} onClick={() => setActiveTabStatus('UPCOMING')}>
                  접수 예정 ({getStatusCount('UPCOMING')})
                </span>
                <span className={`${styles['filter-tag']} ${activeTabStatus === 'ONGOING' ? styles.active : ''}`} onClick={() => setActiveTabStatus('ONGOING')}>
                  접수 중 ({getStatusCount('ONGOING')})
                </span>
                <span className={`${styles['filter-tag']} ${activeTabStatus === 'CLOSED' ? styles.active : ''}`} onClick={() => setActiveTabStatus('CLOSED')}>
                  마감 ({getStatusCount('CLOSED')})
                </span>
              </div>
            </div>
            <div className={styles['sidebar-list']}>
              {announcements.filter(ann => {
                const matchesSearch = ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || ann.institution.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesSearch && getAnnouncementStatus(ann) === activeTabStatus;
              }).length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>결과가 없습니다.</div>
              ) : (
                announcements.filter(ann => {
                  const matchesSearch = ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || ann.institution.toLowerCase().includes(searchTerm.toLowerCase());
                  return matchesSearch && getAnnouncementStatus(ann) === activeTabStatus;
                }).map((ann) => (
                  <AnnouncementCard
                    key={ann.id} ann={ann} isActive={false}
                    onClick={() => handleCardClick(ann.id)}
                    expandedSections={expandedSections} onToggleSection={(key) => toggleSection(key, ann.id)}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <div 
              style={{ 
                height: `${currentHeaderHeight}px`, 
                display: 'flex', 
                flexDirection: 'column', 
                backgroundColor: 'var(--bg-surface)',
                flexShrink: 0,
                overflow: 'hidden',
                marginBottom: '12px'
              }}
            >
              <div style={{ padding: '16px 16px 0 16px', flexShrink: 0 }}>
                <button 
                  onClick={() => onSelectAnnouncement(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', marginBottom: '12px' }}
                >
                  ← 다른 공고 목록으로
                </button>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 16px 16px' }}>
                {activeAnn && (
                  <AnnouncementCard
                    ann={activeAnn} isActive={true}
                    onClick={() => {}}
                    expandedSections={expandedSections} onToggleSection={(key) => toggleSection(key, activeAnn.id)}
                  />
                )}
              </div>
            </div>

            {isAnyAccordionOpen && (
              <div 
                onMouseDown={startResizingHeader}
                className={`${styles['header-resizer']} ${isResizingHeader ? styles.resizing : ''}`}
              />
            )}

            <div className={styles['sidebar-list']} style={{ backgroundColor: 'var(--bg-body)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingLeft: '4px', paddingRight: '4px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  공급 주택 목록 ({filteredComplexes.length})
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    placeholder="주택명 검색..." 
                    value={complexSearchTerm}
                    onChange={(e) => setComplexSearchTerm(e.target.value)}
                    style={{
                      width: '160px',
                      padding: '6px 28px 6px 10px',
                      fontSize: '0.8rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-light)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      transition: 'border-color 0.1s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                  />
                  {complexSearchTerm && (
                    <button 
                      onClick={() => setComplexSearchTerm('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2px',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              {filteredComplexes.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                  {complexSearchTerm ? '검색 결과가 없습니다.' : '이 공고는 특정 단지 없이 개별적으로 지원되는 전세임대형 정책이거나, 필터 조건에 맞는 주택이 없습니다.'}
                </div>
              ) : (
                filteredComplexes.map((complex) => (
                  <ComplexCard
                    key={complex.id}
                    complex={complex}
                    isActive={activeComplexId === complex.id}
                    onClick={() => onSelectComplex(complex)}
                  />
                ))
              )}
            </div>
          </>
        )
      )}



      {activeTab === 'MORE' && (
        <>
          {/* 프로필 영역 삭제됨 */}

          <div className={styles['more-list-container']}>
            {/* 설정 메뉴 목록 */}
            <div className={styles['more-menu-group']}>
              <div className={styles['more-menu-item']} onClick={toggleTheme}>
                <span className={styles['more-menu-label']}>지도 모드</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={styles['more-menu-value']}>{isDarkMode ? "다크 지도" : "기본 지도"}</span>
                  <span className={styles['more-menu-chevron']}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </span>
                </div>
              </div>

              <div className={styles['more-menu-item']} onClick={() => setActiveModal('terms')}>
                <span className={styles['more-menu-label']}>이용약관 및 정책</span>
                <span className={styles['more-menu-chevron']}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </span>
              </div>
              <div className={styles['more-menu-item']} onClick={() => setActiveModal('privacy')}>
                <span className={styles['more-menu-label']}>개인정보처리방침</span>
                <span className={styles['more-menu-chevron']}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </span>
              </div>

            </div>



            {/* 법적고지 안내 박스 */}
            <div className={styles['more-info-box-wrapper']}>
              <div className={styles['info-box']}>
                <h4 className={styles['info-box-title']}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px", verticalAlign: "middle", display: "inline-block" }}>
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
        </>
      )}

      {/* 팝업 모달 */}
      {activeModal && (
        <div className={styles['modal-backdrop']} onClick={() => setActiveModal(null)}>
          <div className={styles['modal-content']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h3 className={styles['modal-title']}>
                {activeModal === 'privacy' ? '개인정보처리방침' : '이용약관'}
              </h3>
              <button className={styles['modal-close-btn']} onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className={styles['modal-body']}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                {activeModal === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE}
              </pre>
            </div>
            <div className={styles['modal-footer']}>
              <button className={styles['modal-btn-confirm']} onClick={() => setActiveModal(null)}>확인</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}