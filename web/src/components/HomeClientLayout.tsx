"use client";

import { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DetailPanel from '@/components/DetailPanel';
import NavigationBar, { NavigationTabType } from '@/components/NavigationBar';
import BookmarkModal from '@/components/ui/BookmarkModal';
import { formatMoney, formatRent, formatTargetGroup } from '@/utils/formatters';
import { Announcement, Complex, FilterState, BookmarkFolder, BookmarkItem } from '@/types';
import styles from '@/app/page.module.css';
import { useAuth } from '@/contexts/AuthContext';
import {
  FILTER_DEFAULT_LIMITS,
  FILTER_SLIDER_STEPS,
  NAVIGATION_BAR_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  LAYOUT_GAP,
} from '@/constants';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className={styles['loading-container']}>
      데이터를 불러오는 중입니다...
    </div>
  )
});

interface HomeClientLayoutProps {
  initialAnnouncements?: Announcement[];
  initialComplexes?: Complex[];
}

function HomeContent({ initialAnnouncements = [], initialComplexes = [] }: HomeClientLayoutProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [allComplexes, setAllComplexes] = useState<Complex[]>(initialComplexes);
  const [announcementUnits, setAnnouncementUnits] = useState<any[]>([]);
  
  const [activeAnnId, setActiveAnnId] = useState<number | null>(null);
  const [activeComplexId, setActiveComplexId] = useState<number | null>(null);
  const [selectedComplex, setSelectedComplex] = useState<Complex | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // 마우스 호버 중인 단지 ID 상태
  const [hoveredComplexId, setHoveredComplexId] = useState<number | null>(null);

  // 북마크 폴더 및 아이템 관리 상태
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkFolder[]>([]);
  const [bookmarkItems, setBookmarkItems] = useState<BookmarkItem[]>([]);
  const [activeFolderIds, setActiveFolderIds] = useState<string[]>([]);

  // 북마크 모달 설정 상태
  const [bookmarkModalState, setBookmarkModalState] = useState<{
    isOpen: boolean;
    complexId: number | null;
    complexName: string;
  }>({
    isOpen: false,
    complexId: null,
    complexName: ''
  });

  const { member } = useAuth();

  const DEFAULT_FOLDERS: BookmarkFolder[] = [
    { id: 'default', name: '내 저장 목록', color: '#3B82F6', createdAt: new Date().toISOString() }
  ];

  // 회원 로그인 상태 변경 시 서버 데이터 동기화
  useEffect(() => {
    const loadMemberData = async () => {
      if (member) {
        try {
          const [foldersRes, itemsRes] = await Promise.all([
            fetch('/api/member/bookmark-folders'),
            fetch('/api/member/bookmark-items'),
          ]);
          const foldersData = await foldersRes.json();
          const itemsData = await itemsRes.json();

          if (Array.isArray(foldersData)) {
            setBookmarkFolders(
              foldersData.map((f: any) => ({
                id: f.id, name: f.name, color: f.color, createdAt: f.created_at,
              }))
            );
          }
          if (Array.isArray(itemsData)) {
            setBookmarkItems(
              itemsData.map((i: any) => ({
                complexId: i.complex_id, folderId: i.folder_id,
                memo: i.memo ?? undefined, createdAt: i.created_at,
              }))
            );
          }
        } catch (e) {
          console.error('Failed to load member bookmark data', e);
        }
      } else {
        setBookmarkFolders(DEFAULT_FOLDERS);
        setBookmarkItems([]);
      }
    };
    loadMemberData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member]);

  const bookmarkedIds = bookmarkItems.map(item => item.complexId);

  // 북마크 클릭 시 설정 팝업 호출 (이름 유지)
  const toggleBookmark = (complexId: number) => {
    const isBookmarked = bookmarkItems.some(item => item.complexId === complexId);
    if (isBookmarked) {
      const next = bookmarkItems.filter(item => item.complexId !== complexId);
      setBookmarkItems(next);
      if (member) {
        fetch('/api/member/bookmark-items', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ complex_id: complexId }),
        });
      }
      return;
    }

    const compName = allComplexes.find(c => c.id === complexId)?.name || '알 수 없는 단지';
    setBookmarkModalState({ isOpen: true, complexId, complexName: compName });
  };

  const handleSaveBookmark = (folderId: string, memo: string) => {
    if (bookmarkModalState.complexId === null) return;
    const targetId = bookmarkModalState.complexId;

    setBookmarkItems((prev) => {
      const exists = prev.some(item => item.complexId === targetId);
      const next: BookmarkItem[] = exists
        ? prev.map(item => item.complexId === targetId ? { ...item, folderId, memo } : item)
        : [...prev, { complexId: targetId, folderId, memo, createdAt: new Date().toISOString() }];
      return next;
    });
    if (member) {
      fetch('/api/member/bookmark-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complex_id: targetId, folder_id: folderId, memo }),
      });
    }
    setBookmarkModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleRemoveBookmark = () => {
    if (bookmarkModalState.complexId === null) return;
    const targetId = bookmarkModalState.complexId;
    const next = bookmarkItems.filter(item => item.complexId !== targetId);
    setBookmarkItems(next);
    if (member) {
      fetch('/api/member/bookmark-items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complex_id: targetId }),
      });
    }
    setBookmarkModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleAddFolder = (name: string, customColor?: string): string => {
    const newId = `folder_${Date.now()}`;
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const color = customColor || colors[bookmarkFolders.length % colors.length];
    const newFolder: BookmarkFolder = { id: newId, name, color, createdAt: new Date().toISOString() };

    setBookmarkFolders(prev => {
      const next = [...prev, newFolder];
      return next;
    });
    if (member) {
      fetch('/api/member/bookmark-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newId, name, color }),
      });
    }
    return newId;
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setIsSidebarCollapsed(true);
    }
  }, []);

  const [activeComparisonFolderId, setActiveComparisonFolderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavigationTabType | null>('SEARCH');
  const [lastActiveTab, setLastActiveTab] = useState<NavigationTabType | null>(null);

  const [filterState, setFilterState] = useState<FilterState>({
    targetGroup: 'ALL',
    minArea: FILTER_DEFAULT_LIMITS.minArea,
    maxArea: FILTER_DEFAULT_LIMITS.maxArea,
    minDeposit: FILTER_DEFAULT_LIMITS.minDeposit,
    maxDeposit: FILTER_DEFAULT_LIMITS.maxDeposit,
    minMonthlyRent: FILTER_DEFAULT_LIMITS.minMonthlyRent,
    maxMonthlyRent: FILTER_DEFAULT_LIMITS.maxMonthlyRent
  });

  const searchParams = useSearchParams();
  const annIdParam = searchParams.get('announcement_id');
  const compIdParam = searchParams.get('complex_id');

  useEffect(() => {
    if (initialAnnouncements.length === 0) {
      fetch('/api/announcements').then(res => res.json()).then(data => setAnnouncements(data));
    }
    if (initialComplexes.length === 0) {
      fetch('/api/complexes').then(res => res.json()).then(data => setAllComplexes(data));
    }
  }, [initialAnnouncements, initialComplexes]);

  // 쿼리 파라미터가 유입되었을 때 해당 공고 활성화
  useEffect(() => {
    if (annIdParam && announcements.length > 0) {
      const parsedId = parseInt(annIdParam, 10);
      if (!isNaN(parsedId)) {
        const exists = announcements.some(a => a.id === parsedId);
        if (exists) {
          setActiveAnnId(parsedId);
        }
      }
    }
  }, [annIdParam, announcements]);

  // 쿼리 파라미터로 단지 ID가 들어왔을 때 해당 단지 포커싱 및 정보 활성화
  useEffect(() => {
    if (compIdParam && allComplexes.length > 0) {
      const parsedCompId = parseInt(compIdParam, 10);
      if (!isNaN(parsedCompId)) {
        const targetComplex = allComplexes.find(c => c.id === parsedCompId);
        if (targetComplex) {
          setActiveAnnId(targetComplex.announcement_id);
          setSelectedComplex(targetComplex);
          setActiveComplexId(targetComplex.id);
          setIsPanelOpen(true);
        }
      }
    }
  }, [compIdParam, allComplexes]);

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

  let mapComplexes = filteredComplexes;
  if (activeTab === 'BOOKMARK') {
    if (activeFolderIds.length === 0) {
      const allBookmarkedIds = bookmarkItems.map(item => item.complexId);
      mapComplexes = allComplexes.filter(c => allBookmarkedIds.includes(c.id));
    } else {
      const folderBookmarkedIds = bookmarkItems
        .filter(item => activeFolderIds.includes(item.folderId))
        .map(item => item.complexId);
      mapComplexes = allComplexes.filter(c => folderBookmarkedIds.includes(c.id));
    }
  }

  const activeAnn = announcements.find(a => a.id === activeAnnId);
  const isPolicyOnly = activeAnnId !== null && displayComplexes.length === 0;

  const handleSelectAnnouncement = (id: number | null) => {
    setActiveAnnId(id);
    setActiveComplexId(null);
    setSelectedComplex(null);
    setIsPanelOpen(false);

    if (id !== null) {
      window.history.replaceState(null, '', `/?announcement_id=${id}`);
    } else {
      window.history.replaceState(null, '', '/');
    }
  };

  const handleSelectComplex = (complex: Complex) => {
    if (activeComparisonFolderId !== null) {
      setActiveComparisonFolderId(null);
      setSelectedComplex(complex);
      setActiveComplexId(complex.id);
      setIsPanelOpen(true);
      window.history.replaceState(null, '', `/?complex_id=${complex.id}`);
      
      if (activeTab !== null) {
        setLastActiveTab(activeTab);
      }
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        handleTabSelect(null);
      }
      return;
    }

    if (activeComplexId === complex.id && isPanelOpen) {
      setSelectedComplex(null);
      setActiveComplexId(null);
      setIsPanelOpen(false);
      
      if (typeof window !== 'undefined' && window.innerWidth <= 768 && lastActiveTab !== null) {
        handleTabSelect(lastActiveTab);
        setLastActiveTab(null);
      }

      if (activeAnnId !== null) {
        window.history.replaceState(null, '', `/?announcement_id=${activeAnnId}`);
      } else {
        window.history.replaceState(null, '', '/');
      }
    } else {
      if (activeTab !== null) {
        setLastActiveTab(activeTab);
      }

      setSelectedComplex(complex);
      setActiveComplexId(complex.id);
      setIsPanelOpen(true);
      
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        handleTabSelect(null);
      }

      window.history.replaceState(null, '', `/?complex_id=${complex.id}`);
    }
  };

  const handleTabSelect = (tab: NavigationTabType | null) => {
    setActiveTab(tab);
    if (tab === null) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
      if (tab === 'BOOKMARK') {
        setActiveFolderIds([]);
      }
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
            className={`${styles['filter-bar']} ${isFilterExpanded ? styles.expanded : ''}`}
            style={{
              left: activeTab !== null 
                ? (isSidebarCollapsed ? '72px' : `calc(${NAVIGATION_BAR_WIDTH} + ${SIDEBAR_DEFAULT_WIDTH} + ${LAYOUT_GAP} * 2)`)
                : `calc(${NAVIGATION_BAR_WIDTH} + ${LAYOUT_GAP})`
            }}
          >
            <div className={styles['filter-bar-header']}>
              <div className={styles['filter-bar-title']}>
                <span>상세 조건 검색</span>
                <span className={styles['filter-count']}>({filteredComplexes.length}개 단지)</span>
              </div>
              <button 
                className={styles['filter-bar-toggle']}
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              >
                {isFilterExpanded ? '▲ 접기' : '▼ 펼치기'}
              </button>
            </div>

            <div className={styles['filter-bar-body']}>
              {availableTargetGroups.length > 1 && (
                <div className={styles['filter-group']}>
                  <label className={styles['filter-label']}>공급 대상</label>
                  <div className={styles['target-chips']}>
                    {availableTargetGroups.map(group => (
                      <button
                        key={group}
                        className={`${styles['chip']} ${filterState.targetGroup === group ? styles.active : ''}`}
                        onClick={() => setFilterState(prev => ({ ...prev, targetGroup: group }))}
                      >
                        {formatTargetGroup(group)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles['filter-grid']}>
                <div className={styles['filter-item']}>
                  <div className={styles['filter-item-header']}>
                    <span>전용 면적</span>
                    <span className={styles['filter-value']}>
                      {filterState.minArea}㎡ ~ {filterState.maxArea}㎡
                    </span>
                  </div>
                  <div className={styles['range-slider-container']}>
                    <input 
                      type="range"
                      min={dynamicMinArea}
                      max={dynamicMaxArea}
                      step={1}
                      value={filterState.minArea}
                      onChange={(e) => setFilterState(prev => ({ ...prev, minArea: Math.min(Number(e.target.value), prev.maxArea) }))}
                      className={styles['slider-thumb-left']}
                    />
                    <input 
                      type="range"
                      min={dynamicMinArea}
                      max={dynamicMaxArea}
                      step={1}
                      value={filterState.maxArea}
                      onChange={(e) => setFilterState(prev => ({ ...prev, maxArea: Math.max(Number(e.target.value), prev.minArea) }))}
                      className={styles['slider-thumb-right']}
                    />
                  </div>
                </div>

                <div className={styles['filter-item']}>
                  <div className={styles['filter-item-header']}>
                    <span>임대 보증금</span>
                    <span className={styles['filter-value']}>
                      {formatRent(filterState.minDeposit)} ~ {formatRent(filterState.maxDeposit)}
                    </span>
                  </div>
                  <div className={styles['range-slider-container']}>
                    <input 
                      type="range"
                      min={dynamicMinDeposit}
                      max={dynamicMaxDeposit}
                      step={FILTER_SLIDER_STEPS.deposit}
                      value={filterState.minDeposit}
                      onChange={(e) => setFilterState(prev => ({ ...prev, minDeposit: Math.min(Number(e.target.value), prev.maxDeposit) }))}
                      className={styles['slider-thumb-left']}
                    />
                    <input 
                      type="range"
                      min={dynamicMinDeposit}
                      max={dynamicMaxDeposit}
                      step={FILTER_SLIDER_STEPS.deposit}
                      value={filterState.maxDeposit}
                      onChange={(e) => setFilterState(prev => ({ ...prev, maxDeposit: Math.max(Number(e.target.value), prev.minDeposit) }))}
                      className={styles['slider-thumb-right']}
                    />
                  </div>
                </div>

                <div className={styles['filter-item']}>
                  <div className={styles['filter-item-header']}>
                    <span>월 임대료</span>
                    <span className={styles['filter-value']}>
                      {formatMoney(filterState.minMonthlyRent)} ~ {formatMoney(filterState.maxMonthlyRent)}
                    </span>
                  </div>
                  <div className={styles['range-slider-container']}>
                    <input 
                      type="range"
                      min={dynamicMinRent}
                      max={dynamicMaxRent}
                      step={FILTER_SLIDER_STEPS.monthlyRent}
                      value={filterState.minMonthlyRent}
                      onChange={(e) => setFilterState(prev => ({ ...prev, minMonthlyRent: Math.min(Number(e.target.value), prev.maxMonthlyRent) }))}
                      className={styles['slider-thumb-left']}
                    />
                    <input 
                      type="range"
                      min={dynamicMinRent}
                      max={dynamicMaxRent}
                      step={FILTER_SLIDER_STEPS.monthlyRent}
                      value={filterState.maxMonthlyRent}
                      onChange={(e) => setFilterState(prev => ({ ...prev, maxMonthlyRent: Math.max(Number(e.target.value), prev.minMonthlyRent) }))}
                      className={styles['slider-thumb-right']}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles['app-map-container']}>
          {activeTab !== null && (
            <Sidebar
              announcements={announcements}
              displayComplexes={displayComplexes}
              allComplexes={allComplexes}
              activeAnnId={activeAnnId}
              activeComplexId={activeComplexId}
              activeTab={activeTab}
              onSelectAnnouncement={handleSelectAnnouncement}
              onSelectComplex={handleSelectComplex}
              isCollapsed={isSidebarCollapsed}
              onCollapseChange={(collapsed) => setIsSidebarCollapsed(collapsed)}
              onHoverComplex={setHoveredComplexId}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={toggleBookmark}
              bookmarkFolders={bookmarkFolders}
              bookmarkItems={bookmarkItems}
              activeFolderIds={activeFolderIds}
              setActiveFolderIds={setActiveFolderIds}
              onAddFolder={handleAddFolder}
              onRemoveFolder={() => {}}
              activeComparisonFolderId={activeComparisonFolderId}
              onToggleComparison={(folderId) => {
                if (activeComparisonFolderId === folderId) {
                  setActiveComparisonFolderId(null);
                } else {
                  setActiveComparisonFolderId(folderId);
                }
              }}
            />
          )}

          <Map 
            complexes={mapComplexes} 
            activeComplexId={activeComplexId}
            hoveredComplexId={hoveredComplexId}
            onSelectComplex={handleSelectComplex}
            isSidebarCollapsed={isSidebarCollapsed}
            bookmarkedIds={bookmarkedIds}
            bookmarkItems={bookmarkItems}
            bookmarkFolders={bookmarkFolders}
          />

          <DetailPanel 
            complex={selectedComplex}
            isOpen={isPanelOpen}
            filterState={filterState}
            announcements={announcements}
            onClose={() => handleSelectComplex(selectedComplex!)}
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={toggleBookmark}
          />
        </div>
      </main>

      <BookmarkModal
        isOpen={bookmarkModalState.isOpen}
        complexName={bookmarkModalState.complexName}
        folders={bookmarkFolders}
        bookmarkItems={bookmarkItems}
        complexId={bookmarkModalState.complexId ?? 0}
        onClose={() => setBookmarkModalState(prev => ({ ...prev, isOpen: false }))}
        onSave={handleSaveBookmark}
        onRemove={handleRemoveBookmark}
        onAddFolder={handleAddFolder}
      />
    </div>
  );
}

export default function HomeClientLayout(props: HomeClientLayoutProps) {
  return (
    <Suspense fallback={
      <div className={styles['loading-container']}>
        공공청약 지도를 불러오는 중입니다...
      </div>
    }>
      <HomeContent {...props} />
    </Suspense>
  );
}
