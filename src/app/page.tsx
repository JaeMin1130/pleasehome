"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import DetailPanel from '@/components/DetailPanel';

// 네이버 지도 API는 window 객체를 필요로 하므로 Next.js SSR을 피하기 위해 dynamic 클라이언트 로딩 적용
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'hsl(var(--text-muted))', backgroundColor: 'hsl(var(--bg-primary))' }}>
      지도를 로드하고 있습니다...
    </div>
  )
});

interface Schedule {
  id: number;
  schedule_type: string;
  start_date: string | null;
  end_date: string | null;
  raw_text: string | null;
  notes: string | null;
}

interface Detail {
  id: number;
  section_title: string;
  section_content: string;
  sort_order: number;
}

interface Limit {
  id: number;
  target_group: string | null;
  max_support_amount: number | null;
  deposit_limit: number | null;
  tenant_share: number | null;
  interest_rate: number | null;
  max_monthly_rent: number | null;
  notes: string | null;
}

interface Announcement {
  id: number;
  title: string;
  institution: string;
  subscription_type: string;
  doc_path: string;
  schedules: Schedule[];
  details: Detail[];
  limits: Limit[];
}

interface FilterState {
  targetGroup: string;
  minArea: number;
  maxArea: number;
  minDeposit: number;
  maxDeposit: number;
  minMonthlyRent: number;
  maxMonthlyRent: number;
  hasElevator: boolean | null;
}

interface Complex {
  id: number;
  announcement_id: number;
  name: string;
  address: string;
  heating_type?: string;
  has_elevator?: boolean;
  parking_info?: string;
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

export default function Home() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [allComplexes, setAllComplexes] = useState<Complex[]>([]);
  const [announcementUnits, setAnnouncementUnits] = useState<any[]>([]);
  
  // 상태 관리
  const [activeAnnId, setActiveAnnId] = useState<number | null>(null);
  const [activeComplexId, setActiveComplexId] = useState<number | null>(null);
  const [selectedComplex, setSelectedComplex] = useState<Complex | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // 필터 상태
  const [filterState, setFilterState] = useState<FilterState>({
    targetGroup: 'ALL',
    minArea: 10,
    maxArea: 100,
    minDeposit: 0,
    maxDeposit: 200000000,
    minMonthlyRent: 0,
    maxMonthlyRent: 1500000,
    hasElevator: null
  });

  // 초기 공고 및 단지 로드
  useEffect(() => {
    // 1. 공고 로드
    fetch('/api/announcements')
      .then(res => res.json())
      .then(data => setAnnouncements(data))
      .catch(err => console.error('Failed to fetch announcements', err));

    // 2. 전체 단지 로드
    fetch('/api/complexes')
      .then(res => res.json())
      .then(data => setAllComplexes(data))
      .catch(err => console.error('Failed to fetch complexes', err));
  }, []);

  // 공고 선택 시 유닛 로드 및 필터 범위 동적 초기화
  useEffect(() => {
    if (activeAnnId === null) {
      setAnnouncementUnits([]);
      return;
    }
    fetch(`/api/housing-units?announcement_id=${activeAnnId}`)
      .then(res => res.json())
      .then(data => {
        setAnnouncementUnits(data);
        if (data && data.length > 0) {
          const minAreaVal = Math.floor(Math.min(...data.map((u: any) => u.exclusive_area || 0)));
          const maxAreaVal = Math.ceil(Math.max(...data.map((u: any) => u.exclusive_area || 0)));
          const minDep = Math.min(...data.map((u: any) => u.deposit || 0));
          const maxDep = Math.max(...data.map((u: any) => u.deposit || 0));
          const minRent = Math.min(...data.map((u: any) => u.monthly_rent || 0));
          const maxRent = Math.max(...data.map((u: any) => u.monthly_rent || 0));

          setFilterState({
            targetGroup: 'ALL',
            minArea: minAreaVal,
            maxArea: maxAreaVal,
            minDeposit: minDep,
            maxDeposit: maxDep,
            minMonthlyRent: minRent,
            maxMonthlyRent: maxRent,
            hasElevator: null
          });
        } else {
          setFilterState({
            targetGroup: 'ALL',
            minArea: 10,
            maxArea: 100,
            minDeposit: 0,
            maxDeposit: 200000000,
            minMonthlyRent: 0,
            maxMonthlyRent: 1500000,
            hasElevator: null
          });
        }
      })
      .catch(err => console.error('Failed to fetch units', err));
  }, [activeAnnId]);

  // 동적 최소/최대값 계산 (슬라이더 범위용)
  const dynamicMinArea = announcementUnits.length > 0 
    ? Math.floor(Math.min(...announcementUnits.map(u => u.exclusive_area || 0))) 
    : 10;
  
  const dynamicMaxArea = announcementUnits.length > 0 
    ? Math.ceil(Math.max(...announcementUnits.map(u => u.exclusive_area || 0))) 
    : 100;

  const dynamicMinDeposit = announcementUnits.length > 0 
    ? Math.min(...announcementUnits.map(u => u.deposit || 0)) 
    : 0;

  const dynamicMaxDeposit = announcementUnits.length > 0 
    ? Math.max(...announcementUnits.map(u => u.deposit || 0)) 
    : 200000000;
  
  const dynamicMinRent = announcementUnits.length > 0 
    ? Math.min(...announcementUnits.map(u => u.monthly_rent || 0)) 
    : 0;

  const dynamicMaxRent = announcementUnits.length > 0 
    ? Math.max(...announcementUnits.map(u => u.monthly_rent || 0)) 
    : 1500000;

  // 공고 선택 시 단지 필터링
  const displayComplexes = activeAnnId 
    ? allComplexes.filter(c => c.announcement_id === activeAnnId)
    : [];

  // 필터링 적용된 단지 목록
  const filteredComplexes = displayComplexes.filter(complex => {
    // 엘리베이터 필터링
    if (filterState.hasElevator !== null) {
      const rawElev = complex.has_elevator as any;
      const hasElev = rawElev === 1 || rawElev === true;
      if (hasElev !== filterState.hasElevator) {
        return false;
      }
    }

    const complexUnits = announcementUnits.filter(u => u.complex_id === complex.id);
    
    // 유닛 데이터 로드 전에는 단지를 임시 노출
    if (announcementUnits.length === 0) return true;

    return complexUnits.some(unit => {
      // 대상군 필터
      if (filterState.targetGroup !== 'ALL') {
        if (unit.target_group !== filterState.targetGroup) return false;
      }
      // 면적 필터
      if (unit.exclusive_area < filterState.minArea || unit.exclusive_area > filterState.maxArea) return false;
      // 보증금 필터
      if (unit.deposit < filterState.minDeposit || unit.deposit > filterState.maxDeposit) return false;
      // 월세 필터
      if (unit.monthly_rent < filterState.minMonthlyRent || unit.monthly_rent > filterState.maxMonthlyRent) return false;

      return true;
    });
  });

  // 선택된 공고 정보 객체
  const activeAnn = announcements.find(a => a.id === activeAnnId);

  // 단지 정보가 없는 정책 공고(예: 전세임대) 여부 판별
  const isPolicyOnly = activeAnnId !== null && displayComplexes.length === 0;

  // 공고 선택 핸들러
  const handleSelectAnnouncement = (id: number | null) => {
    setActiveAnnId(id);
    setActiveComplexId(null);
    setSelectedComplex(null);
    setIsPanelOpen(false);
  };

  // 단지 선택 핸들러 (마커 클릭 시)
  const handleSelectComplex = (complex: Complex) => {
    setSelectedComplex(complex);
    setActiveComplexId(complex.id);
    setIsPanelOpen(true);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <div className="logo-icon">🏢</div>
          <h1 className="header-title">공공맵 (Public Housing Map)</h1>
        </div>
        <div className="header-meta">
          <span>맞춤형 공공청약 정보 연동 서비스</span>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="app-main">
        {/* Left Sidebar (Search, Cards, Accordions) */}
        <Sidebar 
          announcements={announcements} 
          activeAnnId={activeAnnId} 
          onSelectAnnouncement={handleSelectAnnouncement} 
        />

        {/* Center Map Area */}
        <div className="app-map-container">
          <Map 
            complexes={filteredComplexes} 
            activeComplexId={activeComplexId}
            onSelectComplex={handleSelectComplex}
          />
          
          {/* 맵 내부 오버레이 필터 */}
          {activeAnnId && !isPolicyOnly && (
            <div className={`map-filter-overlay ${isFilterExpanded ? 'expanded' : 'collapsed'}`}>
              <div className="overlay-header" onClick={() => setIsFilterExpanded(!isFilterExpanded)}>
                <span className="overlay-title">🔍 맞춤 조건 필터링</span>
                <span className="overlay-toggle-icon">{isFilterExpanded ? '▲' : '▼'}</span>
              </div>
              
              {isFilterExpanded && (
                <div className="overlay-body">
                  {/* 1. 신청 대상 */}
                  <div className="filter-group">
                    <span className="filter-label">신청 대상</span>
                    <div className="filter-chips">
                      {['ALL', '일반', '청년', '신혼부부', '고령자', '주거약자', '생계·의료급여수급자'].map((group) => (
                        <button
                          key={group}
                          className={`filter-chip ${filterState.targetGroup === group ? 'active' : ''}`}
                          onClick={() => setFilterState({ ...filterState, targetGroup: group })}
                        >
                          {group === 'ALL' ? '전체' : group}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. 전용면적 범위 */}
                  <div className="filter-group">
                    <div className="filter-label-row">
                      <span className="filter-label">전용면적</span>
                      <span className="filter-val-text">
                        {filterState.minArea}㎡ ~ {filterState.maxArea}㎡ (약 {Math.round(filterState.minArea * 0.3025)}평 ~ {Math.round(filterState.maxArea * 0.3025)}평)
                      </span>
                    </div>
                    <div className="double-slider-container">
                      <input
                        type="range"
                        min={dynamicMinArea}
                        max={dynamicMaxArea}
                        step="1"
                        value={filterState.minArea}
                        onChange={(e) => {
                          const val = Math.min(parseInt(e.target.value), filterState.maxArea - 1);
                          setFilterState({ ...filterState, minArea: val });
                        }}
                        className="thumb thumb--left"
                      />
                      <input
                        type="range"
                        min={dynamicMinArea}
                        max={dynamicMaxArea}
                        step="1"
                        value={filterState.maxArea}
                        onChange={(e) => {
                          const val = Math.max(parseInt(e.target.value), filterState.minArea + 1);
                          setFilterState({ ...filterState, maxArea: val });
                        }}
                        className="thumb thumb--right"
                      />
                      <div className="slider-track-track" />
                      <div 
                        className="slider-track-range" 
                        style={{
                          left: `${((filterState.minArea - dynamicMinArea) / (dynamicMaxArea - dynamicMinArea || 1)) * 100}%`,
                          width: `${((filterState.maxArea - filterState.minArea) / (dynamicMaxArea - dynamicMinArea || 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* 3. 임대보증금 범위 */}
                  <div className="filter-group">
                    <div className="filter-label-row">
                      <span className="filter-label">임대보증금</span>
                      <span className="filter-val-text">
                        {formatMoney(filterState.minDeposit)} ~ {formatMoney(filterState.maxDeposit)}
                      </span>
                    </div>
                    <div className="double-slider-container">
                      <input
                        type="range"
                        min={dynamicMinDeposit}
                        max={dynamicMaxDeposit}
                        step={dynamicMaxDeposit - dynamicMinDeposit > 10000000 ? Math.floor((dynamicMaxDeposit - dynamicMinDeposit) / 20) : 1000000}
                        value={filterState.minDeposit}
                        onChange={(e) => {
                          const stepVal = dynamicMaxDeposit - dynamicMinDeposit > 10000000 ? Math.floor((dynamicMaxDeposit - dynamicMinDeposit) / 20) : 1000000;
                          const val = Math.min(parseInt(e.target.value), filterState.maxDeposit - stepVal);
                          setFilterState({ ...filterState, minDeposit: val });
                        }}
                        className="thumb thumb--left"
                      />
                      <input
                        type="range"
                        min={dynamicMinDeposit}
                        max={dynamicMaxDeposit}
                        step={dynamicMaxDeposit - dynamicMinDeposit > 10000000 ? Math.floor((dynamicMaxDeposit - dynamicMinDeposit) / 20) : 1000000}
                        value={filterState.maxDeposit}
                        onChange={(e) => {
                          const stepVal = dynamicMaxDeposit - dynamicMinDeposit > 10000000 ? Math.floor((dynamicMaxDeposit - dynamicMinDeposit) / 20) : 1000000;
                          const val = Math.max(parseInt(e.target.value), filterState.minDeposit + stepVal);
                          setFilterState({ ...filterState, maxDeposit: val });
                        }}
                        className="thumb thumb--right"
                      />
                      <div className="slider-track-track" />
                      <div 
                        className="slider-track-range" 
                        style={{
                          left: `${((filterState.minDeposit - dynamicMinDeposit) / (dynamicMaxDeposit - dynamicMinDeposit || 1)) * 100}%`,
                          width: `${((filterState.maxDeposit - filterState.minDeposit) / (dynamicMaxDeposit - dynamicMinDeposit || 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* 4. 월 임대료 범위 */}
                  <div className="filter-group">
                    <div className="filter-label-row">
                      <span className="filter-label">월 임대료</span>
                      <span className="filter-val-text">
                        {formatRent(filterState.minMonthlyRent)} ~ {formatRent(filterState.maxMonthlyRent)}
                      </span>
                    </div>
                    <div className="double-slider-container">
                      <input
                        type="range"
                        min={dynamicMinRent}
                        max={dynamicMaxRent}
                        step={dynamicMaxRent - dynamicMinRent > 100000 ? Math.floor((dynamicMaxRent - dynamicMinRent) / 20) : 10000}
                        value={filterState.minMonthlyRent}
                        onChange={(e) => {
                          const stepVal = dynamicMaxRent - dynamicMinRent > 100000 ? Math.floor((dynamicMaxRent - dynamicMinRent) / 20) : 10000;
                          const val = Math.min(parseInt(e.target.value), filterState.maxMonthlyRent - stepVal);
                          setFilterState({ ...filterState, minMonthlyRent: val });
                        }}
                        className="thumb thumb--left"
                      />
                      <input
                        type="range"
                        min={dynamicMinRent}
                        max={dynamicMaxRent}
                        step={dynamicMaxRent - dynamicMinRent > 100000 ? Math.floor((dynamicMaxRent - dynamicMinRent) / 20) : 10000}
                        value={filterState.maxMonthlyRent}
                        onChange={(e) => {
                          const stepVal = dynamicMaxRent - dynamicMinRent > 100000 ? Math.floor((dynamicMaxRent - dynamicMinRent) / 20) : 10000;
                          const val = Math.max(parseInt(e.target.value), filterState.minMonthlyRent + stepVal);
                          setFilterState({ ...filterState, maxMonthlyRent: val });
                        }}
                        className="thumb thumb--right"
                      />
                      <div className="slider-track-track" />
                      <div 
                        className="slider-track-range" 
                        style={{
                          left: `${((filterState.minMonthlyRent - dynamicMinRent) / (dynamicMaxRent - dynamicMinRent || 1)) * 100}%`,
                          width: `${((filterState.maxMonthlyRent - filterState.minMonthlyRent) / (dynamicMaxRent - dynamicMinRent || 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* 5. 엘리베이터 및 초기화 */}
                  <div className="filter-row-footer">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={filterState.hasElevator === true}
                        onChange={(e) => setFilterState({ 
                          ...filterState, 
                          hasElevator: e.target.checked ? true : null 
                        })}
                      />
                      <span className="checkbox-label">엘리베이터</span>
                    </label>
                    
                    <button 
                      className="filter-reset-btn"
                      onClick={() => setFilterState({
                        targetGroup: 'ALL',
                        minArea: dynamicMinArea,
                        maxArea: dynamicMaxArea,
                        minDeposit: dynamicMinDeposit,
                        maxDeposit: dynamicMaxDeposit,
                        minMonthlyRent: dynamicMinRent,
                        maxMonthlyRent: dynamicMaxRent,
                        hasElevator: null
                      })}
                    >
                      🔄 초기화
                    </button>
                  </div>

                </div>
              )}
            </div>
          )}
          
          {/* Policy Overlay Banner (For Jeonse/no-marker announcements) */}
          {isPolicyOnly && activeAnn && (
            <div className="policy-overlay">
              <div className="policy-icon">💡</div>
              <h2 className="policy-title">{activeAnn.subscription_type} 지원 제도 안내</h2>
              <p className="policy-desc">
                본 공고는 입주자가 원하는 주택을 직접 물색하면, LH/SH 등 시행 기관이 집주인과 전세계약을 체결한 후 저렴하게 재임대하는 정책성 전세임대 공고입니다. (지도상에 사전 지정된 주택 단지가 없습니다)
              </p>
              
              {activeAnn.limits && activeAnn.limits.length > 0 && (
                <div className="policy-limits-box">
                  <div style={{fontWeight: '700', fontSize: '0.8rem', marginBottom: '8px', color: 'hsl(var(--accent-hover))'}}>지원 조건 요약</div>
                  {activeAnn.limits.map((limit) => (
                    <div key={limit.id} className="policy-limit-item">
                      <span className="policy-limit-lbl">{limit.target_group || '기본 지원'}</span>
                      <span className="policy-limit-val">
                        최대 {formatMoney(limit.max_support_amount)} 한도 
                        {limit.interest_rate !== null && ` (금리 ${limit.interest_rate}%)`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Detail Sliding Panel */}
        <DetailPanel 
          complex={selectedComplex} 
          isOpen={isPanelOpen} 
          filterState={filterState}
          onClose={() => {
            setIsPanelOpen(false);
            setActiveComplexId(null);
          }} 
        />
      </main>
    </div>
  );
}
