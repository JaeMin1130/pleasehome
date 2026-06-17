"use client";

import { useState } from 'react';
import Link from 'next/link';

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

// 인라인 마크다운 (볼드, 이탤릭, 인라인 코드, 링크) 파싱 및 토큰화 헬퍼 함수
const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  if (!text) return [];
  
  // 1. 초기 텍스트 노드 상태 정의
  let parts: { type: 'text' | 'bold' | 'italic' | 'code' | 'link'; content: string; url?: string }[] = [
    { type: 'text', content: text }
  ];

  // 2. 볼드 처리 (**bold**)
  parts = parts.flatMap(part => {
    if (part.type !== 'text') return [part];
    const subParts = part.content.split(/(\*\*.*?\*\*)/g);
    return subParts.map(sp => {
      if (sp.startsWith('**') && sp.endsWith('**')) {
        return { type: 'bold', content: sp.slice(2, -2) };
      }
      return { type: 'text', content: sp };
    });
  });

  // 3. 이탤릭 처리 (*italic* 또는 _italic_)
  parts = parts.flatMap(part => {
    if (part.type !== 'text') return [part];
    const subParts = part.content.split(/(\*.*?\*|__.*?__|_.*?_)/g);
    return subParts.map(sp => {
      if ((sp.startsWith('*') && sp.endsWith('*')) || (sp.startsWith('_') && sp.endsWith('_'))) {
        const trimChar = sp.startsWith('*') ? '*' : '_';
        // 감싸진 기호를 제거한 본문만 추출
        const cleanContent = sp.slice(1, -1);
        return { type: 'italic', content: cleanContent };
      }
      return { type: 'text', content: sp };
    });
  });

  // 4. 인라인 코드 처리 (`code`)
  parts = parts.flatMap(part => {
    if (part.type !== 'text') return [part];
    const subParts = part.content.split(/(`.*?`)/g);
    return subParts.map(sp => {
      if (sp.startsWith('`') && sp.endsWith('`')) {
        return { type: 'code', content: sp.slice(1, -1) };
      }
      return { type: 'text', content: sp };
    });
  });

  // 5. 링크 처리 ([text](url))
  parts = parts.flatMap(part => {
    if (part.type !== 'text') return [part];
    const subParts = part.content.split(/(\[.*?\]\(.*?\))/g);
    return subParts.map(sp => {
      const match = sp.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        return { type: 'link', content: match[1], url: match[2] };
      }
      return { type: 'text', content: sp };
    });
  });

  // 6. 각 토큰 타입을 React 컴포넌트로 스타일링하여 맵핑
  return parts.map((part, idx) => {
    switch (part.type) {
      case 'bold':
        return (
          <strong key={idx} style={{ fontWeight: '700', color: 'hsl(var(--text-primary))' }}>
            {part.content}
          </strong>
        );
      case 'italic':
        return (
          <em key={idx} style={{ fontStyle: 'italic', color: 'hsl(var(--text-primary))' }}>
            {part.content}
          </em>
        );
      case 'code':
        return (
          <code 
            key={idx} 
            style={{ 
              backgroundColor: 'hsl(var(--accent) / 0.15)', 
              padding: '2px 5px', 
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.85em',
              color: 'hsl(var(--text-primary))'
            }}
          >
            {part.content}
          </code>
        );
      case 'link':
        return (
          <a 
            key={idx} 
            href={part.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ 
              color: 'hsl(var(--accent-hover))', 
              textDecoration: 'underline' 
            }}
          >
            {part.content}
          </a>
        );
      default:
        return part.content;
    }
  });
};

// 블록 단위 마크다운 (제목, 불릿 목록, 순서 있는 목록, 수평선, 표, 문단) 파싱 및 렌더링 함수
const renderMarkdown = (text: string): React.ReactNode => {
  if (!text) return null;
  
  const lines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];
  
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (key: string | number) => {
    if (tableRows.length === 0) return null;
    
    let hasHeader = false;
    let headerRow: string[] = [];
    let bodyRows: string[][] = [];
    
    if (tableRows.length >= 2) {
      // 각 셀이 오직 콜론(:), 하이픈(-), 공백(\s)으로만 이루어져 있는지 안전하게 검사
      const isDivider = tableRows[1].every(cell => /^[:\-\s]+$/.test(cell.trim()));
      if (isDivider) {
        hasHeader = true;
        headerRow = tableRows[0];
        bodyRows = tableRows.slice(2);
      } else {
        bodyRows = tableRows;
      }
    } else {
      bodyRows = tableRows;
    }

    const R = bodyRows.length;
    const C = R > 0 ? bodyRows[0].length : 0;
    const rowSpans = Array.from({ length: R }, () => Array(C).fill(1));
    const showCell = Array.from({ length: R }, () => Array(C).fill(true));

    // 첫 번째 열(c = 0, 평가항목)에 대해 연속 동일 텍스트 세로 병합 계산
    if (C > 0) {
      let r = 0;
      while (r < R) {
        let span = 1;
        const currentText = bodyRows[r][0].trim();
        if (currentText !== '') {
          while (
            r + span < R && 
            bodyRows[r + span][0].trim() === currentText
          ) {
            rowSpans[r][0] = span + 1;
            showCell[r + span][0] = false;
            span++;
          }
        }
        r += span;
      }
    }

    const element = (
      <div key={key} style={{ overflowX: 'auto', margin: '8px 0', width: '100%' }}>
        <table 
          style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '0.72rem', 
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--text-secondary))'
          }}
        >
          {hasHeader && (
            <thead>
              <tr style={{ backgroundColor: 'hsl(var(--accent) / 0.08)', borderBottom: '2px solid hsl(var(--border))' }}>
                {headerRow.map((cell, cIdx) => (
                  <th 
                    key={cIdx} 
                    style={{ 
                      padding: '6px 8px', 
                      textAlign: 'left', 
                      fontWeight: '700',
                      borderRight: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--text-primary))'
                    }}
                  >
                    {parseInlineMarkdown(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {bodyRows.map((row, rIdx) => (
              <tr 
                key={rIdx} 
                style={{ 
                  borderBottom: '1px solid hsl(var(--border))',
                  backgroundColor: rIdx % 2 === 1 ? 'hsl(var(--accent) / 0.02)' : 'transparent'
                }}
              >
                {row.map((cell, cIdx) => {
                  if (!showCell[rIdx][cIdx]) return null;
                  
                  return (
                    <td 
                      key={cIdx} 
                      rowSpan={rowSpans[rIdx][cIdx]}
                      style={{ 
                        padding: '5px 8px',
                        borderRight: '1px solid hsl(var(--border))',
                        lineHeight: '1.45',
                        verticalAlign: 'middle',
                        backgroundColor: rowSpans[rIdx][cIdx] > 1 ? 'hsl(var(--accent) / 0.04)' : undefined
                      }}
                    >
                      {parseInlineMarkdown(cell.trim())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    
    tableRows = [];
    inTable = false;
    return element;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const content = line.trim();
    
    // 수평선 (Horizontal Rule) 감지 (---, ***, ___ 등)
    if (content === '---' || content === '***' || content === '___') {
      if (inTable) {
        const tableElement = flushTable(`table-${i}`);
        if (tableElement) renderedElements.push(tableElement);
      }
      renderedElements.push(
        <hr 
          key={`hr-${i}`} 
          style={{ 
            border: 'none', 
            borderTop: '1px solid hsl(var(--border))', 
            margin: '12px 0 8px 0' 
          }} 
        />
      );
      i++;
      continue;
    }
    
    const isTableRow = content.startsWith('|') && content.endsWith('|');
    
    if (isTableRow) {
      inTable = true;
      const cells = content.slice(1, -1).split('|');
      tableRows.push(cells);
      i++;
      continue;
    } else {
      if (inTable) {
        const tableElement = flushTable(`table-${i}`);
        if (tableElement) renderedElements.push(tableElement);
      }
    }
    
    // 1. Headers (### or ####)
    const headerMatch = content.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const titleText = headerMatch[2];
      const parsedTitle = parseInlineMarkdown(titleText);
      
      if (level <= 3) {
        renderedElements.push(
          <h4 
            key={`h-${i}`} 
            style={{ 
              fontSize: '0.8rem', 
              fontWeight: '700', 
              margin: '12px 0 6px 0', 
              color: 'hsl(var(--text-primary))',
              borderBottom: '1px solid hsl(var(--border))',
              paddingBottom: '4px'
            }}
          >
            {parsedTitle}
          </h4>
        );
      } else {
        renderedElements.push(
          <h5 
            key={`h-${i}`} 
            style={{ 
              fontSize: '0.75rem', 
              fontWeight: '700', 
              margin: '8px 0 4px 0', 
              color: 'hsl(var(--text-primary))' 
            }}
          >
            {parsedTitle}
          </h5>
        );
      }
      i++;
      continue;
    }
    
    // 2. Unordered lists (- or *)
    const listMatch = content.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      const listText = listMatch[1];
      renderedElements.push(
        <div 
          key={`li-${i}`} 
          style={{ 
            display: 'flex', 
            gap: '6px', 
            paddingLeft: '4px', 
            margin: '2px 0', 
            fontSize: '0.75rem', 
            lineHeight: '1.4' 
          }}
        >
          <span style={{ color: 'hsl(var(--accent-hover))', userSelect: 'none' }}>•</span>
          <div style={{ color: 'hsl(var(--text-secondary))' }}>{parseInlineMarkdown(listText)}</div>
        </div>
      );
      i++;
      continue;
    }

    // 3. Ordered lists (1. 2. 3.)
    const orderedListMatch = content.match(/^(\d+)\.\s+(.*)$/);
    if (orderedListMatch) {
      const num = orderedListMatch[1];
      const listText = orderedListMatch[2];
      renderedElements.push(
        <div 
          key={`ol-${i}`} 
          style={{ 
            display: 'flex', 
            gap: '6px', 
            paddingLeft: '4px', 
            margin: '2px 0', 
            fontSize: '0.75rem', 
            lineHeight: '1.4' 
          }}
        >
          <span style={{ color: 'hsl(var(--accent-hover))', fontWeight: '700', userSelect: 'none' }}>
            {num}.
          </span>
          <div style={{ color: 'hsl(var(--text-secondary))' }}>
            {parseInlineMarkdown(listText)}
          </div>
        </div>
      );
      i++;
      continue;
    }
    
    // 4. Empty lines
    if (content === '') {
      renderedElements.push(<div key={`empty-${i}`} style={{ height: '4px' }} />);
      i++;
      continue;
    }
    
    // 5. Regular paragraph
    renderedElements.push(
      <p 
        key={`p-${i}`} 
        style={{ 
          fontSize: '0.75rem', 
          margin: '2px 0', 
          lineHeight: '1.4', 
          color: 'hsl(var(--text-secondary))' 
        }}
      >
        {parseInlineMarkdown(content)}
      </p>
    );
    
    i++;
  }
  
  if (inTable) {
    const tableElement = flushTable(`table-end`);
    if (tableElement) renderedElements.push(tableElement);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
      {renderedElements}
    </div>
  );
};

type ApplicationStatus = 'UPCOMING' | 'ONGOING' | 'CLOSED';

export default function Sidebar({ announcements, activeAnnId, onSelectAnnouncement }: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<ApplicationStatus>('ONGOING');
  
  // 개별 아코디언 확장 상태를 기록 (섹션별 아코디언 키: announcementId-sectionName)
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  // 청약 접수 일정을 기준으로 각 공고의 현재 청약 상태를 계산하는 헬퍼 함수
  const getAnnouncementStatus = (ann: Announcement): ApplicationStatus => {
    const applySchedules = ann.schedules.filter(s => s.schedule_type === '신청접수');
    if (applySchedules.length === 0) return 'CLOSED';

    let minStart: Date | null = null;
    let maxEnd: Date | null = null;

    for (const s of applySchedules) {
      if (s.start_date) {
        const start = new Date(s.start_date);
        if (!isNaN(start.getTime())) {
          if (!minStart || start < minStart) minStart = start;
        }
      }
      if (s.end_date) {
        const end = new Date(s.end_date);
        if (!isNaN(end.getTime())) {
          if (!maxEnd || end > maxEnd) maxEnd = end;
        }
      }
    }

    if (!minStart || !maxEnd) return 'CLOSED';

    const now = new Date();
    if (now < minStart) {
      return 'UPCOMING';
    } else if (now >= minStart && now <= maxEnd) {
      return 'ONGOING';
    } else {
      return 'CLOSED';
    }
  };

  // 각 접수 상태별 전체 공고 개수를 집계하는 헬퍼 함수
  const getStatusCount = (status: ApplicationStatus): number => {
    return announcements.filter(ann => getAnnouncementStatus(ann) === status).length;
  };

  const toggleSection = (key: string, annId: number) => {
    setExpandedSections(prev => {
      const nextState = !prev[key];
      if (nextState) {
        setTimeout(() => {
          const cardEl = document.getElementById(`ann-card-${annId}`);
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      }
      return {
        ...prev,
        [key]: nextState
      };
    });
  };

  const handleCardClick = (annId: number) => {
    if (activeAnnId === annId) {
      onSelectAnnouncement(null); // 토글식 닫기
    } else {
      onSelectAnnouncement(annId);
      setTimeout(() => {
        const cardEl = document.getElementById(`ann-card-${annId}`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  };

  // 필터 및 검색 처리
  const filteredAnnouncements = announcements.filter(ann => {
    const matchesSearch = 
      ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ann.institution.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = getAnnouncementStatus(ann) === activeTab;
    
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
            className={`filter-tag ${activeTab === 'UPCOMING' ? 'active' : ''}`}
            onClick={() => setActiveTab('UPCOMING')}
          >
            접수 예정 ({getStatusCount('UPCOMING')})
          </span>
          <span 
            className={`filter-tag ${activeTab === 'ONGOING' ? 'active' : ''}`}
            onClick={() => setActiveTab('ONGOING')}
          >
            접수 중 ({getStatusCount('ONGOING')})
          </span>
          <span 
            className={`filter-tag ${activeTab === 'CLOSED' ? 'active' : ''}`}
            onClick={() => setActiveTab('CLOSED')}
          >
            마감 ({getStatusCount('CLOSED')})
          </span>
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
                id={`ann-card-${ann.id}`}
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
                          onClick={() => toggleSection(`${ann.id}-schedule`, ann.id)}
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
                          onClick={() => toggleSection(`${ann.id}-limits`, ann.id)}
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
                          onClick={() => toggleSection(`${ann.id}-details`, ann.id)}
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
                                <div style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                                  {renderMarkdown(d.section_content)}
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

      {/* Sidebar Footer Link (구글 애드센스 심사용 필수 약관 링크) */}
      <div className="sidebar-footer" style={{
        padding: '16px',
        borderTop: '1px solid hsl(var(--border))',
        fontSize: '0.75rem',
        textAlign: 'center',
        color: 'hsl(var(--text-muted))',
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        flexShrink: 0
      }}>
        <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>개인정보처리방침</Link>
        <span>|</span>
        <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>이용약관</Link>
      </div>
    </aside>
  );
}
