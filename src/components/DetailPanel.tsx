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

export default function DetailPanel({ complex, isOpen, filterState, onClose }: DetailPanelProps) {
  const [units, setUnits] = useState<HousingUnit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!complex) return;

    setLoading(true);
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
              {filteredUnits.map((unit) => (
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
                      <span className="price-val">{formatMoney(unit.deposit)}</span>
                    </div>
                    <div className="price-item">
                      <span className="price-lbl">월 임대료</span>
                      <span className="price-val" style={{ color: 'hsl(var(--accent-hover))' }}>
                        {formatRent(unit.monthly_rent)}
                      </span>
                    </div>
                  </div>

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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
