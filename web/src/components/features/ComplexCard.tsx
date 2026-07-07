import React, { useState, useEffect, useMemo } from 'react';
import { Complex, Announcement } from '@/types';
import { Tooltip } from '@mantine/core';
import { formatDateWithTime } from '@/utils/formatters';
import styles from './ComplexCard.module.css';

interface ComplexCardProps {
  complex: Complex;
  isActive: boolean;
  onClick: () => void;
  isBookmarked: boolean;
  onBookmarkToggle: () => void;
  announcementTitle?: string;
  announcementStatus?: string;
  announcementInstitution?: string;
  announcement?: Announcement;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function ComplexCard({ 
  complex, 
  isActive, 
  onClick,
  isBookmarked,
  onBookmarkToggle,
  announcementTitle,
  announcementStatus,
  announcementInstitution,
  announcement,
  onMouseEnter,
  onMouseLeave
}: ComplexCardProps) {
  const [dDayText, setDDayText] = useState<string | null>(null);

  const { minStart, maxEnd } = useMemo(() => {
    if (!announcement) return { minStart: null, maxEnd: null };
    const applySchedules = announcement.schedules.filter(s => s.schedule_type.includes('신청접수'));
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
  }, [announcement]);

  useEffect(() => {
    if (!announcement) {
      setDDayText(null);
      return;
    }

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
  }, [announcement, minStart, maxEnd]);

  const getAnnouncementStatus = () => {
    if (!announcement || !minStart) return 'CLOSED';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(minStart.getFullYear(), minStart.getMonth(), minStart.getDate());
    
    if (today < startDate) return 'UPCOMING';
    else if (!maxEnd || now <= maxEnd) return 'ONGOING';
    else return 'CLOSED';
  };

  const getTimelineSteps = () => {
    if (!announcement) return { steps: [], sortedScheds: [] };
    const sortedScheds = [...announcement.schedules].sort((a, b) => {
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

    const activeIdx = steps.findIndex(s => s.status === 'active');
    const lastCompletedIdx = steps.map(s => s.status).lastIndexOf('completed');
    if (activeIdx === -1 && lastCompletedIdx !== -1) {
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

    return { steps, sortedScheds };
  };

  const getConnectorWidth = (idx: number, steps: any[]) => {
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
    <div 
      className={`${styles['complex-card']} ${isActive ? styles.active : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles['card-top-row']}>
        <span className={styles['complex-name']}>{complex.name}</span>
        <div className={styles['header-right-actions']}>
          {dDayText && (
            <span className={styles['d-day-badge']}>{dDayText}</span>
          )}
          <button 
            className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onBookmarkToggle();
            }}
            title={isBookmarked ? "저장한 단지 해제" : "단지 저장하기"}
          >
            <svg className={styles['star-icon']} width="16" height="16" viewBox="0 0 24 24" fill={isBookmarked ? 'var(--color-warning-text)' : 'none'} stroke={isBookmarked ? 'var(--color-warning-text)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
      <span className={styles['complex-address']}>
        <svg 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        {complex.address}
      </span>

      {announcementTitle && (
        <div className={styles['card-ann-info']}>
          <span className={styles['ann-badge']}>{announcementInstitution || '공고'}</span>
          <span className={styles['ann-title']} title={announcementTitle}>
            {announcementTitle}
          </span>
          {announcementStatus && (
            <span className={`${styles['status-badge']} ${styles[announcementStatus.toLowerCase()]}`}>
              {announcementStatus === 'ONGOING' ? '접수중' : announcementStatus === 'UPCOMING' ? '접수예정' : '접수마감'}
            </span>
          )}
        </div>
      )}

      {/* 접수 마감(CLOSED) 상태의 공고에 대해서만 진행 단계 바 렌더링 */}
      {announcement && (() => {
        const currentStatus = getAnnouncementStatus();
        if (currentStatus !== 'CLOSED') return null;

        const { steps } = getTimelineSteps();
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
                      </span>
                    </li>

                    {!isLast && (() => {
                      const fillWidth = getConnectorWidth(idx, steps);
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
    </div>
  );
}

