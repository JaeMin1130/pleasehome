import React, { useRef, useState, useEffect } from 'react';
import { Announcement } from '@/types';
import Link from 'next/link';
import { Stepper, Tooltip } from '@mantine/core';
import Badge from '@/components/ui/Badge';
import MarkdownViewer from '@/components/ui/MarkdownViewer';
import { formatMoney, formatDate, formatInterestRate, formatDateWithTime, superClean } from '@/utils/formatters';
import styles from './AnnouncementCard.module.css';

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
  const instClass = ann.institution.includes('SH') 
    ? 'sh' 
    : ann.institution.includes('LH') 
      ? 'lh' 
      : ann.institution.includes('HUG')
        ? 'hug'
        : ann.institution.includes('경기') || ann.institution.includes('GH')
          ? 'gh'
          : 'private';

  const getDDayText = () => {
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
    if (!minStart) return null;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(minStart.getFullYear(), minStart.getMonth(), minStart.getDate());
    
    const diffTime = startDate.getTime() - today.getTime();
    if (diffTime <= 0) return null; 
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `D-${diffDays}`;
  };

  const getAnnouncementStatus = () => {
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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(minStart.getFullYear(), minStart.getMonth(), minStart.getDate());
    
    if (today < startDate) return 'UPCOMING';
    else if (now <= maxEnd) return 'ONGOING';
    else return 'CLOSED';
  };

  const getApplyPeriodText = () => {
    const applySchedules = ann.schedules.filter(s => s.schedule_type.includes('신청접수'));
    if (applySchedules.length === 0) return null;
    let minStart: Date | null = null, maxEnd: Date | null = null;
    let minStartStr: string | null = null, maxEndStr: string | null = null;
    for (const s of applySchedules) {
      if (s.start_date) {
        const start = new Date(s.start_date);
        if (!isNaN(start.getTime())) {
          if (!minStart || start < minStart) {
            minStart = start;
            minStartStr = s.start_date;
          }
        }
      }
      if (s.end_date) {
        const end = new Date(s.end_date);
        if (!isNaN(end.getTime())) {
          if (!maxEnd || end > maxEnd) {
            maxEnd = end;
            maxEndStr = s.end_date;
          }
        }
      }
    }
    if (minStartStr && maxEndStr) {
      return `${formatDateWithTime(minStartStr)} ~ ${formatDateWithTime(maxEndStr)}`;
    }
    const firstSchedule = applySchedules[0];
    if (firstSchedule) {
      if (firstSchedule.start_date || firstSchedule.end_date) {
        return `${formatDateWithTime(firstSchedule.start_date)} ~ ${formatDateWithTime(firstSchedule.end_date)}`;
      }
      return firstSchedule.raw_text || null;
    }
    return null;
  };

  const getTimelineSteps = () => {
    // 💡 1. 일정의 시작일(또는 종료일) 기준으로 정밀 시간 정렬
    const sortedScheds = [...ann.schedules].sort((a, b) => {
      const dateA = a.start_date ? new Date(a.start_date) : (a.end_date ? new Date(a.end_date) : null);
      const dateB = b.start_date ? new Date(b.start_date) : (b.end_date ? new Date(b.end_date) : null);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    });

    const now = new Date();
    let currentStepIdx = -1;

    // 💡 2. 오늘 시점 기준으로 아직 종료되지 않은 가장 빠른 단계를 진행중(active) 상태로 특정
    for (let i = 0; i < sortedScheds.length; i++) {
      const s = sortedScheds[i];
      if (s.end_date) {
        const end = new Date(s.end_date);
        if (!isNaN(end.getTime()) && now <= end) {
          currentStepIdx = i;
          break;
        }
      } else if (s.start_date) {
        const start = new Date(s.start_date);
        if (!isNaN(start.getTime()) && now <= start) {
          currentStepIdx = i;
          break;
        }
      }
    }

    // 💡 3. 모든 일정이 이미 완료된 마감 공고의 경우 전체 완료 처리
    if (currentStepIdx === -1 && sortedScheds.length > 0) {
      currentStepIdx = sortedScheds.length;
    }

    const steps = sortedScheds.map((s, idx) => {
      let status = 'upcoming'; // completed | active | upcoming
      let statusText = '대기';

      if (idx < currentStepIdx) {
        status = 'completed';
        statusText = '완료';
      } else if (idx === currentStepIdx) {
        status = 'active';
        statusText = '진행중';
      }

      // 💡 4. 말풍선(툴팁)에 출력할 포맷화된 날짜 상세 구문
      let dateDetail = '';
      if (s.start_date || s.end_date) {
        dateDetail = `${formatDateWithTime(s.start_date)} ~ ${formatDateWithTime(s.end_date)}`;
      } else {
        dateDetail = s.raw_text || '공고 본문 참고';
      }

      // 화면 표시용 축약 노드 레이블 획득
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

    return { steps, currentStepIdx };
  };

  const dDayText = getDDayText();
  const status = getAnnouncementStatus();
  const periodText = getApplyPeriodText();
  const showPeriodText = status === 'ONGOING';

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
            <span className={styles['d-day-badge']}>{dDayText}</span>
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
          {ann.dtl_url && (
            <Link 
              href={ann.dtl_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles['detail-link-btn']}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles['link-icon']}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              모집 공고 열기
            </Link>
          )}
        </div>
      )}
      
      {/* 접수 예정 및 진행 중일 때: 기존 접수기간 텍스트 노출 */}
      {status !== 'CLOSED' && showPeriodText && periodText && (
        <div className={styles['card-period-row']}>
          <span className={styles['period-text']}>접수기간: {periodText}</span>
        </div>
      )}

      {/* 오직 접수 마감(CLOSED) 공고에만 진행 단계 바 렌더링 */}
      {status === 'CLOSED' && (() => {
        const { steps, currentStepIdx } = getTimelineSteps();
        if (steps.length === 0) return null;

        // 동적 노드 수에 따른 게이지 바 너비 계산
        let activeWidth = 0;
        if (steps.length > 1) {
          if (currentStepIdx >= steps.length) {
            activeWidth = 100;
          } else if (currentStepIdx > 0) {
            activeWidth = (currentStepIdx / (steps.length - 1)) * 100;
          }
        }

        return (
          <div className={styles['timeline-bar-wrapper']} onClick={(e) => e.stopPropagation()}>
            {/* 진행 상태 백그라운드 선 */}
            <div className={styles['timeline-line']}>
              {/* 활성화된 진행선 (부모 백그라운드선 내부에 귀속) */}
              <div 
                className={styles['timeline-line-active']} 
                style={{ width: `${activeWidth}%` }} 
              />
            </div>
            
            {/* 각 마일스톤 노드 */}
            <div className={styles['timeline-nodes']}>
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
                  <div key={step.id} className={nodeClass}>
                    {/* 💡 닷 자체 클래스를 바깥으로 승격시켜 Mantine 덮어쓰기 무력화 */}
                    <div className={styles['node-dot']}>
                      <Tooltip 
                        label={step.dateDetail} 
                        position="top" 
                        withArrow 
                        color="dark"
                        offset={6}
                        transitionProps={{ transition: 'fade', duration: 150 }}
                        className={styles['stepper-tooltip']}
                      >
                        <div className={styles['node-dot-trigger']}>
                          {step.status === 'completed' ? '✓' : ''}
                        </div>
                      </Tooltip>
                    </div>
                    <span className={styles['node-label']}>{step.label}</span>
                  </div>
                );
              })}
            </div>
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
