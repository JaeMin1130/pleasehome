"use client";

import { useEffect, useState } from 'react';
import { Complex, HousingUnit, Announcement, FilterState, BookmarkFolder } from '@/types';
import UnitTable from '@/components/features/UnitTable';
import { formatTargetGroup, formatMoney, formatRent } from '@/utils/formatters';
import styles from './DetailPanel.module.css';

interface DetailPanelProps {
  complex: Complex | null;
  isOpen: boolean;
  filterState: FilterState;
  announcements: Announcement[];
  onClose: () => void;
  style?: React.CSSProperties;
  bookmarkedIds: number[];
  onToggleBookmark: (complexId: number) => void;
  comparisonFolder?: BookmarkFolder | null;
  comparisonComplexes?: Complex[];
}

export default function DetailPanel({ 
  complex, isOpen, filterState, announcements, onClose, style,
  bookmarkedIds, onToggleBookmark,
  comparisonFolder = null,
  comparisonComplexes = []
}: DetailPanelProps) {
  const [units, setUnits] = useState<HousingUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [sliderValues, setSliderValues] = useState<Record<number, number>>({});
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedTarget, setSelectedTarget] = useState<string>('ALL');
  const [selectedIncome, setSelectedIncome] = useState<string>('ALL');

  // 스펙 비교용 단지별 주택형 정보 상태
  const [comparisonUnits, setComparisonUnits] = useState<Record<number, HousingUnit[]>>({});

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

  // 💡 비교 모드 시 각 단지들의 평형 유닛 데이터를 동적으로 로딩
  useEffect(() => {
    if (!comparisonFolder || comparisonComplexes.length === 0) return;
    comparisonComplexes.forEach((c) => {
      fetch(`/api/housing-units?complex_id=${c.id}`)
        .then((res) => res.json())
        .then((data) => {
          setComparisonUnits((prev) => ({ ...prev, [c.id]: data }));
        })
        .catch((err) => console.error("Failed to load comparison units for complex " + c.id, err));
    });
  }, [comparisonFolder, comparisonComplexes]);

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

  if (!complex && !comparisonFolder) return null;

  // 💡 스펙 비교 패널을 렌더링할 때의 리턴 블록
  if (comparisonFolder) {
    return (
      <aside 
        className={`${styles['app-detail-panel']} ${isOpen ? styles.open : ''}`}
        style={style}
      >
        <div className={styles['panel-header']}>
          <div className={styles['panel-title-wrapper']}>
            <h2 className={styles['panel-title']}>
              {comparisonFolder.name} 단지 비교
            </h2>
            <p className={styles['panel-subtitle']}>
              폴더 내 저장된 단지들의 상세 스펙을 가로로 한눈에 대조합니다.
            </p>
          </div>
          <button className={styles['panel-close-btn']} onClick={onClose}>✕</button>
        </div>

        <div className={styles['comparison-body']}>
          {comparisonComplexes.length === 0 ? (
            <div className={styles['empty-comparison-msg']}>
              비교할 단지가 없습니다.<br />폴더에 찜한 단지를 추가해 보세요.
            </div>
          ) : (
            <div className={styles['comparison-table-wrapper']}>
              <table className={styles['comparison-table']}>
                <thead>
                  <tr>
                    <th className={styles['comp-header-label']}>단지명</th>
                    {comparisonComplexes.map((c) => (
                      <th key={c.id} className={styles['comp-header-val']}>
                        <span className={styles['comp-name']}>{c.name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={styles['comp-label']}>단지 유형</td>
                    {comparisonComplexes.map((c) => (
                      <td key={c.id} className={styles['comp-val']}>{c.complex_type || '정보 없음'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className={styles['comp-label']}>소속 공고</td>
                    {comparisonComplexes.map((c) => {
                      const ann = announcements.find(a => a.id === c.announcement_id);
                      return <td key={c.id} className={styles['comp-val-text']} title={ann?.title}>{ann?.title || '-'}</td>;
                    })}
                  </tr>
                  <tr>
                    <td className={styles['comp-label']}>임대 보증금</td>
                    {comparisonComplexes.map((c) => {
                      const unitsData = comparisonUnits[c.id] || [];
                      if (unitsData.length === 0) return <td key={c.id} className={styles['comp-val']}>로딩 중...</td>;
                      const deposits = unitsData.map(u => u.deposit).filter((d): d is number => d !== null);
                      if (deposits.length === 0) return <td key={c.id} className={styles['comp-val']}>-</td>;
                      const minDep = Math.min(...deposits);
                      const maxDep = Math.max(...deposits);
                      return (
                        <td key={c.id} className={styles['comp-val']}>
                          {minDep === maxDep ? formatMoney(minDep) : `${formatMoney(minDep)} ~ ${formatMoney(maxDep)}`}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className={styles['comp-label']}>월 임대료</td>
                    {comparisonComplexes.map((c) => {
                      const unitsData = comparisonUnits[c.id] || [];
                      if (unitsData.length === 0) return <td key={c.id} className={styles['comp-val']}>로딩 중...</td>;
                      const rents = unitsData.map(u => u.monthly_rent).filter((r): r is number => r !== null);
                      if (rents.length === 0) return <td key={c.id} className={styles['comp-val']}>-</td>;
                      const minRent = Math.min(...rents);
                      const maxRent = Math.max(...rents);
                      return (
                        <td key={c.id} className={styles['comp-val']}>
                          {minRent === maxRent ? formatRent(minRent) : `${formatRent(minRent)} ~ ${formatRent(maxRent)}`}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className={styles['comp-label']}>전용 면적</td>
                    {comparisonComplexes.map((c) => {
                      const unitsData = comparisonUnits[c.id] || [];
                      if (unitsData.length === 0) return <td key={c.id} className={styles['comp-val']}>로딩 중...</td>;
                      const areas = unitsData.map(u => u.exclusive_area).filter((a): a is number => a !== null);
                      if (areas.length === 0) return <td key={c.id} className={styles['comp-val']}>-</td>;
                      const minArea = Math.min(...areas);
                      const maxArea = Math.max(...areas);
                      return (
                        <td key={c.id} className={styles['comp-val']}>
                          {minArea === maxArea ? `${minArea.toFixed(2)}㎡` : `${minArea.toFixed(2)}㎡ ~ ${maxArea.toFixed(2)}㎡`}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className={styles['comp-label']}>공급 호수</td>
                    {comparisonComplexes.map((c) => {
                      const unitsData = comparisonUnits[c.id] || [];
                      if (unitsData.length === 0) return <td key={c.id} className={styles['comp-val']}>로딩 중...</td>;
                      const supplySum = unitsData.reduce((sum, u) => sum + (u.supply_count || 0), 0);
                      const reserveSum = unitsData.reduce((sum, u) => sum + (u.reserve_count || 0), 0);
                      return (
                        <td key={c.id} className={styles['comp-val']}>
                          {supplySum}호{reserveSum > 0 && ` (예비 ${reserveSum}호)`}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className={styles['comp-label']}>주차 정보</td>
                    {comparisonComplexes.map((c) => (
                      <td key={c.id} className={styles['comp-val']}>{c.parking_info || '정보 없음'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className={styles['comp-label']}>난방 방식</td>
                    {comparisonComplexes.map((c) => (
                      <td key={c.id} className={styles['comp-val']}>{c.heating_type || '정보 없음'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className={styles['comp-label']}>엘리베이터</td>
                    {comparisonComplexes.map((c) => (
                      <td key={c.id} className={styles['comp-val']}>
                        {c.has_elevator === null ? '정보 없음' : c.has_elevator ? '있음' : '없음'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </aside>
    );
  }

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

  const isBookmarked = bookmarkedIds.includes(complex.id);

  return (
    <div className={`${styles['app-detail-panel']} ${isOpen ? styles.open : ''}`} style={style}>
      <div className={styles['panel-header']}>
        <div className={styles['panel-title-container']}>
          <span className={styles['panel-title']}>{complex.name}</span>

        </div>
        <div className={styles['panel-header-actions']}>
          <button 
            className={`${styles['bookmark-btn']} ${isBookmarked ? styles.bookmarked : ''}`}
            onClick={() => onToggleBookmark(complex.id)}
            title={isBookmarked ? "저장한 단지 해제" : "단지 저장하기"}
          >
            <svg className={styles['star-icon']} width="24" height="24" viewBox="0 0 24 24" fill={isBookmarked ? 'var(--color-warning-text)' : 'none'} stroke={isBookmarked ? 'var(--color-warning-text)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
          <button className={styles['panel-close-btn']} onClick={onClose}>✕</button>
        </div>
      </div>

      <div className={styles['panel-body']}>
        <div>
          <h4 className={styles['panel-section-title']}>단지 기본 정보</h4>
          <div className={styles['info-grid']}>
            <div className={`${styles['info-card']} ${styles['full-width']}`}>
              <span className={styles['info-label']}>단지 주소</span>
              <span className={`${styles['info-val']} ${styles['address-val-wrapper']}`}>
                {complex.address}
                {Number(complex.is_imprecise) === 1 && (
                  <span className={styles['imprecise-badge']} title="해당 단지는 신도시 등 임시 주소 상태로, 지도 상의 대략적인 예정지 위치(도/동)에 마커가 매핑되었습니다.">
                    미확정 주소
                  </span>
                )}
              </span>
            </div>
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

