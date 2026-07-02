import React, { useRef, useState, useEffect } from 'react';
import { Announcement } from '@/types';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import MarkdownViewer from '@/components/ui/MarkdownViewer';
import { formatMoney, formatDate, formatInterestRate, formatDateWithTime } from '@/utils/formatters';
import styles from './AnnouncementCard.module.css';

// 앞부분의 숫자 넘버링 패턴(예: 1. 2. )을 지우고 텍스트만 추출하는 헬퍼 함수
const superClean = (str: string): string => {
  return str.replace(/[#*_\-\[\]\(\)\d\.\s]/g, '').trim();
};

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
}

export default function AnnouncementCard({ 
  ann, 
  isActive, 
  onClick, 
  expandedSections, 
  onToggleSection,
  children,
  isComplexListOpen,
  onToggleComplexList
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
        {dDayText && (
          <span className={styles['d-day-badge']}>{dDayText}</span>
        )}
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
      
      {showPeriodText && periodText && (
        <div className={styles['card-period-row']}>
          <span className={styles['period-text']}>접수기간: {periodText}</span>
        </div>
      )}
      
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
