import React from 'react';
import { HousingUnit, Announcement } from '@/types';
import { formatMoney, formatRent, formatTargetGroup } from '@/utils/formatters';
import { calcConversion } from '@/utils/conversion';
import styles from './UnitCard.module.css';

interface UnitCardProps {
  unit: HousingUnit;
  hasConversion: boolean | null | undefined;
  announcement: Announcement | null | undefined;
  sliderVal: number;
  onSliderChange: (unitId: number, value: number) => void;
  sliderMin: number;
  sliderMax: number;
}

export default function UnitCard({
  unit,
  hasConversion,
  announcement,
  sliderVal,
  onSliderChange,
  sliderMin,
  sliderMax
}: UnitCardProps) {
  const converted = hasConversion && announcement
    ? calcConversion(
        unit.deposit,
        unit.monthly_rent,
        sliderVal,
        announcement.deposit_increase_rate,
        announcement.deposit_decrease_rate,
        announcement.deposit_increase_limit_rate,
        announcement.deposit_decrease_limit_rate,
      )
    : null;

  // 증액 한도 단계 (100만원 단위) 계산
  let maxAddSteps = 0;
  if (announcement?.deposit_increase_rate && announcement?.deposit_increase_rate > 0) {
    const limitRate = (announcement.deposit_increase_limit_rate ?? 80.0) / 100;
    const maxConvertibleRent = unit.monthly_rent * limitRate;
    const maxConvertibleDeposit = (maxConvertibleRent * 12) / (announcement.deposit_increase_rate / 100);
    maxAddSteps = Math.floor(maxConvertibleDeposit / 1000000);
  }

  // 감액 한도 단계 (100만원 단위) 계산
  let maxReduceSteps = 0;
  if (announcement?.deposit_decrease_rate && announcement?.deposit_decrease_rate > 0) {
    const limitRate = (announcement.deposit_decrease_limit_rate ?? 0) / 100;
    const maxConvertibleDeposit = unit.deposit * limitRate;
    maxReduceSteps = Math.floor(maxConvertibleDeposit / 1000000);
  }

  return (
    <div className={styles['unit-card']}>
      <div className={styles['unit-header']}>
        <span className={styles['unit-supply-type']}>
          {unit.supply_type || `${unit.exclusive_area}형`} 
          <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'hsl(var(--text-secondary))', marginLeft: '6px' }}>
            ({unit.exclusive_area.toFixed(2)}㎡ / ~{Math.round(unit.exclusive_area * 0.3025)}평)
          </span>
        </span>
        {unit.target_group && (
          <span className={styles['unit-target']}>{formatTargetGroup(unit.target_group)}</span>
        )}
      </div>

      <div className={styles['unit-price-box']}>
        <div className={styles['price-item']}>
          <span className={styles['price-lbl']}>임대보증금</span>
          <span className={styles['price-val']}>
            {converted && sliderVal !== 0 ? formatMoney(converted.deposit) : formatMoney(unit.deposit)}
          </span>
        </div>
        <div className={styles['price-item']}>
          <span className={styles['price-lbl']}>월 임대료</span>
          <span className={styles['price-val']} style={{ color: 'hsl(var(--accent-hover))' }}>
            {converted && sliderVal !== 0 ? formatRent(converted.rent) : formatRent(unit.monthly_rent)}
          </span>
        </div>
      </div>

      {hasConversion && unit.monthly_rent > 0 && (
        <div className={styles['conversion-slider-box']}>
          <div className={styles['conversion-slider-header']} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={styles['conversion-slider-title']}>보증금 ↔ 월세 전환 (100만원 단위)</span>
              {sliderVal !== 0 && (
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)' }}>
                  ({sliderVal > 0 ? `+${sliderVal * 100}만원` : `${sliderVal * 100}만원`})
                </span>
              )}
            </div>
            {sliderVal !== 0 && (
              <button
                className={styles['conversion-reset-btn']}
                onClick={() => onSliderChange(unit.id, 0)}
              >
                초기화
              </button>
            )}
          </div>
          <div className={styles['conversion-slider-track-wrap']}>
            <span className={`${styles['conversion-slider-label']}`} style={{ whiteSpace: 'nowrap' }}>보증금↓</span>
            <input
              type="range"
              className={styles['conversion-slider']}
              min={-maxReduceSteps}
              max={maxAddSteps}
              step={1}
              value={sliderVal}
              onChange={(e) => onSliderChange(unit.id, parseInt(e.target.value, 10))}
            />
            <span className={`${styles['conversion-slider-label']}`} style={{ whiteSpace: 'nowrap' }}>보증금↑</span>
          </div>
          {sliderVal !== 0 && converted && (
            <div className={styles['conversion-result']}>
              <div className={styles['conversion-result-item']}>
                <span className={styles['conversion-result-lbl']}>전환 후 보증금</span>
                <span className={styles['conversion-result-val']}>
                  {formatMoney(converted.deposit)}
                  <span className={`${styles['conversion-diff']} ${sliderVal > 0 ? styles['up'] : styles['down']}`}>
                    {sliderVal > 0 ? '▲' : '▼'} {formatMoney(Math.abs(converted.deposit - unit.deposit))}
                  </span>
                </span>
              </div>
              <div className={styles['conversion-result-item']}>
                <span className={styles['conversion-result-lbl']}>전환 후 월 임대료</span>
                <span className={styles['conversion-result-val']}>
                  {formatRent(converted.rent)}
                  <span className={`${styles['conversion-diff']} ${sliderVal > 0 ? styles['down'] : styles['up']}`}>
                    {sliderVal > 0 ? '▼' : '▲'} {formatRent(Math.abs(converted.rent - unit.monthly_rent))}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles['unit-meta-list']} style={{ borderTop: '1px dashed hsl(var(--border))', paddingTop: '8px', marginTop: '4px' }}>
        <div style={{ flex: '1 1 45%' }}>
          <span style={{ color: 'hsl(var(--text-muted))' }}>공급호수: </span>
          <span style={{ fontWeight: '600' }}>{unit.supply_count}호</span> 
          {unit.reserve_count > 0 && <span style={{ color: 'hsl(var(--text-muted))' }}> (예비 {unit.reserve_count}호)</span>}
        </div>
        {unit.income_group && (
          <div style={{ flex: '1 1 45%' }}>
            <span style={{ color: 'hsl(var(--text-muted))' }}>소득기준: </span>
            <span>{unit.income_group}</span>
          </div>
        )}
        {unit.room_number && (
          <div style={{ flex: '1 1 45%' }}>
            <span style={{ color: 'hsl(var(--text-muted))' }}>동/호수: </span>
            <span>{unit.room_number}</span>
          </div>
        )}
        {unit.room_count && (
          <div style={{ flex: '1 1 45%' }}>
            <span style={{ color: 'hsl(var(--text-muted))' }}>방 개수: </span>
            <span>{unit.room_count}개</span>
          </div>
        )}
        {unit.attributes && (
          <div style={{ flex: '1 1 100%', fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>
            * {unit.attributes}
          </div>
        )}
      </div>
    </div>
  );
}
