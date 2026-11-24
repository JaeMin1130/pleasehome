import React from 'react';
import { HousingUnit } from '@/types';
import { formatMoney, formatRent, formatTargetGroup } from '@/utils/formatters';
import { calcConversion } from '@/utils/conversion';
import styles from './UnitCard.module.css';

interface UnitCardProps {
  unit: HousingUnit;
  sliderVal: number;
  onSliderChange: (unitId: number, value: number) => void;
}

export default function UnitCard({
  unit,
  sliderVal,
  onSliderChange,
}: UnitCardProps) {
  const hasConversion =
    unit.max_deposit !== null &&
    unit.min_deposit !== null &&
    unit.max_monthly_rent !== null &&
    unit.min_monthly_rent !== null &&
    unit.max_deposit > unit.deposit;

  const diffMax = unit.max_deposit !== null ? Math.abs(unit.max_deposit - unit.deposit) : 0;
  const diffMin = unit.min_deposit !== null ? Math.abs(unit.deposit - unit.min_deposit) : 0;
  const referenceDiff = diffMax > 0 ? diffMax : (diffMin > 0 ? diffMin : 0);

  let step = 1000000;
  let stepText = '100만원 단위';

  if (referenceDiff > 0) {
    if (referenceDiff % 1000000 === 0) {
      step = 1000000;
      stepText = '100만원 단위';
    } else if (referenceDiff % 100000 === 0) {
      step = 100000;
      stepText = '10만원 단위';
    } else {
      step = 100000;
      stepText = '10만원 단위';
    }
  }

  const converted = hasConversion
    ? calcConversion(
        unit.deposit,
        unit.monthly_rent,
        sliderVal,
        unit.max_deposit,
        unit.min_deposit,
        unit.max_monthly_rent,
        unit.min_monthly_rent,
      )
    : null;

  const diffAmount = sliderVal - unit.deposit;

  return (
    <div className={styles['unit-card']}>
      <div className={styles['unit-header']}>
        <div className={styles['unit-title-group']}>
          <span className={styles['unit-room-type']}>
            {unit.room_type || `${unit.exclusive_area}형`}
          </span>
          <span className={styles['area-text']}>
            {unit.exclusive_area.toFixed(1)}㎡ ({Math.round(unit.exclusive_area * 0.3025)}평)
          </span>
        </div>
        <div className={styles['unit-header-right']}>
          {unit.supply_type && (
            <span className={`${styles['unit-target']} ${styles['supply-type']}`}>
              {unit.supply_type}
            </span>
          )}
          {unit.target_group && (
            <span className={styles['unit-target']}>{formatTargetGroup(unit.target_group)}</span>
          )}
        </div>
      </div>

      <div className={styles['unit-price-box']}>
        <div className={styles['price-col']}>
          <span className={styles['price-lbl']}>보증금</span>
          <div className={styles['price-val-wrap']}>
            <span className={styles['price-val']}>
              {converted && diffAmount !== 0 ? formatMoney(converted.deposit) : formatMoney(unit.deposit)}
            </span>
            {converted && diffAmount !== 0 && (
              <span className={`${styles['conversion-diff']} ${diffAmount > 0 ? styles['up'] : styles['down']}`}>
                {diffAmount > 0 ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles['diff-icon']}>
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles['diff-icon']}>
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <polyline points="19 12 12 19 5 12"></polyline>
                  </svg>
                )} {formatMoney(Math.abs(converted.deposit - unit.deposit))}
              </span>
            )}
          </div>
        </div>
        <div className={styles['price-divider']} />
        <div className={styles['price-col']}>
          <span className={styles['price-lbl']}>월세</span>
          <div className={styles['price-val-wrap']}>
            <span className={styles['price-val']}>
              {converted && diffAmount !== 0 ? formatRent(converted.rent) : formatRent(unit.monthly_rent)}
            </span>
            {converted && diffAmount !== 0 && (
              <span className={`${styles['conversion-diff']} ${diffAmount > 0 ? styles['down'] : styles['up']}`}>
                {diffAmount > 0 ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles['diff-icon']}>
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <polyline points="19 12 12 19 5 12"></polyline>
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles['diff-icon']}>
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                  </svg>
                )} {formatRent(Math.abs(converted.rent - unit.monthly_rent))}
              </span>
            )}
          </div>
        </div>
      </div>

      {hasConversion && unit.monthly_rent > 0 && (
        <div className={styles['conversion-slider-box']}>
          <div className={styles['conversion-slider-header']}>
            <div className={styles['slider-title-wrap']}>
              <span className={styles['conversion-slider-title']}>보증금 ↔ 월세 전환</span>
              {diffAmount !== 0 && converted && converted.effectiveRate !== null && (
                <span className={styles['slider-diff-text']}>
                  (적용 전환율: 연 {converted.effectiveRate.toFixed(2)}%)
                </span>
              )}
            </div>
            {diffAmount !== 0 && (
              <button
                className={styles['conversion-reset-btn']}
                onClick={() => onSliderChange(unit.id, unit.deposit)}
              >
                초기화
              </button>
            )}
          </div>
          <div className={styles['conversion-slider-track-wrap']}>
            <span className={`${styles['conversion-slider-label']}`}>보증금↓</span>
            <input
              type="range"
              className="conversion-slider"
              min={unit.min_deposit || 0}
              max={unit.max_deposit || 0}
              step={step}
              value={sliderVal}
              onChange={(e) => onSliderChange(unit.id, parseInt(e.target.value, 10))}
            />
            <span className={`${styles['conversion-slider-label']}`}>보증금↑</span>
          </div>
        </div>
      )}

      <div className={styles['unit-meta-inline']}>
        <span className={styles['meta-chip']}>
          공급 <strong>{unit.supply_count}호</strong>
          {unit.reserve_count > 0 && <span className={styles['meta-sub']}> (예비 {unit.reserve_count})</span>}
        </span>
        {unit.income_group && (
          <span className={styles['meta-chip']}>소득: {unit.income_group}</span>
        )}
        {unit.room_number && (
          <span className={styles['meta-chip']}>{unit.room_number}</span>
        )}
        {unit.room_count && (
          <span className={styles['meta-chip']}>방 {unit.room_count}개</span>
        )}
      </div>
    </div>
  );
}
