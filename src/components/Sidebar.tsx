"use client";

import { useState } from 'react';
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
  // 새로 추가된 데이터
  displayComplexes: Complex[];
  activeComplexId: number | null;
  onSelectComplex: (complex: Complex) => void;
}

export default function Sidebar({ 
  announcements, activeAnnId, onSelectAnnouncement, 
  width, isCollapsed, onToggleCollapse,
  displayComplexes, activeComplexId, onSelectComplex 
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [complexSearchTerm, setComplexSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<ApplicationStatus>('ONGOING');
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  
  // 높이 조절 상태 추가 (아코디언을 열었을 때 적용할 최대 높이 상태)
  const [headerHeight, setHeaderHeight] = useState(HEADER_ACCORDION_MAX_HEIGHT);
  const [isResizingHeader, setIsResizingHeader] = useState(false);

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

  const filteredAnnouncements = announcements.filter(ann => {
    const matchesSearch = ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || ann.institution.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && getAnnouncementStatus(ann) === activeTab;
  });

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


  return (
    <aside 
      className={`${styles['app-sidebar']} ${isCollapsed ? styles.collapsed : ''}`} 
      style={{ width: width ? `${width}px` : undefined }}
    >
      {onToggleCollapse && (
        <button className={styles['sidebar-toggle-btn']} onClick={onToggleCollapse}>
          {isCollapsed ? '▶' : '◀'}
        </button>
      )}

      <div className={styles['sidebar-brand']}>
        <div className={styles['brand-logo-wrap']}>
          <span className={styles['brand-icon']}>🏢</span>
          <h1 className={styles['brand-title']}>공공맵</h1>
        </div>
        <span className={styles['brand-desc']}>공공청약 연동 서비스</span>
      </div>

      {/* 모드 1: 공고 목록 모드 */}
      {activeAnnId === null ? (
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
              <span className={`${styles['filter-tag']} ${activeTab === 'UPCOMING' ? styles.active : ''}`} onClick={() => setActiveTab('UPCOMING')}>
                접수 예정 ({getStatusCount('UPCOMING')})
              </span>
              <span className={`${styles['filter-tag']} ${activeTab === 'ONGOING' ? styles.active : ''}`} onClick={() => setActiveTab('ONGOING')}>
                접수 중 ({getStatusCount('ONGOING')})
              </span>
              <span className={`${styles['filter-tag']} ${activeTab === 'CLOSED' ? styles.active : ''}`} onClick={() => setActiveTab('CLOSED')}>
                마감 ({getStatusCount('CLOSED')})
              </span>
            </div>
          </div>
          <div className={styles['sidebar-list']}>
            {filteredAnnouncements.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>결과가 없습니다.</div>
            ) : (
              filteredAnnouncements.map((ann) => (
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
        /* 모드 2: 단지 드릴다운 상세 모드 */
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

          {/* 높이 조절 리사이저 바 - 아코디언이 열렸을 때만 표시 */}
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
      )}

      <div className={styles['sidebar-footer']}>
        <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>개인정보처리방침</Link>
        <span>|</span>
        <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>이용약관</Link>
      </div>
    </aside>
  );
}
