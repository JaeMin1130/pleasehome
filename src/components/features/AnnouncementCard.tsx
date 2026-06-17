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
  return (
    <div 
      id={`ann-card-${ann.id}`}
      className={`${styles['announcement-card']} ${isActive ? styles.active : ''}`}
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
                <span>📅 청약 일정 안내</span>
                <span>{expandedSections[`${ann.id}-schedule`] ? '▲' : '▼'}</span>
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
                        {s.notes && <div style={{ fontSize: '0.7rem', color: 'hsl(var(--accent-hover))', marginTop: '2px' }}>{s.notes}</div>}
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
                <span>💰 보증금 및 지원한도</span>
                <span>{expandedSections[`${ann.id}-limits`] ? '▲' : '▼'}</span>
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

          {ann.details && ann.details.length > 0 && (
            <div className={styles['accordion-section']}>
              <div className={styles['section-header']} onClick={() => onToggleSection(`${ann.id}-details`)}>
                <span>💡 상세 안내 가이드</span>
                <span>{expandedSections[`${ann.id}-details`] ? '▲' : '▼'}</span>
              </div>
              {expandedSections[`${ann.id}-details`] && (
                <div className={styles['section-content']} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ann.details.map((d) => (
                    <div key={d.id} style={{ borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px' }}>
                      <div style={{ fontWeight: '600', fontSize: '0.75rem', color: 'hsl(var(--accent-hover))', marginBottom: '4px' }}>
                        Q. {d.section_title}
                      </div>
                      <div style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
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
