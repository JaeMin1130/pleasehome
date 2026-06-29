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
  UI_SIZES,
  UI_STROKE_WIDTHS,
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
  
  // 높이 조절 상태 추가 (기본 높이로 초기화)
  const [headerHeight, setHeaderHeight] = useState(HEADER_ACCORDION_DEFAULT_HEIGHT);
  const [isResizingHeader, setIsResizingHeader] = useState(false);

  // 공급 주택 목록 개폐 상태 추가
  const [isComplexListOpen, setIsComplexListOpen] = useState(false);

  useEffect(() => {
    setIsComplexListOpen(false);
  }, [activeAnnId]);



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
    const applySchedules = ann.schedules.filter(s => s.schedule_type.includes('신청접수'));
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

  const getAnnouncementMinStart = (ann: Announcement): Date | null => {
    const applySchedules = ann.schedules.filter(s => s.schedule_type.includes('신청접수'));
    if (applySchedules.length === 0) return null;
    let minStart: Date | null = null;
    for (const s of applySchedules) {
      if (s.start_date) {
        const start = new Date(s.start_date);
        if (!isNaN(start.getTime())) {
          if (!minStart || start < minStart) minStart = start;
        }
      }
    }
    return minStart;
  };

  const getAnnouncementMaxEnd = (ann: Announcement): Date | null => {
    const applySchedules = ann.schedules.filter(s => s.schedule_type.includes('신청접수'));
    if (applySchedules.length === 0) return null;
    let maxEnd: Date | null = null;
    for (const s of applySchedules) {
      if (s.end_date) {
        const end = new Date(s.end_date);
        if (!isNaN(end.getTime())) {
          if (!maxEnd || end > maxEnd) maxEnd = end;
        }
      }
    }
    return maxEnd;
  };

  const getSortedAnnouncements = () => {
    const filtered = announcements.filter(ann => {
      const matchesSearch = ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            ann.institution.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch && getAnnouncementStatus(ann) === activeTabStatus;
    });

    if (activeTabStatus === 'UPCOMING') {
      return [...filtered].sort((a, b) => {
        const startA = getAnnouncementMinStart(a);
        const startB = getAnnouncementMinStart(b);
        if (!startA && !startB) return 0;
        if (!startA) return 1;
        if (!startB) return -1;
        return startA.getTime() - startB.getTime();
      });
    }

    if (activeTabStatus === 'ONGOING') {
      return [...filtered].sort((a, b) => {
        const endA = getAnnouncementMaxEnd(a);
        const endB = getAnnouncementMaxEnd(b);
        if (!endA && !endB) return 0;
        if (!endA) return 1;
        if (!endB) return -1;
        return endA.getTime() - endB.getTime();
      });
    }

    if (activeTabStatus === 'CLOSED') {
      return [...filtered].sort((a, b) => {
        const endA = getAnnouncementMaxEnd(a);
        const endB = getAnnouncementMaxEnd(b);
        if (!endA && !endB) return 0;
        if (!endA) return 1;
        if (!endB) return -1;
        return endB.getTime() - endA.getTime();
      });
    }

    return filtered;
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

    // 드래그 조절된 높이값을 아코디언 개폐 여부와 무관하게 항상 사용
  const currentHeaderHeight = headerHeight;



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
              <div className={styles['search-wrapper']}>
                <input 
                  type="text" placeholder="공고명 또는 공급기관 검색..." 
                  className={styles['search-input']} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className={styles['clear-btn']}
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
                  접수 마감 ({getStatusCount('CLOSED')})
                </span>
              </div>
            </div>
            <div className={styles['sidebar-list']}>
              {getSortedAnnouncements().length === 0 ? (
                <div className={styles['empty-msg']}>결과가 없습니다.</div>
              ) : (
                getSortedAnnouncements().map((ann) => (
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
          <div className={styles['sidebar-content']}>
            <div 
              className={styles['announcement-detail-wrapper']}
              style={isComplexListOpen ? {
                height: `${currentHeaderHeight}px`,
                flex: 'none',
                marginBottom: 'calc(var(--spacing-md) * 0.75)',
                transition: isResizingHeader
                  ? 'none'
                  : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              } : {
                height: 'calc(100% - 50px)',
                flex: 'none',
                marginBottom: '0px',
                transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <div className={styles['announcement-detail-header']}>
                <button 
                  onClick={() => onSelectAnnouncement(null)}
                  className={styles['back-btn']}
                >
                  ← 다른 공고 목록으로
                </button>
              </div>
              <div className={styles['announcement-detail-body']}>
                {activeAnn && (
                  <AnnouncementCard
                    ann={activeAnn} isActive={true}
                    onClick={() => {}}
                    expandedSections={expandedSections} onToggleSection={(key) => toggleSection(key, activeAnn.id)}
                  />
                )}
              </div>
            </div>

            {isComplexListOpen && (
              <div 
                onMouseDown={startResizingHeader}
                className={`${styles['header-resizer']} ${isResizingHeader ? styles.resizing : ''}`}
              />
            )}

            <div 
              className={styles['sidebar-list']}
              style={isComplexListOpen ? {
                height: `calc(100% - ${currentHeaderHeight}px - 50px - 4px - 12px)`,
                flex: 'none',
                minHeight: 0,
                opacity: 1,
                overflowY: 'auto',
                transition: isResizingHeader
                  ? 'none'
                  : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease'
              } : {
                height: '0px',
                flex: 'none',
                minHeight: 0,
                opacity: 0,
                overflowY: 'hidden',
                paddingTop: 0,
                paddingBottom: 0,
                borderTopWidth: 0,
                borderBottomWidth: 0,
                transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, padding 0.3s ease, border 0.3s ease'
              }}
            >
              <div className={styles['complex-list-header']}>
                <div className={styles['complex-list-title']}>
                  공급 주택 목록 ({filteredComplexes.length})
                </div>
                <div className={styles['complex-search-wrapper']}>
                  <input 
                    type="text" 
                    placeholder="주택명 검색..." 
                    value={complexSearchTerm}
                    onChange={(e) => setComplexSearchTerm(e.target.value)}
                    className={styles['complex-search-input']}
                  />
                  {complexSearchTerm && (
                    <button 
                      onClick={() => setComplexSearchTerm('')}
                      className={styles['complex-clear-btn']}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              {filteredComplexes.length === 0 ? (
                <div className={styles['complex-empty-msg']}>
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

            <button 
              className={styles['complex-list-trigger-btn']}
              onClick={() => setIsComplexListOpen(!isComplexListOpen)}
            >
              {isComplexListOpen ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                  공급 주택 목록 접기
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  공급 주택 목록 열기
                </>
              )}
            </button>
          </div>
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
                <div className={styles['more-menu-value-wrapper']}>
                  <span className={styles['more-menu-value']}>{isDarkMode ? "다크 지도" : "기본 지도"}</span>
                  <span className={styles['more-menu-chevron']}>
                    <svg width={UI_SIZES.ICON_XS} height={UI_SIZES.ICON_XS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={UI_STROKE_WIDTHS.BOLD} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </span>
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



            {/* 법적고지 안내 박스 */}
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
              <pre className={styles['modal-pre']}>
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