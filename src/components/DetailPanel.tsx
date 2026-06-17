"use client";

import { useEffect, useState } from 'react';

interface Complex {
  id: number;
  announcement_id: number;
  name: string;
  address: string;
  heating_type?: string;
  has_elevator?: boolean;
  parking_info?: string;
}

interface HousingUnit {
  id: number;
  announcement_id: number;
  complex_id: number;
  room_number: string | null;
  room_count: number | null;
  supply_type: string | null;
  exclusive_area: number;
  contract_area: number | null;
  target_group: string | null;
  income_group: string | null;
  supply_count: number;
  reserve_count: number;
  deposit: number;
  monthly_rent: number;
  attributes: string | null;
}

interface Announcement {
  id: number;
  title: string;
  institution: string;
  subscription_type: string;
  doc_path: string;
  deposit_increase_rate: number | null;
  deposit_decrease_rate: number | null;
  deposit_increase_limit_rate: number | null;
  deposit_decrease_limit_rate: number | null;
}

interface FilterState {
  targetGroup: string;
  minArea: number;
  maxArea: number;
  minDeposit: number;
  maxDeposit: number;
  minMonthlyRent: number;
  maxMonthlyRent: number;
}

interface DetailPanelProps {
  complex: Complex | null;
  isOpen: boolean;
  filterState: FilterState;
  announcements: Announcement[];
  onClose: () => void;
}

const formatMoney = (amount: number | null): string => {
  if (amount === null || amount === undefined) return '-';
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);
    return `${eok}억 ${man > 0 ? man.toLocaleString() + '만' : ''}원`;
  }
  if (amount >= 10000) {
    return `${(amount / 10000).toLocaleString()}만 원`;
  }
  return `${amount.toLocaleString()}원`;
};

const formatRent = (amount: number | null): string => {
  if (amount === null || amount === undefined) return '-';
  return `${amount.toLocaleString()}원`;
};

/**
 * 보증금 ↔ 월세 전환 계산 함수
 * sliderValue: -100 (보증금 최대 감액) ~ 0 (기준) ~ +100 (보증금 최대 증액)
 */
function calcConversion(
  baseDeposit: number,
  baseRent: number,
  sliderValue: number,
  increaseRate: number | null,
  decreaseRate: number | null,
  increaseLimitRate: number | null,
  decreaseLimitRate: number | null,
): { deposit: number; rent: number } {
  if (sliderValue === 0) {
    return { deposit: baseDeposit, rent: baseRent };
  }

  if (sliderValue > 0 && increaseRate && increaseRate > 0) {
    // 보증금 증액 (월세 → 보증금): 월세를 보증금으로 전환
    const limitRate = (increaseLimitRate ?? 0) / 100;
    const maxConvertibleRent = baseRent * limitRate;
    const ratio = sliderValue / 100;
    const convertRent = maxConvertibleRent * ratio;
    const addDeposit = Math.round((convertRent * 12) / (increaseRate / 100));
    return {
      deposit: baseDeposit + addDeposit,
      rent: Math.round(baseRent - convertRent),
    };
  }

  if (sliderValue < 0 && decreaseRate && decreaseRate > 0) {
    // 보증금 감액 (보증금 → 월세): 보증금을 월세로 전환
    const limitRate = (decreaseLimitRate ?? 0) / 100;
    const maxConvertibleDeposit = baseDeposit * limitRate;
    const ratio = Math.abs(sliderValue) / 100;
    const reduceDeposit = maxConvertibleDeposit * ratio;
    const addRent = Math.floor((reduceDeposit * (decreaseRate / 100)) / 12 / 100) * 100;
    return {
      deposit: Math.round(baseDeposit - reduceDeposit),
      rent: baseRent + addRent,
    };
  }

  return { deposit: baseDeposit, rent: baseRent };
}

export default function DetailPanel({ complex, isOpen, filterState, announcements, onClose }: DetailPanelProps) {
  const [units, setUnits] = useState<HousingUnit[]>([]);
  const [loading, setLoading] = useState(false);
  // 각 unit ID별 슬라이더 값 (-100 ~ +100)
  const [sliderValues, setSliderValues] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!complex) return;

    setLoading(true);
    // 패널 전환 시 슬라이더 초기화
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

  // 현재 단지가 속한 공고의 전환 이율 조회
  const announcement = complex
    ? announcements.find((a) => a.id === complex.announcement_id)
    : null;

  const hasConversion = announcement && (
    announcement.deposit_increase_rate !== null ||
    announcement.deposit_decrease_rate !== null
  );

  // 슬라이더의 활성 방향 결정
  const canIncrease = !!(announcement?.deposit_increase_rate && announcement?.deposit_increase_limit_rate);
  const canDecrease = !!(announcement?.deposit_decrease_rate && announcement?.deposit_decrease_limit_rate);

  const getSliderMin = () => canDecrease ? -100 : 0;
  const getSliderMax = () => canIncrease ? 100 : 0;

  const handleSliderChange = (unitId: number, value: number) => {
    setSliderValues((prev) => ({ ...prev, [unitId]: value }));
  };

  if (!complex) return null;

  return (
    <div className={`app-detail-panel ${isOpen ? 'open' : ''}`}>
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title-container">
          <span className="panel-title">{complex.name}</span>
          <span className="panel-subtitle">📍 {complex.address}</span>
        </div>
        <button className="panel-close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="panel-body">
        {/* Section 1: 단지 제원 요약 */}
        <div>
          <h4 className="panel-section-title">단지 기본 정보</h4>
          <div className="info-grid">
            <div className="info-card">
              <span className="info-label">난방 방식</span>
              <span className="info-val">{complex.heating_type || '정보 없음'}</span>
            </div>
            <div className="info-card">
              <span className="info-label">엘리베이터</span>
              <span className="info-val">
                {complex.has_elevator === undefined || complex.has_elevator === null 
                  ? '정보 없음' 
                  : complex.has_elevator 
                    ? '있음' 
                    : '없음'}
              </span>
            </div>
            <div className="info-card" style={{ gridColumn: 'span 2' }}>
              <span className="info-label">주차 정보</span>
              <span className="info-val">{complex.parking_info || '정보 없음'}</span>
            </div>
          </div>
        </div>

        {/* Section 2: 평형별 세부 임대료/공급조건 */}
        <div>
          <h4 className="panel-section-title">주택형별 공급 및 가격 정보</h4>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'hsl(var(--text-muted))' }}>
              공급 정보를 불러오는 중입니다...
            </div>
          ) : filteredUnits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'hsl(var(--text-muted))' }}>
              조건에 맞는 공급 주택형이 없습니다.
            </div>
          ) : (
            <div className="units-container">
              {filteredUnits.map((unit) => {
                const sliderVal = sliderValues[unit.id] ?? 0;
                const converted = hasConversion
                  ? calcConversion(
                      unit.deposit,
                      unit.monthly_rent,
                      sliderVal,
                      announcement!.deposit_increase_rate,
                      announcement!.deposit_decrease_rate,
                      announcement!.deposit_increase_limit_rate,
                      announcement!.deposit_decrease_limit_rate,
                    )
                  : null;

                return (
                  <div key={unit.id} className="unit-card">
                    {/* 주택형 상단 */}
                    <div className="unit-header">
                      <span className="unit-supply-type">
                        {unit.supply_type || `${unit.exclusive_area}형`} 
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'hsl(var(--text-secondary))', marginLeft: '6px' }}>
                          ({unit.exclusive_area.toFixed(2)}㎡ / ~{Math.round(unit.exclusive_area * 0.3025)}평)
                        </span>
                      </span>
                      {unit.target_group && (
                        <span className="unit-target">{unit.target_group}</span>
                      )}
                    </div>

                    {/* 임대 보증금 / 월세 */}
                    <div className="unit-price-box">
                      <div className="price-item">
                        <span className="price-lbl">임대보증금</span>
                        <span className="price-val">
                          {converted && sliderVal !== 0 ? formatMoney(converted.deposit) : formatMoney(unit.deposit)}
                        </span>
                      </div>
                      <div className="price-item">
                        <span className="price-lbl">월 임대료</span>
                        <span className="price-val" style={{ color: 'hsl(var(--accent-hover))' }}>
                          {converted && sliderVal !== 0 ? formatRent(converted.rent) : formatRent(unit.monthly_rent)}
                        </span>
                      </div>
                    </div>

                    {/* 보증금 ↔ 월세 전환 슬라이더 */}
                    {hasConversion && unit.monthly_rent > 0 && (
                      <div className="conversion-slider-box">
                        <div className="conversion-slider-header">
                          <span className="conversion-slider-icon">🔄</span>
                          <span className="conversion-slider-title">보증금 ↔ 월세 전환</span>
                          {sliderVal !== 0 && (
                            <button
                              className="conversion-reset-btn"
                              onClick={() => handleSliderChange(unit.id, 0)}
                            >
                              초기화
                            </button>
                          )}
                        </div>
                        <div className="conversion-slider-track-wrap">
                          <span className="conversion-slider-label left">보증금↓</span>
                          <input
                            type="range"
                            className="conversion-slider"
                            min={getSliderMin()}
                            max={getSliderMax()}
                            step={1}
                            value={sliderVal}
                            onChange={(e) => handleSliderChange(unit.id, parseInt(e.target.value, 10))}
                          />
                          <span className="conversion-slider-label right">보증금↑</span>
                        </div>
                        {sliderVal !== 0 && converted && (
                          <div className="conversion-result">
                            <div className="conversion-result-item">
                              <span className="conversion-result-lbl">전환 후 보증금</span>
                              <span className="conversion-result-val">
                                {formatMoney(converted.deposit)}
                                <span className={`conversion-diff ${sliderVal > 0 ? 'up' : 'down'}`}>
                                  {sliderVal > 0 ? '▲' : '▼'} {formatMoney(Math.abs(converted.deposit - unit.deposit))}
                                </span>
                              </span>
                            </div>
                            <div className="conversion-result-item">
                              <span className="conversion-result-lbl">전환 후 월 임대료</span>
                              <span className="conversion-result-val rent">
                                {formatRent(converted.rent)}
                                <span className={`conversion-diff ${sliderVal > 0 ? 'down' : 'up'}`}>
                                  {sliderVal > 0 ? '▼' : '▲'} {formatRent(Math.abs(converted.rent - unit.monthly_rent))}
                                </span>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 추가 데이터 */}
                    <div className="unit-meta-list" style={{ borderTop: '1px dashed hsl(var(--border))', paddingTop: '8px', marginTop: '4px' }}>
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
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
