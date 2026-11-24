import { clickable } from '@/utils/a11y';
import React, { useRef, useState, useEffect } from 'react';
import { Announcement, Detail } from '@/types';
import Link from 'next/link';
import Tooltip from '@/components/ui/Tooltip';
import Badge from '@/components/ui/Badge';
import MarkdownViewer from '@/components/ui/MarkdownViewer';
import { formatMoney, formatDate, formatInterestRate, formatDateWithTime, superClean } from '@/utils/formatters';
import { calculateTimelineSteps, getTimelineConnectorWidth } from '@/utils/timeline';
import styles from './AnnouncementCard.module.css';
import OfficialAnnouncementLink from './OfficialAnnouncementLink';
import { useDDay } from '@/hooks/useDDay';

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
      <div className={styles['section-header']} {...clickable(onToggle, { expanded: isOpen })}>
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
  isFavorite?: boolean;
  onFavoriteToggle?: (e: React.MouseEvent) => void;
  complexCount?: number;
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
  onDisableToggle,
  isFavorite,
  onFavoriteToggle,
  complexCount
}: AnnouncementCardProps) {
  const { dDayText, status: announcementStatus, applySchedules } = useDDay(ann);

  const [details, setDetails] = useState<Detail[] | null>(ann.details && ann.details.length > 0 ? ann.details : null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (ann.details && ann.details.length > 0) {
      setDetails(ann.details);
    }
  }, [ann.details]);

  useEffect(() => {
    if (isActive && !details && !loadingDetails) {
      setLoadingDetails(true);
      fetch(`/api/announcements/${ann.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.details) {
            setDetails(data.details);
          } else {
            setDetails([]);
          }
        })
        .catch((err) => {
          console.error(`Failed to fetch details for announcement ${ann.id}:`, err);
          setDetails([]);
        })
        .finally(() => {
          setLoadingDetails(false);
        });
    }
  }, [isActive, ann.id, details, loadingDetails]);

  const instClass = ann.institution.includes('SH') 
    ? 'sh' 
    : ann.institution.includes('LH') 
      ? 'lh' 
      : ann.institution.includes('HUG')
        ? 'hug'
        : ann.institution.includes('경기') || ann.institution.includes('GH')
          ? 'gh'
          : 'private';

  return (
    <div 
      id={`ann-card-${ann.id}`}
      className={`${styles['announcement-card']} ${isActive ? styles.active : ''} ${styles[instClass]}`}
      {...clickable(onClick, { expanded: isActive })}
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
              >
                <span className={styles['d-day-badge']}>
                  {dDayText}
                </span>
              </Tooltip>
            ) : (
              <span className={styles['d-day-badge']}>{dDayText}</span>
            )
          )}
          {onFavoriteToggle && (
            <button
              className={`${styles['favorite-btn']} ${isFavorite ? styles.favorited : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteToggle(e);
              }}
              title={isFavorite ? "공고 찜 해제" : "공고 찜하기"}
            >
              {isFavorite ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              )}
            </button>
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
              {/* 아이콘은 누르면 일어날 동작을 보여준다: 숨기기=눈 가림, 숨김 해제=눈 */}
              {isDisabled ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              )}
            </button>
          )}
          <div className={`${styles['expand-chevron']} ${isActive ? styles['expanded'] : ''}`} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </div>
      <h3 className={styles['card-title']}>{ann.title}</h3>
      
      {isActive && (
        <>
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

          {/* ① 공급 주택 목록 (공고 카드 펼침 시 최우선 노출) */}
          {children && (
            <div className={styles['complex-list-wrapper']} onClick={(e) => e.stopPropagation()}>
              <div className={styles['complex-list-header']}>
                <span className={styles['complex-list-title']}>
                  공급 주택 (단지)
                  {typeof complexCount === 'number' && complexCount > 0 && (
                    <span className={styles['complex-count-badge']}>{complexCount}</span>
                  )}
                </span>
              </div>
              {children}
            </div>
          )}
        </>
      )}

      {/* 접수 마감(CLOSED) 상태의 공고에 대해서만 진행 단계 바 렌더링 */}
      {(() => {
        if (announcementStatus !== 'CLOSED') return null;

        const { steps } = calculateTimelineSteps(ann.schedules);
        if (steps.length === 0) return null;

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
                        offset={2}
                      >
                        <div className={styles['node-dot']}>
                          {step.status === 'completed' ? '✓' : ''}
                        </div>
                      </Tooltip>
                      <span className={styles['node-label']}>
                        {step.label}
                        {step.status === 'completed' && <span className="sr-only"> (완료됨)</span>}
                      </span>
                    </li>

                    {!isLast && (() => {
                      const fillWidth = getTimelineConnectorWidth(idx, steps);
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

            {loadingDetails && (
              <div className={styles['loading-details-msg']}>
                상세 공고 내용을 불러오는 중입니다...
              </div>
            )}

            {details && details.length > 0 && details.map((d) => {
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
          </div>
        );
      })()}
    </div>
  );
}
