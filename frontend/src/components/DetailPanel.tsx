"use client";

import { useEffect, useState } from 'react';
import { Complex, HousingUnit, Announcement, FilterState } from '@/types';
import UnitTable from '@/components/features/UnitTable';
import { formatTargetGroup } from '@/utils/formatters';
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
  const [selectedTarget, setSelectedTarget] = useState<string>('ALL');
  const [selectedIncome, setSelectedIncome] = useState<string>('ALL');

  useEffect(() => {
    if (!complex) return;
    setLoading(true);
    setSliderValues({});
    setSelectedType('ALL');
    setSelectedTarget('ALL');
    setSelectedIncome('ALL');
    fetch(`/api/housing-units?complex_id=${complex.id}`)
      .then((res) => res.json())
      .then((data: HousingUnit[]) => {
        setUnits(data);
        
        // 고유 결합 키 및 소득 등급 추출하여 첫 번째 값을 기본 선택값으로 적용
        const combos = Array.from(
          new Set(data.map((u) => `${u.supply_type || ''}_${u.target_group || ''}`))
        ).filter(combo => combo !== '_').sort();
        
        const incomes = Array.from(
          new Set(data.map((u) => u.income_group).filter((g): g is string => !!g))
        ).sort();

        setSelectedTarget(combos.length > 0 ? (combos[0] as string) : 'ALL');
        setSelectedIncome(incomes.length > 0 ? (incomes[0] as string) : 'ALL');
        
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load housing units', err);
        setLoading(false);
      });
  }, [complex]);

  const filteredUnits = units.filter((unit) => {
    if (selectedType !== 'ALL' && (!unit.room_type || !unit.room_type.startsWith(selectedType))) return false;
    
    // 1. 공급 유형 + 신청 대상 그룹화 필터링
    if (selectedTarget !== 'ALL') {
      const comboKey = `${unit.supply_type || ''}_${unit.target_group || ''}`;
      if (comboKey !== selectedTarget) return false;
    }
    
    // 2. 소득/순위 필터링
    if (selectedIncome !== 'ALL' && unit.income_group !== selectedIncome) return false;
    
    // 지도 뷰의 슬라이더/인적 자격 공통 필터링
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

  // 1. 주택형 고유 목록
  const baseTypes = Array.from(
    new Set(units.map((u) => u.room_type?.split(' ')[0]).filter((t): t is string => !!t))
  ).sort();

  // 2. 공급 유형 + 신청 대상 고유 결합 키 목록 추출
  const targetCombos = Array.from(
    new Set(units.map((u) => `${u.supply_type || ''}_${u.target_group || ''}`))
  ).filter(combo => combo !== '_').sort();

  // 3. 소득/순위 고유 목록
  const incomeGroups = Array.from(
    new Set(units.map((u) => u.income_group).filter((g): g is string => !!g))
  ).sort();

  // --- 교차 연동 유효성 체크 함수 (Cascading Intersection) ---
  // 주택형 칩 활성화 판별
  const isTypeValid = (type: string) => {
    return units.some((u) => {
      const comboKey = `${u.supply_type || ''}_${u.target_group || ''}`;
      return (selectedTarget === 'ALL' || comboKey === selectedTarget) &&
             (selectedIncome === 'ALL' || u.income_group === selectedIncome) &&
             (u.room_type && u.room_type.startsWith(type));
    });
  };

  // 소득/순위 칩 활성화 판별 (현재 선택된 신청 대상 기준)
  const isIncomeValid = (income: string) => {
    return units.some((u) => {
      const comboKey = `${u.supply_type || ''}_${u.target_group || ''}`;
      return (selectedType === 'ALL' || (u.room_type && u.room_type.startsWith(selectedType))) &&
             (selectedTarget === 'ALL' || comboKey === selectedTarget) &&
             (u.income_group === income);
    });
  };

  // 공급유형 + 신청대상 결합 한글 라벨 생성 헬퍼 함수
  const getTargetLabel = (supplyType: string | null, targetGroup: string | null) => {
    if (!supplyType && !targetGroup) return '정보 없음';
    
    const formattedTarget = targetGroup ? formatTargetGroup(targetGroup) : null;
    
    if (supplyType && formattedTarget) {
      if (supplyType === formattedTarget) return supplyType;
      if (formattedTarget === '상관없음') return supplyType;
      return `${supplyType} (${formattedTarget})`;
    }
    return supplyType || formattedTarget || '정보 없음';
  };

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
            {complex.is_imprecise === 1 && (
              <span className={styles['imprecise-badge']} title="해당 단지는 신도시 등 임시 주소 상태로, 지도 상의 대략적인 예정지 위치(도/동)에 마커가 매핑되었습니다.">
                미확정 주소
              </span>
            )}
          </span>
        </div>
        <button className={styles['panel-close-btn']} onClick={onClose}>✕</button>
      </div>

      <div className={styles['panel-body']}>
        <div>
          <h4 className={styles['panel-section-title']}>단지 기본 정보</h4>
          <div className={styles['info-grid']}>
            <div className={styles['info-card']}>
              <span className={styles['info-label']}>단지 유형</span>
              <span className={styles['info-val']}>{complex.complex_type || '정보 없음'}</span>
            </div>
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
            <div className={styles['info-card']}>
              <span className={styles['info-label']}>주차 정보</span>
              <span className={styles['info-val']}>{complex.parking_info || '정보 없음'}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className={styles['panel-section-title']}>주택형별 공급 및 가격 정보</h4>
          
          <div className={styles['panel-filter-row']}>
            {/* 신청 대상 (공급유형+신청대상 그룹화) 필터 칩 탭 */}
            {!loading && targetCombos.length > 0 && (
              <div className={styles['filter-group-wrap']}>
                <span className={styles['filter-label']}>신청 대상:</span>
                <div className={styles['filter-tabs-container']}>
                  {targetCombos.map((combo) => {
                    const [supplyType, targetGroup] = combo.split('_');
                    const label = getTargetLabel(supplyType || null, targetGroup || null);
                    return (
                      <button
                        key={combo}
                        className={`${styles['filter-tab-btn']} ${selectedTarget === combo ? styles.active : ''}`}
                        onClick={() => setSelectedTarget(combo)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 소득/순위 필터 칩 탭 */}
            {!loading && incomeGroups.length > 0 && (
              <div className={styles['filter-group-wrap']}>
                <span className={styles['filter-label']}>소득/순위:</span>
                <div className={styles['filter-tabs-container']}>
                  {incomeGroups.map((income) => {
                    const isValid = isIncomeValid(income);
                    return (
                      <button
                        key={income}
                        className={`${styles['filter-tab-btn']} ${selectedIncome === income ? styles.active : ''}`}
                        disabled={!isValid}
                        onClick={() => setSelectedIncome(income)}
                      >
                        {income}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}


            {/* 주택형 필터 칩 탭 */}
            {!loading && units.length > 0 && (
              <div className={styles['filter-group-wrap']}>
                <span className={styles['filter-label']}>주택형:</span>
                <div className={styles['filter-tabs-container']}>
                  <button
                    className={`${styles['filter-tab-btn']} ${selectedType === 'ALL' ? styles.active : ''}`}
                    onClick={() => setSelectedType('ALL')}
                  >
                    전체
                  </button>
                  {baseTypes.map((type) => {
                    const isValid = isTypeValid(type);
                    return (
                      <button
                        key={type}
                        className={`${styles['filter-tab-btn']} ${selectedType === type ? styles.active : ''}`}
                        disabled={!isValid}
                        onClick={() => setSelectedType(type)}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className={styles['loading-msg']}>공급 정보를 불러오는 중입니다...</div>
          ) : filteredUnits.length === 0 ? (
            <div className={styles['empty-msg']}>조건에 맞는 공급 주택형이 없습니다.</div>
          ) : (
            <UnitTable
              units={filteredUnits}
              sliderValues={sliderValues}
              onSliderChange={handleSliderChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

