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
        : 'gh';

  return (
    <div 
      id={`ann-card-${ann.id}`}
      className={`${styles['announcement-card']} ${isActive ? styles.active : ''} ${styles[instClass]}`}
      onClick={onClick}
    >
      <div className={styles['card-header']}>
        <Badge institution={ann.institution} />
        <span className={styles['card-type']}>{ann.subscription_type}</span>
      </div>
      <h3 className={styles['card-title']}>{ann.title}</h3>
      
      {isActive && (
        <div className={styles['card-accordion']} onClick={(e) => e.stopPropagation()}>
          {ann.schedules && ann.schedules.length > 0 && (
            <div className={styles['accordion-section']}>
              <div className={styles['section-header']} onClick={() => onToggleSection(`${ann.id}-schedule`)}>
                <span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 'var(--spacing-xs)', verticalAlign: 'middle', display: 'inline-block' }}>
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
                        {s.notes && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--primary)', marginTop: 'calc(var(--spacing-xs) * 0.5)' }}>{s.notes}</div>}
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 'var(--spacing-xs)', verticalAlign: 'middle', display: 'inline-block' }}>
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
                            {l.deposit_limit && <div style={{fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)'}}>한도: {formatMoney(l.deposit_limit)}</div>}
                          </td>
                          <td>
                            {l.interest_rate ? formatInterestRate(l.interest_rate) : '-'}
                            {l.max_monthly_rent ? <div style={{fontSize: 'var(--font-size-xs)'}}>{formatMoney(l.max_monthly_rent)}/월</div> : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {ann.details && ann.details.length > 0 && (
            <div className={styles['accordion-section']}>
              <div className={styles['section-header']} onClick={() => onToggleSection(`${ann.id}-details`)}>
                <span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 'var(--spacing-xs)', verticalAlign: 'middle', display: 'inline-block' }}>
                    <path d="M9 18h6M10 22h4M15.09 14c.18-.08.37-.17.55-.28A7.5 7.5 0 1 0 8.36 14c.18.11.37.2.55.28L10 18h4z"></path>
                  </svg>
                  상세 안내 가이드
                </span>
                <span>
                  {expandedSections[`${ann.id}-details`] ? (
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
              {expandedSections[`${ann.id}-details`] && (
                <div className={styles['section-content']} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  {ann.details.map((d) => (
                    <div key={d.id} style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 'var(--spacing-sm)' }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', lineHeight: '1.4' }}>
                        <MarkdownViewer content={d.section_content} />
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
}
