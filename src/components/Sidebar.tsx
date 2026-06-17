"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Announcement, ApplicationStatus, Complex } from '@/types';
import AnnouncementCard from '@/components/features/AnnouncementCard';
import ComplexCard from '@/components/features/ComplexCard';
import styles from './Sidebar.module.css';

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
  const [activeTab, setActiveTab] = useState<ApplicationStatus>('ONGOING');
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

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

  const activeAnn = announcements.find(a => a.id === activeAnnId);

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
            <input 
              type="text" placeholder="공고명 또는 공급기관 검색..." 
              className={styles['search-input']} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
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
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-surface)' }}>
            <button 
              onClick={() => onSelectAnnouncement(null)}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', marginBottom: '12px' }}
            >
              ← 다른 공고 목록으로
            </button>
            {activeAnn && (
              <AnnouncementCard
                ann={activeAnn} isActive={true}
                onClick={() => {}}
                expandedSections={expandedSections} onToggleSection={(key) => toggleSection(key, activeAnn.id)}
              />
            )}
          </div>
          <div className={styles['sidebar-list']} style={{ backgroundColor: 'var(--bg-body)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', paddingLeft: '4px' }}>
              해당 공고의 공급 주택 목록 ({displayComplexes.length})
            </div>
            {displayComplexes.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                이 공고는 특정 단지 없이 개별적으로 지원되는 전세임대형 정책이거나, 필터 조건에 맞는 주택이 없습니다.
              </div>
            ) : (
              displayComplexes.map((complex) => (
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
