"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import DetailPanel from '@/components/DetailPanel';
import { formatMoney, formatRent, formatTargetGroup } from '@/utils/formatters';
import { Announcement, Complex, FilterState } from '@/types';
import styles from './page.module.css';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'hsl(var(--text-muted))', backgroundColor: 'hsl(var(--bg-primary))' }}>
      지도를 로드하고 있습니다...
    </div>
  )
});

export default function Home() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [allComplexes, setAllComplexes] = useState<Complex[]>([]);
  const [announcementUnits, setAnnouncementUnits] = useState<any[]>([]);
  
  const [activeAnnId, setActiveAnnId] = useState<number | null>(null);
  const [activeComplexId, setActiveComplexId] = useState<number | null>(null);
  const [selectedComplex, setSelectedComplex] = useState<Complex | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [panelWidth, setPanelWidth] = useState(400);
  const [isPanelDragging, setIsPanelDragging] = useState(false);

  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(280, Math.min(700, moveEvent.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const startResizingPanel = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsPanelDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const sidebarOffset = isSidebarCollapsed ? 0 : sidebarWidth;
      const newWidth = Math.max(300, Math.min(800, moveEvent.clientX - sidebarOffset));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsPanelDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const [filterState, setFilterState] = useState<FilterState>({
    targetGroup: 'ALL', minArea: 10, maxArea: 100, minDeposit: 0, maxDeposit: 200000000, minMonthlyRent: 0, maxMonthlyRent: 1500000
  });

  useEffect(() => {
    fetch('/api/announcements').then(res => res.json()).then(data => setAnnouncements(data));
    fetch('/api/complexes').then(res => res.json()).then(data => setAllComplexes(data));
  }, []);

  useEffect(() => {
    if (activeAnnId === null) { setAnnouncementUnits([]); return; }
    fetch(`/api/housing-units?announcement_id=${activeAnnId}`)
      .then(res => res.json())
      .then(data => {
        setAnnouncementUnits(data);
        if (data && data.length > 0) {
          setFilterState({
            targetGroup: 'ALL',
            minArea: Math.floor(Math.min(...data.map((u: any) => u.exclusive_area || 0))),
            maxArea: Math.ceil(Math.max(...data.map((u: any) => u.exclusive_area || 0))),
            minDeposit: Math.min(...data.map((u: any) => u.deposit || 0)),
            maxDeposit: Math.max(...data.map((u: any) => u.deposit || 0)),
            minMonthlyRent: Math.min(...data.map((u: any) => u.monthly_rent || 0)),
            maxMonthlyRent: Math.max(...data.map((u: any) => u.monthly_rent || 0))
          });
        }
      });
  }, [activeAnnId]);

  const dynamicMinArea = announcementUnits.length > 0 ? Math.floor(Math.min(...announcementUnits.map(u => u.exclusive_area || 0))) : 10;
  const dynamicMaxArea = announcementUnits.length > 0 ? Math.ceil(Math.max(...announcementUnits.map(u => u.exclusive_area || 0))) : 100;
  const dynamicMinDeposit = announcementUnits.length > 0 ? Math.min(...announcementUnits.map(u => u.deposit || 0)) : 0;
  const dynamicMaxDeposit = announcementUnits.length > 0 ? Math.max(...announcementUnits.map(u => u.deposit || 0)) : 200000000;
  const dynamicMinRent = announcementUnits.length > 0 ? Math.min(...announcementUnits.map(u => u.monthly_rent || 0)) : 0;
  const dynamicMaxRent = announcementUnits.length > 0 ? Math.max(...announcementUnits.map(u => u.monthly_rent || 0)) : 1500000;

  const displayComplexes = activeAnnId ? allComplexes.filter(c => c.announcement_id === activeAnnId) : [];
  const filteredComplexes = displayComplexes.filter(complex => {
    const complexUnits = announcementUnits.filter(u => u.complex_id === complex.id);
    if (announcementUnits.length === 0) return true;
    return complexUnits.some(unit => {
      if (filterState.targetGroup !== 'ALL' && unit.target_group !== filterState.targetGroup) return false;
      if (unit.exclusive_area < filterState.minArea || unit.exclusive_area > filterState.maxArea) return false;
      if (unit.deposit < filterState.minDeposit || unit.deposit > filterState.maxDeposit) return false;
      if (unit.monthly_rent < filterState.minMonthlyRent || unit.monthly_rent > filterState.maxMonthlyRent) return false;
      return true;
    });
  });

  const activeAnn = announcements.find(a => a.id === activeAnnId);
  const isPolicyOnly = activeAnnId !== null && displayComplexes.length === 0;

  const handleSelectAnnouncement = (id: number | null) => { setActiveAnnId(id); setActiveComplexId(null); setSelectedComplex(null); setIsPanelOpen(false); };
  const handleSelectComplex = (complex: Complex) => {
    if (activeComplexId === complex.id && isPanelOpen) {
      setSelectedComplex(null);
      setActiveComplexId(null);
      setIsPanelOpen(false);
    } else {
      setSelectedComplex(complex);
      setActiveComplexId(complex.id);
      setIsPanelOpen(true);
    }
  };

  const availableTargetGroups = [
    'ALL',
    ...Array.from(new Set(announcementUnits.map((u) => u.target_group).filter(Boolean) as string[]))
  ];

  return (
    <div className="app-container">
      <main className="app-main">
        {activeAnnId && !isPolicyOnly && (
          <div className={styles['floating-filter-container']}>
            <button className={styles['floating-filter-btn']} onClick={() => setIsFilterExpanded(!isFilterExpanded)}>
              <span style={{ marginRight: '6px' }}>🔍</span> 맞춤 상세 필터 {isFilterExpanded ? '▲' : '▼'}
            </button>
            
            {isFilterExpanded && (
              <div className={styles['floating-filter-dropdown']}>
                <div className={styles['overlay-body']}>
                  <div className={styles['filter-group']}>
                    <span className={styles['filter-label']}>신청 대상</span>
                    <div className={styles['filter-chips']}>
                      {availableTargetGroups.map((group) => (
                        <button
                          key={group} className={`${styles['filter-chip']} ${filterState.targetGroup === group ? styles.active : ''}`}
                          onClick={() => setFilterState({ ...filterState, targetGroup: group })}
                        >
                          {group === 'ALL' ? '전체' : formatTargetGroup(group)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles['filter-group']}>
                    <div className={styles['filter-label-row']}>
                      <span className={styles['filter-label']}>전용면적</span>
                      <span className={styles['filter-val-text']}>{filterState.minArea}㎡ ~ {filterState.maxArea}㎡</span>
                    </div>
                    <div className={styles['double-slider-container']}>
                      <input type="range" min={dynamicMinArea} max={dynamicMaxArea} value={filterState.minArea} onChange={(e) => setFilterState({ ...filterState, minArea: Math.min(parseInt(e.target.value), filterState.maxArea - 1) })} className={`${styles.thumb} ${styles['thumb--left']}`} />
                      <input type="range" min={dynamicMinArea} max={dynamicMaxArea} value={filterState.maxArea} onChange={(e) => setFilterState({ ...filterState, maxArea: Math.max(parseInt(e.target.value), filterState.minArea + 1) })} className={`${styles.thumb} ${styles['thumb--right']}`} />
                      <div className={styles['slider-track-track']} />
                      <div className={styles['slider-track-range']} style={{ left: `${((filterState.minArea - dynamicMinArea) / (dynamicMaxArea - dynamicMinArea || 1)) * 100}%`, width: `${((filterState.maxArea - filterState.minArea) / (dynamicMaxArea - dynamicMinArea || 1)) * 100}%` }} />
                    </div>
                  </div>

                  <div className={styles['filter-group']}>
                    <div className={styles['filter-label-row']}>
                      <span className={styles['filter-label']}>임대보증금</span>
                      <span className={styles['filter-val-text']}>{formatMoney(filterState.minDeposit)} ~ {formatMoney(filterState.maxDeposit)}</span>
                    </div>
                    <div className={styles['double-slider-container']}>
                      <input type="range" min={dynamicMinDeposit} max={dynamicMaxDeposit} step={1000000} value={filterState.minDeposit} onChange={(e) => setFilterState({ ...filterState, minDeposit: Math.min(parseInt(e.target.value), filterState.maxDeposit - 1000000) })} className={`${styles.thumb} ${styles['thumb--left']}`} />
                      <input type="range" min={dynamicMinDeposit} max={dynamicMaxDeposit} step={1000000} value={filterState.maxDeposit} onChange={(e) => setFilterState({ ...filterState, maxDeposit: Math.max(parseInt(e.target.value), filterState.minDeposit + 1000000) })} className={`${styles.thumb} ${styles['thumb--right']}`} />
                      <div className={styles['slider-track-track']} />
                      <div className={styles['slider-track-range']} style={{ left: `${((filterState.minDeposit - dynamicMinDeposit) / (dynamicMaxDeposit - dynamicMinDeposit || 1)) * 100}%`, width: `${((filterState.maxDeposit - filterState.minDeposit) / (dynamicMaxDeposit - dynamicMinDeposit || 1)) * 100}%` }} />
                    </div>
                  </div>

                  <div className={styles['filter-group']}>
                    <div className={styles['filter-label-row']}>
                      <span className={styles['filter-label']}>월 임대료</span>
                      <span className={styles['filter-val-text']}>{formatRent(filterState.minMonthlyRent)} ~ {formatRent(filterState.maxMonthlyRent)}</span>
                    </div>
                    <div className={styles['double-slider-container']}>
                      <input type="range" min={dynamicMinRent} max={dynamicMaxRent} step={10000} value={filterState.minMonthlyRent} onChange={(e) => setFilterState({ ...filterState, minMonthlyRent: Math.min(parseInt(e.target.value), filterState.maxMonthlyRent - 10000) })} className={`${styles.thumb} ${styles['thumb--left']}`} />
                      <input type="range" min={dynamicMinRent} max={dynamicMaxRent} step={10000} value={filterState.maxMonthlyRent} onChange={(e) => setFilterState({ ...filterState, maxMonthlyRent: Math.max(parseInt(e.target.value), filterState.minMonthlyRent + 10000) })} className={`${styles.thumb} ${styles['thumb--right']}`} />
                      <div className={styles['slider-track-track']} />
                      <div className={styles['slider-track-range']} style={{ left: `${((filterState.minMonthlyRent - dynamicMinRent) / (dynamicMaxRent - dynamicMinRent || 1)) * 100}%`, width: `${((filterState.maxMonthlyRent - filterState.minMonthlyRent) / (dynamicMaxRent - dynamicMinRent || 1)) * 100}%` }} />
                    </div>
                  </div>

                  <div className={styles['filter-row-footer']}>
                    <button className={styles['filter-reset-btn']} onClick={() => setFilterState({ targetGroup: 'ALL', minArea: dynamicMinArea, maxArea: dynamicMaxArea, minDeposit: dynamicMinDeposit, maxDeposit: dynamicMaxDeposit, minMonthlyRent: dynamicMinRent, maxMonthlyRent: dynamicMaxRent })}>
                      초기화
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <Sidebar 
          announcements={announcements} activeAnnId={activeAnnId} onSelectAnnouncement={handleSelectAnnouncement} 
          width={sidebarWidth} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          displayComplexes={filteredComplexes} activeComplexId={activeComplexId} onSelectComplex={handleSelectComplex}
        />

        <div 
          className={`${styles['resizer-bar']} ${isDragging ? styles.dragging : ''}`} 
          onMouseDown={startResizing} 
          style={{ left: isSidebarCollapsed ? 0 : sidebarWidth }} 
        />

        <DetailPanel 
          complex={selectedComplex} 
          isOpen={isPanelOpen} 
          filterState={filterState} 
          announcements={announcements} 
          onClose={() => { setIsPanelOpen(false); setActiveComplexId(null); }} 
          style={{ 
            left: isSidebarCollapsed ? 0 : sidebarWidth,
            width: `${panelWidth}px`
          }} 
        />

        {isPanelOpen && (
          <div 
            className={`${styles['resizer-bar']} ${isPanelDragging ? styles.dragging : ''}`} 
            onMouseDown={startResizingPanel} 
            style={{ left: (isSidebarCollapsed ? 0 : sidebarWidth) + panelWidth }} 
          />
        )}

        <div className={styles['app-map-container']}>
          <Map complexes={filteredComplexes} activeComplexId={activeComplexId} onSelectComplex={handleSelectComplex} />
          

          
          {isPolicyOnly && activeAnn && (
            <div className={styles['policy-overlay']}>
              <div className={styles['policy-icon']}>💡</div>
              <h2 className={styles['policy-title']}>{activeAnn.subscription_type} 지원 제도 안내</h2>
              <p className={styles['policy-desc']}>본 공고는 입주자가 원하는 주택을 직접 물색하면, 기관이 집주인과 전세계약을 체결한 후 저렴하게 재임대하는 정책입니다.</p>
              {activeAnn.limits && activeAnn.limits.length > 0 && (
                <div className={styles['policy-limits-box']}>
                  <div style={{fontWeight: '700', fontSize: '0.8rem', marginBottom: '8px', color: 'hsl(var(--accent-hover))'}}>지원 조건 요약</div>
                  {activeAnn.limits.map((limit) => (
                    <div key={limit.id} className={styles['policy-limit-item']}>
                      <span className={styles['policy-limit-lbl']}>{limit.target_group || '기본 지원'}</span>
                      <span className={styles['policy-limit-val']}>최대 {formatMoney(limit.max_support_amount)} 한도 {limit.interest_rate !== null && ` (금리 ${limit.interest_rate}%)`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
