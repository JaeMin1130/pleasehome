import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Announcement } from '@/types';
import Link from 'next/link';
import { Stepper, Tooltip } from '@mantine/core';
import Badge from '@/components/ui/Badge';
import MarkdownViewer from '@/components/ui/MarkdownViewer';
import { formatMoney, formatDate, formatInterestRate, formatDateWithTime, superClean } from '@/utils/formatters';
import styles from './AnnouncementCard.module.css';
import OfficialAnnouncementLink from './OfficialAnnouncementLink';

export interface AccordionSectionProps {
  title: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function AccordionSection({ title, isOpen, onToggle, children }: AccordionSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [isOpen, children]);

  return (
    <div className={styles['accordion-section']}>
      <div className={styles['section-header']} onClick={onToggle}>
        <span>{title}</span>
        <span>
          {isOpen ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          )}
        </span>
      </div>
      <div 
        ref={contentRef}
        className={styles['section-content-wrapper']}
        style={{
          height: isOpen ? `${contentHeight}px` : '0px',
          opacity: isOpen ? 1 : 0,
          overflow: 'hidden'
        }}
      >
        <div className={styles['section-content']}>
          {children}
        </div>
      </div>
    </div>
  );
}

interface AnnouncementCardProps {
  ann: Announcement;
  isActive: boolean;
  onClick: () => void;
  expandedSections: { [key: string]: boolean };
  onToggleSection: (key: string) => void;
  children?: React.ReactNode;
  isComplexListOpen?: boolean;
  onToggleComplexList?: () => void;
  isDisabled?: boolean;
  onDisableToggle?: (e: React.MouseEvent) => void;
}

export default function AnnouncementCard({ 
  ann, 
  isActive, 
  onClick, 
  expandedSections, 
  onToggleSection,
  children,
  isComplexListOpen,
  onToggleComplexList,
  isDisabled,
  onDisableToggle
}: AnnouncementCardProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const instClass = ann.institution.includes('SH') 
    ? 'sh' 
    : ann.institution.includes('LH') 
      ? 'lh' 
      : ann.institution.includes('HUG')
        ? 'hug'
        : ann.institution.includes('경기') || ann.institution.includes('GH')
          ? 'gh'
          : 'private';

  const [dDayText, setDDayText] = useState<string | null>(null);

  const { minStart, maxEnd } = useMemo(() => {
    const applySchedules = ann.schedules.filter(s => s.schedule_type.includes('신청접수'));
    let min: Date | null = null;
    let max: Date | null = null;
    for (const s of applySchedules) {
      if (s.start_date) {
        const start = new Date(s.start_date);
        if (!isNaN(start.getTime())) {
          if (!min || start < min) min = start;
        }
      }
      if (s.end_date) {
        const end = new Date(s.end_date);
        if (!isNaN(end.getTime())) {
          if (!max || end > max) max = end;
        }
      }
    }
    return { minStart: min, maxEnd: max };
  }, [ann.schedules]);

  useEffect(() => {
    if (!isMounted) return;

    const calculateDDay = () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let currentStatus: 'CLOSED' | 'UPCOMING' | 'ONGOING' = 'CLOSED';
      if (minStart) {
        const startDate = new Date(minStart.getFullYear(), minStart.getMonth(), minStart.getDate());
        if (today < startDate) {
          currentStatus = 'UPCOMING';
        } else if (!maxEnd || now <= maxEnd) {
          currentStatus = 'ONGOING';
        } else {
          currentStatus = 'CLOSED';
        }
      }

      if (currentStatus === 'UPCOMING' && minStart) {
        const startDate = new Date(minStart.getFullYear(), minStart.getMonth(), minStart.getDate());
        const diffTime = startDate.getTime() - today.getTime();
        if (diffTime > 0) {
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return `접수 D-${diffDays}`;
        }
      } else if (currentStatus === 'ONGOING') {
        if (!maxEnd) {
          return '상시모집';
        }

        const diffTime = maxEnd.getTime() - now.getTime();

        if (diffTime > 0) {
          const hoursLeft = diffTime / (1000 * 60 * 60);
          if (hoursLeft < 24) {
            const hours = Math.floor(diffTime / (1000 * 60 * 60));
            const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);
            
            const hStr = String(hours).padStart(2, '0');
            const mStr = String(minutes).padStart(2, '0');
            const sStr = String(seconds).padStart(2, '0');
            
            return `마감 ${hStr}:${mStr}:${sStr}`;
          } else {
            const endDate = new Date(maxEnd.getFullYear(), maxEnd.getMonth(), maxEnd.getDate());
            const diffDaysTime = endDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffDaysTime / (1000 * 60 * 60 * 24));
            return `마감 D-${diffDays}`;
          }
        } else if (diffTime <= 0) {
          const endDate = new Date(maxEnd.getFullYear(), maxEnd.getMonth(), maxEnd.getDate());
          if (today.getTime() === endDate.getTime()) {
            return '오늘 마감';
          }
        }
      }
      return null;
    };

    setDDayText(calculateDDay());

    const intervalId = setInterval(() => {
      setDDayText(calculateDDay());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isMounted, minStart, maxEnd]);

  const getApplySchedules = () => {
    const applySchedules = ann.schedules.filter(s => s.schedule_type.includes('신청접수'));
    if (applySchedules.length === 0) return [];
    
    // Sort schedules chronologically by start_date
    return [...applySchedules].sort((a, b) => {
      const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
      const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
      return dateA - dateB;
    });
  };

  const getAnnouncementStatus = () => {
    if (!minStart) return 'CLOSED';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(minStart.getFullYear(), minStart.getMonth(), minStart.getDate());
    
    if (today < startDate) return 'UPCOMING';
    else if (!maxEnd || now <= maxEnd) return 'ONGOING';
    else return 'CLOSED';
  };

  const getTimelineSteps = () => {
    const sortedScheds = [...ann.schedules].sort((a, b) => {
      const dateA = a.start_date ? new Date(a.start_date) : (a.end_date ? new Date(a.end_date) : null);
      const dateB = b.start_date ? new Date(b.start_date) : (b.end_date ? new Date(b.end_date) : null);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    });

    const now = new Date();

    const getStepStatus = (s: any) => {
      const start = s.start_date ? new Date(s.start_date) : null;
      const end = s.end_date ? new Date(s.end_date) : null;

      const hasStart = start && !isNaN(start.getTime());
      const hasEnd = end && !isNaN(end.getTime());

      if (hasStart && hasEnd) {
        if (now > end) return { status: 'completed', statusText: '완료' };
        if (now >= start && now <= end) return { status: 'active', statusText: '진행중' };
        return { status: 'upcoming', statusText: '대기' };
      } else if (hasStart) {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        
        if (today > startDay) return { status: 'completed', statusText: '완료' };
        if (today.getTime() === startDay.getTime()) return { status: 'active', statusText: '진행중' };
        return { status: 'upcoming', statusText: '대기' };
      } else if (hasEnd) {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        
        if (today > endDay) return { status: 'completed', statusText: '완료' };
        if (today.getTime() === endDay.getTime()) return { status: 'active', statusText: '진행중' };
        return { status: 'upcoming', statusText: '대기' };
      }
      return { status: 'upcoming', statusText: '대기' };
    };

    const steps = sortedScheds.map((s) => {
      const { status, statusText } = getStepStatus(s);

      let dateDetail = '';
      if (s.start_date || s.end_date) {
        dateDetail = `${formatDateWithTime(s.start_date)} ~ ${formatDateWithTime(s.end_date)}`;
      } else {
        dateDetail = s.raw_text || '공고 본문 참고';
      }

      let label = s.schedule_type;
      if (label.length > 10) {
        label = label.substring(0, 10) + '...';
      }

      return {
        id: s.id,
        label,
        fullLabel: s.schedule_type,
        status,
        statusText,
        dateDetail,
        notes: s.notes
      };
    });

    return { steps, sortedScheds };
  };

  const applySchedules = getApplySchedules();

  return (
    <div 
      id={`ann-card-${ann.id}`}
      className={`${styles['announcement-card']} ${isActive ? styles.active : ''} ${styles[instClass]}`}
      onClick={onClick}
    >
      <div className={styles['card-header']}>
        <div className={styles['header-badges']}>
          <Badge institution={ann.institution} />
          <span className={styles['card-type']}>{ann.subscription_type}</span>
        </div>
        <div className={styles['header-right-actions']}>
          {dDayText && (
            applySchedules.length > 0 ? (
              <Tooltip 
                label={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '2px 0' }}>
                    <div style={{ fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '4px', marginBottom: '4px' }}>
                      접수 기간 안내
                    </div>
                    {applySchedules.map((s, idx) => {
                      const dateRange = s.start_date || s.end_date
                        ? `${formatDateWithTime(s.start_date)} ~ ${formatDateWithTime(s.end_date)}`
                        : s.raw_text || '-';
                      return (
                        <div key={s.id || idx} style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                          • {dateRange} {s.notes ? `(${s.notes})` : ''}
                        </div>
                      );
                    })}
                  </div>
                } 
                position="top" 
                withArrow 
                color="grey"
                offset={2}
                transitionProps={{ transition: 'fade', duration: 150 }}
              >
                <span className={styles['d-day-badge']}>
                  {dDayText}
                </span>
              </Tooltip>
            ) : (
              <span className={styles['d-day-badge']}>{dDayText}</span>
            )
          )}
          {onDisableToggle && (
            <button
              className={`${styles['disable-btn']} ${isDisabled ? styles.disabled : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onDisableToggle(e);
              }}
              title={isDisabled ? "공고 숨김 해제" : "공고 숨기기"}
            >
              {isDisabled ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
      <h3 className={styles['card-title']}>{ann.title}</h3>
      
      {isActive && (
        <div className={styles['detail-link-row']} onClick={(e) => e.stopPropagation()}>
          <Link 
            href={`/announcements/details/${ann.id}`} 
            className={styles['detail-link-btn']}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles['link-icon']}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            공고 상세 열기
          </Link>
          <OfficialAnnouncementLink
            institution={ann.institution}
            dtlUrl={ann.dtl_url}
            dtlUrlMob={ann.dtl_url_mob}
            className={styles['detail-link-btn']}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles['link-icon']}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            신청 페이지 열기
          </OfficialAnnouncementLink>
        </div>
      )}

      {/* 접수 마감(CLOSED) 상태의 공고에 대해서만 진행 단계 바 렌더링 */}
      {(() => {
        const currentStatus = getAnnouncementStatus();
        if (currentStatus !== 'CLOSED') return null;

        const { steps, sortedScheds } = getTimelineSteps();
        if (steps.length === 0) return null;

        const now = new Date();
        const totalSegments = steps.length - 1;

        const activeIdx = steps.findIndex(s => s.status === 'active');
        const lastCompletedIdx = steps.map(s => s.status).lastIndexOf('completed');
        if (isMounted && activeIdx === -1 && lastCompletedIdx !== -1) {
          const nextIdx = lastCompletedIdx + 1;
          if (nextIdx < steps.length) {
            const nextStepData = sortedScheds[nextIdx];
            const start = nextStepData.start_date ? new Date(nextStepData.start_date) : null;
            const end = nextStepData.end_date ? new Date(nextStepData.end_date) : null;
            const hasValidDate = (start && !isNaN(start.getTime())) || (end && !isNaN(end.getTime()));

            if (!hasValidDate) {
              steps[nextIdx].status = 'active';
            }
          }
        }

        const getConnectorWidth = (idx: number) => {
          const currentActiveIdx = steps.findIndex(s => s.status === 'active');
          const currentLastCompletedIdx = steps.map(s => s.status).lastIndexOf('completed');

          if (currentActiveIdx !== -1) {
            if (idx < currentActiveIdx) return 100;
            return 0;
          } else if (currentLastCompletedIdx !== -1) {
            if (idx < currentLastCompletedIdx) return 100;
            if (idx === currentLastCompletedIdx) {
              return 30;
            }
            return 0;
          }
          return 0;
        };

        return (
          <div className={styles['timeline-bar-wrapper']} onClick={(e) => e.stopPropagation()}>
            <ol className={styles['timeline-flex-container']}>
              {steps.map((step, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === steps.length - 1;
                const nodeClass = `
                  ${styles['timeline-node']} 
                  ${styles[step.status]} 
                  ${isFirst ? styles['first-node'] : ''} 
                  ${isLast ? styles['last-node'] : ''}
                `.trim().replace(/\s+/g, ' ');

                return (
                  <React.Fragment key={step.id}>
                    <li className={nodeClass} aria-current={step.status === 'active' ? 'step' : undefined}>
                      <Tooltip 
                        label={step.dateDetail} 
                        position="top" 
                        withArrow 
                        color="grey"
                        offset={2}
                        transitionProps={{ transition: 'fade', duration: 150 }}
                      >
                        <div className={styles['node-dot']}>
                          {step.status === 'completed' ? '✓' : ''}
                        </div>
                      </Tooltip>
                      <span className={styles['node-label']}>
                        {step.label}
                        {step.status === 'completed' && <span className={styles['sr-only']}> (완료됨)</span>}
                      </span>
                    </li>

                    {!isLast && (() => {
                      const fillWidth = getConnectorWidth(idx);
                      return (
                        <li className={styles['connector-line']} aria-hidden="true">
                          <div 
                            className={styles['connector-line-active']} 
                            style={{ width: `${fillWidth}%` }} 
                          />
                        </li>
                      );
                    })()}
                  </React.Fragment>
                );
              })}
            </ol>
          </div>
        );
      })()}
      {isActive && (() => {
        let currentNum = 1;
        return (
          <div className={styles['card-accordion']} onClick={(e) => e.stopPropagation()}>
            {ann.schedules && ann.schedules.length > 0 && (
              <AccordionSection
                title={`${currentNum++}. 청약 일정 안내`}
                isOpen={!!expandedSections[`${ann.id}-schedule`]}
                onToggle={() => onToggleSection(`${ann.id}-schedule`)}
              >
                {ann.schedules.map((s) => (
                  <div key={s.id} className={styles['schedule-item']}>
                    <div className={styles['schedule-label']}>{s.schedule_type}</div>
                    <div className={styles['schedule-val']}>
                      {s.start_date || s.end_date ? (
                        <>{formatDateWithTime(s.start_date)} ~ {formatDateWithTime(s.end_date)}</>
                      ) : (
                        s.raw_text || '공고 본문 참고'
                      )}
                      {s.notes && <div className={styles['note-text']}>{s.notes}</div>}
                    </div>
                  </div>
                ))}
              </AccordionSection>
            )}

            {ann.limits && ann.limits.length > 0 && (
              <AccordionSection
                title={`${currentNum++}. 보증금 및 지원한도`}
                isOpen={!!expandedSections[`${ann.id}-limits`]}
                onToggle={() => onToggleSection(`${ann.id}-limits`)}
              >
                <table className={styles['limits-table']}>
                  <thead>
                    <tr><th>대상군</th><th>지원한도액</th><th>이율/임대료</th></tr>
                  </thead>
                  <tbody>
                    {ann.limits.map((l) => (
                      <tr key={l.id}>
                        <td>{l.target_group || '전체'}</td>
                        <td>
                          {l.max_support_amount ? formatMoney(l.max_support_amount) : '-'}
                          {l.deposit_limit && <div className={styles['limit-text']}>한도: {formatMoney(l.deposit_limit)}</div>}
                        </td>
                        <td>
                          {l.interest_rate ? formatInterestRate(l.interest_rate) : '-'}
                          {l.max_monthly_rent ? <div className={styles['rent-text']}>{formatMoney(l.max_monthly_rent)}/월</div> : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AccordionSection>
            )}

            {ann.details && ann.details.length > 0 && ann.details.map((d) => {
               const lines = d.section_content ? d.section_content.split('\n') : [];
               const firstLine = lines[0] || '';
               const cleanTitle = superClean(d.section_title || '');
               const cleanFirstLine = superClean(firstLine);

               const finalContent = (cleanTitle === cleanFirstLine && cleanTitle !== '')
                 ? lines.slice(1).join('\n')
                 : d.section_content;

               return (
                 <AccordionSection
                   key={d.id}
                   title={`${currentNum++}. ${d.section_title}`}
                   isOpen={!!expandedSections[`${ann.id}-detail-${d.id}`]}
                   onToggle={() => onToggleSection(`${ann.id}-detail-${d.id}`)}
                 >
                   <div className={styles['section-content-flex']}>
                     <div className={styles['doc-item']}>
                       <div className={styles['doc-desc']}>
                         <MarkdownViewer content={finalContent} />
                       </div>
                     </div>
                   </div>
                 </AccordionSection>
               );
             })}

            {children && (
              <AccordionSection
                title={`${currentNum++}. 공급 주택 목록`}
                isOpen={!!isComplexListOpen}
                onToggle={onToggleComplexList || (() => {})}
              >
                {children}
              </AccordionSection>
            )}
          </div>
        );
      })()}
    </div>
  );
}
