"use client";

import { useState } from 'react';

interface Schedule {
  id: number;
  schedule_type: string;
  start_date: string | null;
  end_date: string | null;
  raw_text: string | null;
  notes: string | null;
}

interface Detail {
  id: number;
  section_title: string;
  section_content: string;
  sort_order: number;
}

interface Limit {
  id: number;
  target_group: string | null;
  max_support_amount: number | null;
  deposit_limit: number | null;
  tenant_share: number | null;
  interest_rate: number | null;
  max_monthly_rent: number | null;
  notes: string | null;
}

interface Announcement {
  id: number;
  title: string;
  institution: string;
  subscription_type: string;
  doc_path: string;
  schedules: Schedule[];
  details: Detail[];
  limits: Limit[];
}

interface SidebarProps {
  announcements: Announcement[];
  activeAnnId: number | null;
  onSelectAnnouncement: (id: number | null) => void;
}

const formatMoney = (amount: number | null): string => {
  if (amount === null || amount === undefined) return '-';
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);
    return `${eok}억 ${man > 0 ? man.toLocaleString() + '만' : ''}원`;
  }
  if (amount >= 10000) {
    return `${(amount / 10000).toLocaleString()}만 원`;
  }
  return `${amount.toLocaleString()}원`;
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return dateStr;
  }
};

const formatInterestRate = (rate: number | null): string => {
  if (rate === null || rate === undefined) return '-';
  return `${rate.toFixed(1)}%`;
};

export default function Sidebar({ announcements, activeAnnId, onSelectAnnouncement }: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');
  
  // 개별 아코디언 확장 상태를 기록 (섹션별 아코디언 키: announcementId-sectionName)
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  // 실제 데이터에 존재하는 청약 유형(subscription_type)만 중복 없이 추출
  const uniqueTypes = Array.from(
    new Set(announcements.map(ann => ann.subscription_type))
  ).filter(Boolean);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCardClick = (annId: number) => {
    if (activeAnnId === annId) {
      onSelectAnnouncement(null); // 토글식 닫기
    } else {
      onSelectAnnouncement(annId);
    }
  };

  // 필터 및 검색 처리
  const filteredAnnouncements = announcements.filter(ann => {
    const matchesSearch = 
      ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ann.institution.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'ALL' || ann.subscription_type === activeTab;
    
    return matchesSearch && matchesTab;
  });

  return (
    <aside className="app-sidebar">
      {/* Search & Filter Header */}
      <div className="sidebar-search">
        <input 
          type="text" 
          placeholder="공고명 또는 공급기관 검색..." 
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="filter-tags">
          <span 
            className={`filter-tag ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            전체 ({announcements.length})
          </span>
          {uniqueTypes.map(type => (
            <span 
              key={type}
              className={`filter-tag ${activeTab === type ? 'active' : ''}`}
              onClick={() => setActiveTab(type)}
            >
              {type}
            </span>
          ))}
        </div>
      </div>

      {/* Announcement List */}
      <div className="sidebar-list">
        {filteredAnnouncements.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
            검색 결과와 일치하는 공고가 없습니다.
          </div>
        ) : (
          filteredAnnouncements.map((ann) => {
            const isActive = activeAnnId === ann.id;
            const badgeClass = ann.institution.includes('SH') ? 'badge-sh' : ann.institution.includes('LH') ? 'badge-lh' : 'badge-gh';
            
            return (
              <div 
                key={ann.id} 
                className={`announcement-card ${isActive ? 'active' : ''}`}
                onClick={() => handleCardClick(ann.id)}
              >
                {/* Card Top Details */}
                <div className="card-header">
                  <span className={`badge ${badgeClass}`}>{ann.institution}</span>
                  <span className="card-type">{ann.subscription_type}</span>
                </div>
                <h3 className="card-title">{ann.title}</h3>
                
                {/* Expanded Accordion Details */}
                {isActive && (
                  <div className="card-accordion" onClick={(e) => e.stopPropagation()}>
                    
                    {/* 1. 접수 및 발표 일정 */}
                    {ann.schedules && ann.schedules.length > 0 && (
                      <div className="accordion-section">
                        <div 
                          className="section-header" 
                          onClick={() => toggleSection(`${ann.id}-schedule`)}
                        >
                          <span>📅 청약 일정 안내</span>
                          <span>{expandedSections[`${ann.id}-schedule`] ? '▲' : '▼'}</span>
                        </div>
                        {expandedSections[`${ann.id}-schedule`] && (
                          <div className="section-content">
                            {ann.schedules.map((s) => (
                              <div key={s.id} className="schedule-item">
                                <div className="schedule-label">{s.schedule_type}</div>
                                <div className="schedule-val">
                                  {s.start_date || s.end_date ? (
                                    <>
                                      {formatDate(s.start_date)} ~ {formatDate(s.end_date)}
                                    </>
                                  ) : (
                                    s.raw_text || '공고 본문 참고'
                                  )}
                                  {s.notes && <div style={{ fontSize: '0.7rem', color: 'hsl(var(--accent-hover))', marginTop: '2px' }}>{s.notes}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. 임대 지원 및 한도 정보 */}
                    {ann.limits && ann.limits.length > 0 && (
                      <div className="accordion-section">
                        <div 
                          className="section-header" 
                          onClick={() => toggleSection(`${ann.id}-limits`)}
                        >
                          <span>💰 보증금 및 지원한도</span>
                          <span>{expandedSections[`${ann.id}-limits`] ? '▲' : '▼'}</span>
                        </div>
                        {expandedSections[`${ann.id}-limits`] && (
                          <div className="section-content">
                            <table className="limits-table">
                              <thead>
                                <tr>
                                  <th>대상군</th>
                                  <th>지원한도액</th>
                                  <th>이율/임대료</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ann.limits.map((l) => (
                                  <tr key={l.id}>
                                    <td>{l.target_group || '전체'}</td>
                                    <td>
                                      {l.max_support_amount ? formatMoney(l.max_support_amount) : '-'}
                                      {l.deposit_limit && <div style={{fontSize: '0.65rem', color: 'hsl(var(--text-muted))'}}>한도: {formatMoney(l.deposit_limit)}</div>}
                                    </td>
                                    <td>
                                      {l.interest_rate ? formatInterestRate(l.interest_rate) : '-'}
                                      {l.max_monthly_rent ? <div style={{fontSize: '0.65rem'}}>{formatMoney(l.max_monthly_rent)}/월</div> : ''}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. 공고 상세 내용 (FAQ 등) */}
                    {ann.details && ann.details.length > 0 && (
                      <div className="accordion-section">
                        <div 
                          className="section-header" 
                          onClick={() => toggleSection(`${ann.id}-details`)}
                        >
                          <span>💡 상세 안내 가이드</span>
                          <span>{expandedSections[`${ann.id}-details`] ? '▲' : '▼'}</span>
                        </div>
                        {expandedSections[`${ann.id}-details`] && (
                          <div className="section-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {ann.details.map((d) => (
                              <div key={d.id} style={{ borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px' }}>
                                <div style={{ fontWeight: '600', fontSize: '0.75rem', color: 'hsl(var(--accent-hover))', marginBottom: '4px' }}>
                                  Q. {d.section_title}
                                </div>
                                <div style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                                  {d.section_content}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
