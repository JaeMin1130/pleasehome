import { clickable } from '@/utils/a11y';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Complex, Announcement } from '@/types';
import Tooltip from '@/components/ui/Tooltip';
import { formatDateWithTime, formatMoney } from '@/utils/formatters';
import { calculateTimelineSteps, getTimelineConnectorWidth } from '@/utils/timeline';
import styles from './ComplexCard.module.css';
import Badge from '@/components/ui/Badge';
import { useDDay } from '@/hooks/useDDay';

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

function formatMoneyRange(min?: number | null, max?: number | null): string | null {
  if (min === undefined || min === null) return null;
  if (max === undefined || max === null || min === max) return formatMoney(min);
  return `${formatMoney(min)} ~ ${formatMoney(max)}`;
}

// 전용면적 ㎡ → 평 (1㎡ = 0.3025평). 공급면적 기준 "OO평형"과 혼동되지 않도록 호출부에서 "전용" 접두어와 함께 노출한다.
const toPyeong = (m2: number) => Math.round(m2 * 0.3025);

function formatAreaRange(min?: number | null, max?: number | null): string | null {
  if (min === undefined || min === null) return null;
  const minFixed = Math.round(min * 10) / 10;
  if (max === undefined || max === null || min === max) return `${minFixed}㎡ (${toPyeong(min)}평)`;
  const maxFixed = Math.round(max * 10) / 10;
  return `${minFixed}~${maxFixed}㎡ (${toPyeong(min)}~${toPyeong(max)}평)`;
}

// 카드에 노출되는 공급/예비 수. 복수 단지가 묶인 주택군은 모집단위 합계, 단독 단지는 단지 실물 수치.
export function isMultiComplexGroup(complex: Complex): boolean {
  return Boolean(complex.recruitment_group_name && complex.recruitment_group_name !== complex.name);
}

export function displayedCounts(complex: Complex): { supply: number | null | undefined; reserve: number | null | undefined } {
  return isMultiComplexGroup(complex)
    ? { supply: complex.recruitment_group_supply_count, reserve: complex.recruitment_group_reserve_count }
    : { supply: complex.total_supply_count, reserve: complex.total_reserve_count };
}

function extractShortRegion(address: string): string {
  if (!address) return '';
  const parts = address.trim().split(/\s+/);
  if (parts.length === 0) return '';
  
  const city = parts[0].replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, '');
  if (parts.length > 1) {
    const second = parts[1];
    if (parts.length > 2 && second.endsWith('시') && (parts[2].endsWith('구') || parts[2].endsWith('군'))) {
      return `${second} ${parts[2]}`;
    }
    return `${city} ${second}`;
  }
  return city;
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
  const router = useRouter();
  const { dDayText, status: announcementStatusVal } = useDDay(announcement);

  return (
    <div 
      className={`${styles['complex-card']} ${isActive ? styles.active : ''}`}
      {...clickable(onClick, { pressed: isActive })}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles['card-top-row']}>
        <div className={styles['card-title-group']}>
          <span className={styles['complex-name']}>{complex.name}</span>
          {extractShortRegion(complex.address) && (
            <span className={styles['region-badge']}>{extractShortRegion(complex.address)}</span>
          )}
          {complex.complex_type && (
            <span className={styles['type-badge']}>{complex.complex_type}</span>
          )}
        </div>
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

      {/* 💡 깔끔하고 통일성 있는 정보 블록 (단지 기준 공급/예비수 반영) */}
      {(() => {
        const priceDisplay = formatMoneyRange(complex.min_deposit, complex.max_deposit);
        const rentDisplay = complex.max_monthly_rent && complex.max_monthly_rent > 0 
          ? formatMoneyRange(complex.min_monthly_rent, complex.max_monthly_rent) 
          : null;
        const areaDisplay = formatAreaRange(complex.min_exclusive_area, complex.max_exclusive_area);

        const metaItems: string[] = [];

        // 복수 단지가 묶인 주택군이면 모집단위 라벨을 먼저 노출 (수치는 displayedCounts가 모집단위 합계로 선택)
        if (isMultiComplexGroup(complex)) {
          metaItems.push(`모집단위: ${complex.recruitment_group_name}`);
        }

        const { supply: supplyNum, reserve: reserveNum } = displayedCounts(complex);
        if (supplyNum != null && supplyNum > 0) {
          if (reserveNum != null && reserveNum > 0) {
            metaItems.push(`공급 ${supplyNum}호 (예비 ${reserveNum}명)`);
          } else {
            metaItems.push(`공급 ${supplyNum}호`);
          }
        } else if (reserveNum != null && reserveNum > 0) {
          metaItems.push(`예비 ${reserveNum}명`);
        }

        if (areaDisplay) {
          metaItems.push(`전용 ${areaDisplay}`);
        }

        return (
          <div className={styles['card-info-block']}>
            <div className={styles['price-line']}>
              <span className={styles['price-label']}>
                {rentDisplay ? '보증금' : '분양/보증금'}
              </span>
              <span className={styles['price-val']}>
                {priceDisplay || '가격 정보 미정'}
              </span>
              {rentDisplay && (
                <span className={styles['rent-val']}>/ 월 {rentDisplay}</span>
              )}
            </div>

            {metaItems.length > 0 && (
              <div className={styles['meta-line']}>
                {metaItems.join(' · ')}
              </div>
            )}
          </div>
        );
      })()}

      {announcementTitle && (
        <div 
          className={`${styles['card-ann-info']} ${announcement?.id ? styles.clickable : ''}`}
          onClick={(e) => {
            if (announcement?.id) {
              e.stopPropagation();
              router.push(`/announcements/details/${announcement.id}`);
            }
          }}
          role={announcement?.id ? "button" : undefined}
          tabIndex={announcement?.id ? 0 : undefined}
          onKeyDown={(e) => {
            if (announcement?.id && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/announcements/details/${announcement.id}`);
            }
          }}
          title={announcement?.id ? `${announcementTitle} 공고 상세로 이동` : announcementTitle}
        >
          <Badge institution={announcementInstitution || '공고'} />
          <span className={styles['ann-title']}>
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
        if (announcementStatusVal !== 'CLOSED') return null;

        const { steps } = calculateTimelineSteps(announcement.schedules);
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
    </div>
  );
}

