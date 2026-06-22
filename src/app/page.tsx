"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import DetailPanel from '@/components/DetailPanel';
import NavigationBar, { NavigationTabType } from '@/components/NavigationBar';
import { formatMoney, formatRent, formatTargetGroup } from '@/utils/formatters';
import { Announcement, Complex, FilterState } from '@/types';
import styles from './page.module.css';
import {
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  PANEL_MIN_WIDTH,
  PANEL_MAX_WIDTH,
  PANEL_DEFAULT_WIDTH,
  FILTER_DEFAULT_LIMITS,
  FILTER_SLIDER_STEPS,
  NAVIGATION_BAR_WIDTH,
} from '@/constants';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', backgroundColor: 'var(--bg-body)' }}>
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

  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
  const [isPanelDragging, setIsPanelDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<NavigationTabType>('SEARCH');

  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, moveEvent.clientX - NAVIGATION_BAR_WIDTH));
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
      const sidebarOffset = (isSidebarCollapsed ? 0 : sidebarWidth) + NAVIGATION_BAR_WIDTH;
      const newWidth = Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, moveEvent.clientX - sidebarOffset));
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
    targetGroup: 'ALL',
    minArea: FILTER_DEFAULT_LIMITS.minArea,
    maxArea: FILTER_DEFAULT_LIMITS.maxArea,
    minDeposit: FILTER_DEFAULT_LIMITS.minDeposit,
    maxDeposit: FILTER_DEFAULT_LIMITS.maxDeposit,
    minMonthlyRent: FILTER_DEFAULT_LIMITS.minMonthlyRent,
    maxMonthlyRent: FILTER_DEFAULT_LIMITS.maxMonthlyRent
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

  const handleTabSelect = (tab: NavigationTabType) => {
    if (activeTab === tab) {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    } else {
      setActiveTab(tab);
      setIsSidebarCollapsed(false);
    }
  };

  const availableTargetGroups = [
    'ALL',
    ...Array.from(new Set(announcementUnits.map((u) => u.target_group).filter(Boolean) as string[]))
  ];

  return (
    <div className="app-container">
      <main className="app-main">
        <NavigationBar
          activeTab={activeTab}
          isSidebarCollapsed={isSidebarCollapsed}
          onTabSelect={handleTabSelect}
        />

        {activeAnnId && !isPolicyOnly && (
          <div 
            className={styles['floating-filter-container']}
          >
            <button className={styles['floating-filter-btn']} onClick={() => setIsFilterExpanded(!isFilterExpanded)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 'var(--spacing-xs)' }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              맞춤 상세 필터
              {isFilterExpanded ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'var(--spacing-xs)' }}>
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'var(--spacing-xs)' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              )}
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
                      <input type="range" min={dynamicMinDeposit} max={dynamicMaxDeposit} step={FILTER_SLIDER_STEPS.deposit} value={filterState.minDeposit} onChange={(e) => setFilterState({ ...filterState, minDeposit: Math.min(parseInt(e.target.value), filterState.maxDeposit - FILTER_SLIDER_STEPS.deposit) })} className={`${styles.thumb} ${styles['thumb--left']}`} />
                      <input type="range" min={dynamicMinDeposit} max={dynamicMaxDeposit} step={FILTER_SLIDER_STEPS.deposit} value={filterState.maxDeposit} onChange={(e) => setFilterState({ ...filterState, maxDeposit: Math.max(parseInt(e.target.value), filterState.minDeposit + FILTER_SLIDER_STEPS.deposit) })} className={`${styles.thumb} ${styles['thumb--right']}`} />
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
                      <input type="range" min={dynamicMinRent} max={dynamicMaxRent} step={FILTER_SLIDER_STEPS.monthlyRent} value={filterState.minMonthlyRent} onChange={(e) => setFilterState({ ...filterState, minMonthlyRent: Math.min(parseInt(e.target.value), filterState.maxMonthlyRent - FILTER_SLIDER_STEPS.monthlyRent) })} className={`${styles.thumb} ${styles['thumb--left']}`} />
                      <input type="range" min={dynamicMinRent} max={dynamicMaxRent} step={FILTER_SLIDER_STEPS.monthlyRent} value={filterState.maxMonthlyRent} onChange={(e) => setFilterState({ ...filterState, maxMonthlyRent: Math.max(parseInt(e.target.value), filterState.minMonthlyRent + FILTER_SLIDER_STEPS.monthlyRent) })} className={`${styles.thumb} ${styles['thumb--right']}`} />
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
          activeTab={activeTab} allComplexes={allComplexes}
          style={{ left: `${NAVIGATION_BAR_WIDTH}px` }}
        />

        <div 
          className={`${styles['resizer-bar']} ${isDragging ? styles.dragging : ''}`} 
          onMouseDown={startResizing} 
          style={{ left: (isSidebarCollapsed ? 0 : sidebarWidth) + NAVIGATION_BAR_WIDTH }} 
        />

        <DetailPanel 
          complex={selectedComplex} 
          isOpen={isPanelOpen} 
          filterState={filterState} 
          announcements={announcements} 
          onClose={() => { setIsPanelOpen(false); setActiveComplexId(null); }} 
          style={{ 
            left: (isSidebarCollapsed ? 0 : sidebarWidth) + NAVIGATION_BAR_WIDTH,
            width: `${panelWidth}px`
          }} 
        />

        {isPanelOpen && (
          <div 
            className={`${styles['resizer-bar']} ${isPanelDragging ? styles.dragging : ''}`} 
            onMouseDown={startResizingPanel} 
            style={{ left: (isSidebarCollapsed ? 0 : sidebarWidth) + NAVIGATION_BAR_WIDTH + panelWidth }} 
          />
        )}

        <div className={styles['app-map-container']}>
          <Map complexes={filteredComplexes} activeComplexId={activeComplexId} onSelectComplex={handleSelectComplex} />
          

          
          {isPolicyOnly && activeAnn && (
            <div className={styles['policy-overlay']}>
              <div className={styles['policy-icon']}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <h2 className={styles['policy-title']}>{activeAnn.subscription_type} 지원 제도 안내</h2>
              <p className={styles['policy-desc']}>본 공고는 입주자가 원하는 주택을 직접 물색하면, 기관이 집주인과 전세계약을 체결한 후 저렴하게 재임대하는 정책입니다.</p>
              {activeAnn.limits && activeAnn.limits.length > 0 && (
                <div className={styles['policy-limits-box']}>
                  <div style={{fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-sm)', color: 'var(--primary-hover)'}}>지원 조건 요약</div>
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
