import React from 'react';
import { Announcement } from '@/types';
import Badge from '@/components/ui/Badge';
import MarkdownViewer from '@/components/ui/MarkdownViewer';
import { formatMoney, formatDate, formatInterestRate } from '@/utils/formatters';
import styles from './AnnouncementCard.module.css';

interface AnnouncementCardProps {
  ann: Announcement;
  isActive: boolean;
  onClick: () => void;
  expandedSections: { [key: string]: boolean };
  onToggleSection: (key: string) => void;
}

export default function AnnouncementCard({ 
  ann, 
  isActive, 
  onClick, 
  expandedSections, 
  onToggleSection 
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
    if (now < minStart) return 'UPCOMING';
    else if (now >= minStart && now <= maxEnd) return 'ONGOING';
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
      return `${formatDate(minStartStr)} ~ ${formatDate(maxEndStr)}`;
    }
    const firstSchedule = applySchedules[0];
    if (firstSchedule) {
      if (firstSchedule.start_date || firstSchedule.end_date) {
        return `${formatDate(firstSchedule.start_date)} ~ ${formatDate(firstSchedule.end_date)}`;
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
      
      {showPeriodText && periodText && (
        <div className={styles['card-period-row']}>
          <span className={styles['period-text']}>접수기간: {periodText}</span>
        </div>
      )}
      
      {isActive && (
        <div className={styles['card-accordion']} onClick={(e) => e.stopPropagation()}>
          {ann.schedules && ann.schedules.length > 0 && (
            <div className={styles['accordion-section']}>
              <div className={styles['section-header']} onClick={() => onToggleSection(`${ann.id}-schedule`)}>
                <span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles['icon-inline']}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  청약 일정 안내
                </span>
                <span>
                  {expandedSections[`${ann.id}-schedule`] ? (
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
              {expandedSections[`${ann.id}-schedule`] && (
                <div className={styles['section-content']}>
                  {ann.schedules.map((s) => (
                    <div key={s.id} className={styles['schedule-item']}>
                      <div className={styles['schedule-label']}>{s.schedule_type}</div>
                      <div className={styles['schedule-val']}>
                        {s.start_date || s.end_date ? (
                          <>{formatDate(s.start_date)} ~ {formatDate(s.end_date)}</>
                        ) : (
                          s.raw_text || '공고 본문 참고'
                        )}
                        {s.notes && <div className={styles['note-text']}>{s.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {ann.limits && ann.limits.length > 0 && (
            <div className={styles['accordion-section']}>
              <div className={styles['section-header']} onClick={() => onToggleSection(`${ann.id}-limits`)}>
                <span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles['icon-inline']}>
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                  보증금 및 지원한도
                </span>
                <span>
                  {expandedSections[`${ann.id}-limits`] ? (
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
              {expandedSections[`${ann.id}-limits`] && (
                <div className={styles['section-content']}>
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
                </div>
              )}
            </div>
          )}

          {ann.details && ann.details.length > 0 && ann.details.map((d) => (
            <div key={d.id} className={styles['accordion-section']}>
              <div className={styles['section-header']} onClick={() => onToggleSection(`${ann.id}-detail-${d.id}`)}>
                <span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles['icon-inline']}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  {d.section_title}
                </span>
                <span>
                  {expandedSections[`${ann.id}-detail-${d.id}`] ? (
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
              {expandedSections[`${ann.id}-detail-${d.id}`] && (
                <div className={`${styles['section-content']} ${styles['section-content-flex']}`}>
                  <div className={styles['doc-item']}>
                    <div className={styles['doc-desc']}>
                      <MarkdownViewer content={d.section_content} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
