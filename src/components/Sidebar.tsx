"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Announcement, ApplicationStatus } from '@/types';
import AnnouncementCard from '@/components/features/AnnouncementCard';
import styles from './Sidebar.module.css';

interface SidebarProps {
  announcements: Announcement[];
  activeAnnId: number | null;
  onSelectAnnouncement: (id: number | null) => void;
  width?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ announcements, activeAnnId, onSelectAnnouncement, width, isCollapsed, onToggleCollapse }: SidebarProps) {
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
    setExpandedSections(prev => {
      const nextState = !prev[key];
      if (nextState) {
        setTimeout(() => { document.getElementById(`ann-card-${annId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
      }
      return { ...prev, [key]: nextState };
    });
  };

  const handleCardClick = (annId: number) => {
    if (activeAnnId === annId) onSelectAnnouncement(null);
    else {
      onSelectAnnouncement(annId);
      setTimeout(() => { document.getElementById(`ann-card-${annId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
    }
  };

  const filteredAnnouncements = announcements.filter(ann => {
    const matchesSearch = ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || ann.institution.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && getAnnouncementStatus(ann) === activeTab;
  });

  return (
    <aside 
      className={`${styles['app-sidebar']} ${isCollapsed ? styles.collapsed : ''}`} 
      style={{ width: width ? `${width}px` : undefined, marginLeft: isCollapsed ? `-${width}px` : '0px' }}
    >
      {onToggleCollapse && (
        <button className={styles['sidebar-toggle-btn']} onClick={onToggleCollapse}>
          {isCollapsed ? '〉' : '〈'}
        </button>
      )}
      
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
              key={ann.id} ann={ann} isActive={activeAnnId === ann.id}
              onClick={() => handleCardClick(ann.id)}
              expandedSections={expandedSections} onToggleSection={(key) => toggleSection(key, ann.id)}
            />
          ))
        )}
      </div>

      <div className={styles['sidebar-footer']}>
        <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>개인정보처리방침</Link>
        <span>|</span>
        <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>이용약관</Link>
      </div>
    </aside>
  );
}
