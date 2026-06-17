"use client";

import { useEffect, useState } from 'react';
import { Complex, HousingUnit, Announcement, FilterState } from '@/types';
import UnitCard from '@/components/features/UnitCard';
import styles from './DetailPanel.module.css';

interface DetailPanelProps {
  complex: Complex | null;
  isOpen: boolean;
  filterState: FilterState;
  announcements: Announcement[];
  onClose: () => void;
  style?: React.CSSProperties;
}

export default function DetailPanel({ complex, isOpen, filterState, announcements, onClose, style }: DetailPanelProps) {
  const [units, setUnits] = useState<HousingUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [sliderValues, setSliderValues] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!complex) return;
    setLoading(true);
    setSliderValues({});
    fetch(`/api/housing-units?complex_id=${complex.id}`)
      .then((res) => res.json())
      .then((data) => {
        setUnits(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load housing units', err);
        setLoading(false);
      });
  }, [complex]);

  const filteredUnits = units.filter((unit) => {
    if (filterState.targetGroup !== 'ALL' && unit.target_group !== filterState.targetGroup) return false;
    if (unit.exclusive_area < filterState.minArea || unit.exclusive_area > filterState.maxArea) return false;
    if (unit.deposit < filterState.minDeposit || unit.deposit > filterState.maxDeposit) return false;
    if (unit.monthly_rent < filterState.minMonthlyRent || unit.monthly_rent > filterState.maxMonthlyRent) return false;
    return true;
  });

  const announcement = complex ? announcements.find((a) => a.id === complex.announcement_id) : null;
  const hasConversion = announcement && (announcement.deposit_increase_rate !== null || announcement.deposit_decrease_rate !== null);
  const canIncrease = !!(announcement?.deposit_increase_rate && announcement?.deposit_increase_limit_rate);
  const canDecrease = !!(announcement?.deposit_decrease_rate && announcement?.deposit_decrease_limit_rate);

  const getSliderMin = () => canDecrease ? -100 : 0;
  const getSliderMax = () => canIncrease ? 100 : 0;

  const handleSliderChange = (unitId: number, value: number) => {
    setSliderValues((prev) => ({ ...prev, [unitId]: value }));
  };

  if (!complex) return null;

  return (
    <div className={`${styles['app-detail-panel']} ${isOpen ? styles.open : ''}`} style={style}>
      <div className={styles['panel-header']}>
        <div className={styles['panel-title-container']}>
          <span className={styles['panel-title']}>{complex.name}</span>
          <span className={styles['panel-subtitle']}>📍 {complex.address}</span>
        </div>
        <button className={styles['panel-close-btn']} onClick={onClose}>✕</button>
      </div>

      <div className={styles['panel-body']}>
        <div>
          <h4 className={styles['panel-section-title']}>단지 기본 정보</h4>
          <div className={styles['info-grid']}>
            <div className={styles['info-card']}>
              <span className={styles['info-label']}>난방 방식</span>
              <span className={styles['info-val']}>{complex.heating_type || '정보 없음'}</span>
            </div>
            <div className={styles['info-card']}>
              <span className={styles['info-label']}>엘리베이터</span>
              <span className={styles['info-val']}>
                {complex.has_elevator === undefined || complex.has_elevator === null ? '정보 없음' : complex.has_elevator ? '있음' : '없음'}
              </span>
            </div>
            <div className={styles['info-card']} style={{ gridColumn: 'span 2' }}>
              <span className={styles['info-label']}>주차 정보</span>
              <span className={styles['info-val']}>{complex.parking_info || '정보 없음'}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className={styles['panel-section-title']}>주택형별 공급 및 가격 정보</h4>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'hsl(var(--text-muted))' }}>공급 정보를 불러오는 중입니다...</div>
          ) : filteredUnits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'hsl(var(--text-muted))' }}>조건에 맞는 공급 주택형이 없습니다.</div>
          ) : (
            <div className={styles['units-container']}>
              {filteredUnits.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  hasConversion={hasConversion}
                  announcement={announcement}
                  sliderVal={sliderValues[unit.id] ?? 0}
                  onSliderChange={handleSliderChange}
                  sliderMin={getSliderMin()}
                  sliderMax={getSliderMax()}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
