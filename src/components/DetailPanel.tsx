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
  const [selectedType, setSelectedType] = useState<string>('ALL');

  useEffect(() => {
    if (!complex) return;
    setLoading(true);
    setSliderValues({});
    setSelectedType('ALL');
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
    if (selectedType !== 'ALL' && (!unit.room_type || !unit.room_type.startsWith(selectedType))) return false;
    if (filterState.targetGroup !== 'ALL' && unit.target_group !== filterState.targetGroup) return false;
    if (unit.exclusive_area < filterState.minArea || unit.exclusive_area > filterState.maxArea) return false;
    if (unit.deposit < filterState.minDeposit || unit.deposit > filterState.maxDeposit) return false;
    if (unit.monthly_rent < filterState.minMonthlyRent || unit.monthly_rent > filterState.maxMonthlyRent) return false;
    return true;
  });

  const handleSliderChange = (unitId: number, value: number) => {
    setSliderValues((prev) => ({ ...prev, [unitId]: value }));
  };

  if (!complex) return null;

  // Extract unique base supply types (e.g. "51A", "59A")
  const baseTypes = Array.from(
    new Set(units.map((u) => u.room_type?.split(' ')[0]).filter((t): t is string => !!t))
  ).sort();

  return (
    <div className={`${styles['app-detail-panel']} ${isOpen ? styles.open : ''}`} style={style}>
      <div className={styles['panel-header']}>
        <div className={styles['panel-title-container']}>
          <span className={styles['panel-title']}>{complex.name}</span>
          <span className={styles['panel-subtitle']}>
            <svg 
              className={styles['panel-subtitle-icon']}
              width="12" 
              height="12" 
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
            <div className={`${styles['info-card']} ${styles['full-width']}`}>
              <span className={styles['info-label']}>주차 정보</span>
              <span className={styles['info-val']}>{complex.parking_info || '정보 없음'}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className={styles['panel-section-title']}>주택형별 공급 및 가격 정보</h4>
          
          {/* 주택형 필터 칩 탭 */}
          {!loading && units.length > 0 && (
            <div className={styles['filter-tabs-container']}>
              <button
                className={`${styles['filter-tab-btn']} ${selectedType === 'ALL' ? styles.active : ''}`}
                onClick={() => setSelectedType('ALL')}
              >
                전체
              </button>
              {baseTypes.map((type) => (
                <button
                  key={type}
                  className={`${styles['filter-tab-btn']} ${selectedType === type ? styles.active : ''}`}
                  onClick={() => setSelectedType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className={styles['loading-msg']}>공급 정보를 불러오는 중입니다...</div>
          ) : filteredUnits.length === 0 ? (
            <div className={styles['empty-msg']}>조건에 맞는 공급 주택형이 없습니다.</div>
          ) : (
            <div className={styles['units-container']}>
              {filteredUnits.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  sliderVal={sliderValues[unit.id] ?? unit.deposit}
                  onSliderChange={handleSliderChange}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


