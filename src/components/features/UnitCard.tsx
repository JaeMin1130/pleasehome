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
        <span className={styles['unit-supply-type']}>
          {unit.room_type || `${unit.exclusive_area}형`} 
          <span className={styles['area-text']}>
            ({unit.exclusive_area.toFixed(2)}㎡ / ~{Math.round(unit.exclusive_area * 0.3025)}평)
          </span>
        </span>
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
        <div className={styles['price-item']}>
          <span className={styles['price-lbl']}>임대보증금</span>
          <span className={styles['price-val']}>
            {converted && diffAmount !== 0 ? formatMoney(converted.deposit) : formatMoney(unit.deposit)}
          </span>
        </div>
        <div className={styles['price-item']}>
          <span className={styles['price-lbl']}>월 임대료</span>
          <span className={`${styles['price-val']} ${styles['primary']}`}>
            {converted && diffAmount !== 0 ? formatRent(converted.rent) : formatRent(unit.monthly_rent)}
          </span>
        </div>
      </div>

      {hasConversion && unit.monthly_rent > 0 && (
        <div className={styles['conversion-slider-box']}>
          <div className={styles['conversion-slider-header']}>
            <div className={styles['slider-title-wrap']}>
              <span className={styles['conversion-slider-title']}>보증금 ↔ 월세 전환 (100만원 단위)</span>
              {diffAmount !== 0 && (
                <span className={styles['slider-diff-text']}>
                  ({diffAmount > 0 ? `+${Math.round(diffAmount / 10000)}만원` : `${Math.round(diffAmount / 10000)}만원`})
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
              className={styles['conversion-slider']}
              min={unit.min_deposit || 0}
              max={unit.max_deposit || 0}
              step={1000000}
              value={sliderVal}
              onChange={(e) => onSliderChange(unit.id, parseInt(e.target.value, 10))}
            />
            <span className={`${styles['conversion-slider-label']}`}>보증금↑</span>
          </div>
          {diffAmount !== 0 && converted && (
            <div className={styles['conversion-result']}>
              {converted.effectiveRate !== null && (
                <div className={styles['rate-text-wrap']}>
                  적용 전환율: <span className={styles['rate-text-highlight']}>연 {converted.effectiveRate.toFixed(2)}%</span>
                </div>
              )}
              <div className={styles['conversion-result-item']}>
                <span className={styles['conversion-result-lbl']}>전환 후 보증금</span>
                <span className={styles['conversion-result-val']}>
                  <span>{formatMoney(converted.deposit)}</span>
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
                </span>
              </div>
              <div className={styles['conversion-result-item']}>
                <span className={styles['conversion-result-lbl']}>전환 후 월 임대료</span>
                <span className={styles['conversion-result-val']}>
                  <span>{formatRent(converted.rent)}</span>
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
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles['unit-meta-list']}>
        <div className={styles['meta-item']}>
          <span className={styles['meta-lbl']}>공급호수: </span>
          <span className={styles['meta-val-bold']}>{unit.supply_count}호</span> 
          {unit.reserve_count > 0 && <span className={styles['meta-lbl']}> (예비 {unit.reserve_count}호)</span>}
        </div>
        {unit.income_group && (
          <div className={styles['meta-item']}>
            <span className={styles['meta-lbl']}>소득기준: </span>
            <span>{unit.income_group}</span>
          </div>
        )}
        {unit.room_number && (
          <div className={styles['meta-item']}>
            <span className={styles['meta-lbl']}>동/호수: </span>
            <span>{unit.room_number}</span>
          </div>
        )}
        {unit.room_count && (
          <div className={styles['meta-item']}>
            <span className={styles['meta-lbl']}>방 개수: </span>
            <span>{unit.room_count}개</span>
          </div>
        )}
        {unit.attributes && (
          <div className={styles['meta-attr']}>
            * {unit.attributes}
          </div>
        )}
      </div>
    </div>
  );
}
