"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import DetailPanel from '@/components/DetailPanel';

// Leaflet 지도는 window 객체를 필요로 하므로 Next.js SSR을 피하기 위해 dynamic 클라이언트 로딩 적용
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

export default function Home() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [allComplexes, setAllComplexes] = useState<Complex[]>([]);
  
  // 상태 관리
  const [activeAnnId, setActiveAnnId] = useState<number | null>(null);
  const [activeComplexId, setActiveComplexId] = useState<number | null>(null);
  const [selectedComplex, setSelectedComplex] = useState<Complex | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

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

  // 공고 선택 시 단지 필터링
  const displayComplexes = activeAnnId 
    ? allComplexes.filter(c => c.announcement_id === activeAnnId)
    : [];

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
            complexes={displayComplexes} 
            activeComplexId={activeComplexId}
            onSelectComplex={handleSelectComplex}
          />

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
          onClose={() => {
            setIsPanelOpen(false);
            setActiveComplexId(null);
          }} 
        />
      </main>
    </div>
  );
}
