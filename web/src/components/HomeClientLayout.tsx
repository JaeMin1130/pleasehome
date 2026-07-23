"use client";

import { useEffect, useState, Suspense, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DetailPanel from '@/components/DetailPanel';
import NavigationBar, { NavigationTabType } from '@/components/NavigationBar';
import BookmarkModal from '@/components/ui/BookmarkModal';
import AuthModal from '@/components/ui/AuthModal';
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
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // 로컬스토리지 기반 다크모드/라이트모드 전역 테마 초기화 동기화
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        document.body.classList.add('dark');
      } else if (savedTheme === 'light') {
        document.body.classList.remove('dark');
      }
    }
  }, []);

  const DEFAULT_FOLDERS: BookmarkFolder[] = [];

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
    if (!member) {
      setAuthModalOpen(true);
      return;
    }
    // 이미 저장되어 있는 단지라면 팝업 없이 즉시 목록에서 제외
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

    // 저장되지 않은 단지라면 설정 폴더/메모 선택 팝업 오픈
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

  // 💡 단지탭 검색어, 활성지역, 지도 이동 오버라이드 관리 상태 정의
  const [complexSearchTerm, setComplexSearchTerm] = useState('');
  const [complexActiveRegion, setComplexActiveRegion] = useState('ALL');
  const [mapCenterOverride, setMapCenterOverride] = useState<{ lat: number; lng: number } | null>(null);

  // 💡 공고 ID -> 지역명 캐싱 맵 (O(1) 룩업용)
  const annRegionMap = useMemo(() => {
    const map: Record<number, string> = {};
    announcements.forEach(a => {
      if (a.region) map[a.id] = a.region;
    });
    return map;
  }, [announcements]);

  const REGION_CENTERS: Record<string, { lat: number; lng: number }> = {
    ALL: { lat: 36.3, lng: 127.8 },
    서울: { lat: 37.5665, lng: 126.9780 },
    인천: { lat: 37.4563, lng: 126.7052 },
    대전: { lat: 36.3504, lng: 127.3845 },
    대구: { lat: 35.8711, lng: 128.6014 },
    광주: { lat: 35.1595, lng: 126.8526 },
    울산: { lat: 35.5384, lng: 129.3114 },
    부산: { lat: 35.1798, lng: 129.0750 },
    세종: { lat: 36.4800, lng: 127.2890 },
    경기도: { lat: 37.2636, lng: 127.0286 },
    강원도: { lat: 37.8854, lng: 127.7298 },
    충청도: { lat: 36.6358, lng: 127.4914 },
    경상도: { lat: 35.8500, lng: 128.5600 },
    전라도: { lat: 35.7000, lng: 127.1500 }
  };

  const matchesRegion = (complex: Complex, active: string): boolean => {
    if (active === 'ALL') return true;
    const annRegion = annRegionMap[complex.announcement_id];

    if (annRegion) {
      if (active === '서울') return annRegion.startsWith('서울');
      if (active === '인천') return annRegion.startsWith('인천');
      if (active === '대전') return annRegion.startsWith('대전');
      if (active === '대구') return annRegion.startsWith('대구');
      if (active === '광주') return annRegion.startsWith('광주');
      if (active === '울산') return annRegion.startsWith('울산');
      if (active === '부산') return annRegion.startsWith('부산');
      if (active === '세종') return annRegion.startsWith('세종');
      if (active === '경기도') return annRegion.startsWith('경기');
      if (active === '강원도') return annRegion.startsWith('강원');
      if (active === '충청도') return annRegion.startsWith('충청');
      if (active === '경상도') return annRegion.startsWith('경상');
      if (active === '전라도') return annRegion.startsWith('전라') || annRegion.startsWith('전북');
      return false;
    }

    // 💡 2단계: 공고 지역명이 없을 때에만 폴백으로 도로명 주소 파싱을 수행
    const addr = complex.address || '';
    if (active === '서울') return addr.startsWith('서울');
    if (active === '인천') return addr.startsWith('인천');
    if (active === '대전') return addr.startsWith('대전');
    if (active === '대구') return addr.startsWith('대구');
    if (active === '광주') return addr.startsWith('광주');
    if (active === '울산') return addr.startsWith('울산');
    if (active === '부산') return addr.startsWith('부산');
    if (active === '세종') return addr.startsWith('세종');
    if (active === '경기도') return addr.startsWith('경기');
    if (active === '강원도') return addr.startsWith('강원');
    if (active === '충청도') return addr.startsWith('충청');
    if (active === '경상도') return addr.startsWith('경상');
    if (active === '전라도') return addr.startsWith('전라') || addr.startsWith('전북');

    return false;
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

  const { dynamicMinArea, dynamicMaxArea, dynamicMinDeposit, dynamicMaxDeposit, dynamicMinRent, dynamicMaxRent } = useMemo(() => {
    if (announcementUnits.length === 0) {
      return {
        dynamicMinArea: 10,
        dynamicMaxArea: 100,
        dynamicMinDeposit: 0,
        dynamicMaxDeposit: 200000000,
        dynamicMinRent: 0,
        dynamicMaxRent: 1500000,
      };
    }
    const areas = announcementUnits.map(u => u.exclusive_area || 0);
    const deposits = announcementUnits.map(u => u.deposit || 0);
    const rents = announcementUnits.map(u => u.monthly_rent || 0);
    return {
      dynamicMinArea: Math.floor(Math.min(...areas)),
      dynamicMaxArea: Math.ceil(Math.max(...areas)),
      dynamicMinDeposit: Math.min(...deposits),
      dynamicMaxDeposit: Math.max(...deposits),
      dynamicMinRent: Math.min(...rents),
      dynamicMaxRent: Math.max(...rents),
    };
  }, [announcementUnits]);

  const displayComplexes = useMemo(() => {
    return activeAnnId ? allComplexes.filter(c => c.announcement_id === activeAnnId) : [];
  }, [activeAnnId, allComplexes]);

  const filteredComplexes = useMemo(() => {
    return displayComplexes.filter(complex => {
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
  }, [displayComplexes, announcementUnits, filterState]);

  const filteredComplexesForComplexTab = useMemo(() => {
    return allComplexes.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(complexSearchTerm.toLowerCase()) ||
                           c.address.toLowerCase().includes(complexSearchTerm.toLowerCase());
      const matchesReg = matchesRegion(c, complexActiveRegion);
      return matchesSearch && matchesReg;
    });
  }, [allComplexes, complexSearchTerm, complexActiveRegion, announcements]);

  // 저장 탭(BOOKMARK) 필터 조건 분기: 상세 필터와 무관하게 저장된 단지만 매핑
  let mapComplexes = filteredComplexes;
  if (activeTab === 'BOOKMARK') {
    if (activeFolderIds.length === 0) {
      // 1단계: 전체 저장 단지
      const allBookmarkedIds = bookmarkItems.map(item => item.complexId);
      mapComplexes = allComplexes.filter(c => allBookmarkedIds.includes(c.id));
    } else {
      // 2단계: 열려 있는 폴더 내 저장 단지들
      const folderBookmarkedIds = bookmarkItems
        .filter(item => activeFolderIds.includes(item.folderId))
        .map(item => item.complexId);
      mapComplexes = allComplexes.filter(c => folderBookmarkedIds.includes(c.id));
    }
  } else if (activeTab === 'COMPLEX') {
    mapComplexes = filteredComplexesForComplexTab;
  }

  const activeAnn = announcements.find(a => a.id === activeAnnId);
  const isPolicyOnly = activeAnnId !== null && displayComplexes.length === 0;

  const handleSelectAnnouncement = (id: number | null) => {
    setActiveAnnId(id);
    setActiveComplexId(null);
    setSelectedComplex(null);
    setIsPanelOpen(false);

    // URL 양방향 동기화 (Shallow Routing)
    if (id !== null) {
      window.history.replaceState(null, '', `/?announcement_id=${id}`);
    } else {
      window.history.replaceState(null, '', '/');
    }
  };

  const handleSelectComplex = (complex: Complex) => {
    // 💡 비교 표가 열린 상태였다면 비교 모드를 자동 해제하고 해당 단지 상세 정보로 자연스럽게 이행
    if (activeComparisonFolderId !== null) {
      setActiveComparisonFolderId(null);
      setSelectedComplex(complex);
      setActiveComplexId(complex.id);
      setIsPanelOpen(true);
      window.history.replaceState(null, '', `/?complex_id=${complex.id}`);
      
      // 모바일 뷰인 경우 사이드바 닫기
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
      
      // 모바일 뷰에서 단지 해제 시 이전 활성화 탭 복원
      if (typeof window !== 'undefined' && window.innerWidth <= 768 && lastActiveTab !== null) {
        handleTabSelect(lastActiveTab);
        setLastActiveTab(null);
      }

      // 단지 해제 시: 이전 공고가 활성화되어 있으면 공고 ID 유지, 없으면 /
      if (activeAnnId !== null) {
        window.history.replaceState(null, '', `/?announcement_id=${activeAnnId}`);
      } else {
        window.history.replaceState(null, '', '/');
      }
    } else {
      // 모바일 뷰인 경우 사이드바 닫기 전에 현재 탭 기억
      if (activeTab !== null) {
        setLastActiveTab(activeTab);
      }

      setSelectedComplex(complex);
      setActiveComplexId(complex.id);
      setIsPanelOpen(true);
      
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        handleTabSelect(null);
      }

      // 단지 선택 시: URL에 complex_id 설정
      window.history.replaceState(null, '', `/?complex_id=${complex.id}`);
    }
  };

  const handleTabSelect = (tab: NavigationTabType | null) => {
    setActiveTab(tab);
    if (tab === null) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false); // 💡 탭 활성화 시 기본 펼침(중간 높이) 상태로 시작하도록 지정
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
            className={styles['floating-filter-container']}
          >
            <button 
              className={styles['floating-filter-btn']} 
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              title={isFilterExpanded ? "상세 필터 닫기" : "상세 필터 열기"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles['btn-icon']}>
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
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
                      <input type="range" min={dynamicMinArea} max={dynamicMaxArea} value={filterState.minArea} onChange={(e) => setFilterState({ ...filterState, minArea: Math.min(Number(e.target.value), filterState.maxArea) })} className={`${styles.thumb} ${styles['thumb--left']}`} />
                      <input type="range" min={dynamicMinArea} max={dynamicMaxArea} value={filterState.maxArea} onChange={(e) => setFilterState({ ...filterState, maxArea: Math.max(Number(e.target.value), filterState.minArea) })} className={`${styles.thumb} ${styles['thumb--right']}`} />
                      <div className={styles['slider-track-track']} />
                      <div 
                        className={styles['slider-track-range']} 
                        style={{
                          left: `${((filterState.minArea - dynamicMinArea) / (dynamicMaxArea - dynamicMinArea || 1)) * 100}%`,
                          width: `${((filterState.maxArea - filterState.minArea) / (dynamicMaxArea - dynamicMinArea || 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className={styles['filter-group']}>
                    <div className={styles['filter-label-row']}>
                      <span className={styles['filter-label']}>보증금</span>
                      <span className={styles['filter-val-text']}>{formatRent(filterState.minDeposit)} ~ {formatRent(filterState.maxDeposit)}</span>
                    </div>
                    <div className={styles['double-slider-container']}>
                      <input type="range" min={dynamicMinDeposit} max={dynamicMaxDeposit} step={FILTER_SLIDER_STEPS.deposit} value={filterState.minDeposit} onChange={(e) => setFilterState({ ...filterState, minDeposit: Math.min(Number(e.target.value), filterState.maxDeposit) })} className={`${styles.thumb} ${styles['thumb--left']}`} />
                      <input type="range" min={dynamicMinDeposit} max={dynamicMaxDeposit} step={FILTER_SLIDER_STEPS.deposit} value={filterState.maxDeposit} onChange={(e) => setFilterState({ ...filterState, maxDeposit: Math.max(Number(e.target.value), filterState.minDeposit) })} className={`${styles.thumb} ${styles['thumb--right']}`} />
                      <div className={styles['slider-track-track']} />
                      <div 
                        className={styles['slider-track-range']} 
                        style={{
                          left: `${((filterState.minDeposit - dynamicMinDeposit) / (dynamicMaxDeposit - dynamicMinDeposit || 1)) * 100}%`,
                          width: `${((filterState.maxDeposit - filterState.minDeposit) / (dynamicMaxDeposit - dynamicMinDeposit || 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className={styles['filter-group']}>
                    <div className={styles['filter-label-row']}>
                      <span className={styles['filter-label']}>월 임대료</span>
                      <span className={styles['filter-val-text']}>{formatMoney(filterState.minMonthlyRent)} ~ {formatMoney(filterState.maxMonthlyRent)}</span>
                    </div>
                    <div className={styles['double-slider-container']}>
                      <input type="range" min={dynamicMinRent} max={dynamicMaxRent} step={FILTER_SLIDER_STEPS.monthlyRent} value={filterState.minMonthlyRent} onChange={(e) => setFilterState({ ...filterState, minMonthlyRent: Math.min(Number(e.target.value), filterState.maxMonthlyRent) })} className={`${styles.thumb} ${styles['thumb--left']}`} />
                      <input type="range" min={dynamicMinRent} max={dynamicMaxRent} step={FILTER_SLIDER_STEPS.monthlyRent} value={filterState.maxMonthlyRent} onChange={(e) => setFilterState({ ...filterState, maxMonthlyRent: Math.max(Number(e.target.value), filterState.minMonthlyRent) })} className={`${styles.thumb} ${styles['thumb--right']}`} />
                      <div className={styles['slider-track-track']} />
                      <div 
                        className={styles['slider-track-range']} 
                        style={{
                          left: `${((filterState.minMonthlyRent - dynamicMinRent) / (dynamicMaxRent - dynamicMinRent || 1)) * 100}%`,
                          width: `${((filterState.maxMonthlyRent - filterState.minMonthlyRent) / (dynamicMaxRent - dynamicMinRent || 1)) * 100}%`
                        }}
                      />
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
          width={SIDEBAR_DEFAULT_WIDTH} isCollapsed={isSidebarCollapsed} onCollapseChange={setIsSidebarCollapsed}
          displayComplexes={activeTab === 'BOOKMARK' ? mapComplexes : filteredComplexes} activeComplexId={activeComplexId} onSelectComplex={handleSelectComplex}
          activeTab={activeTab} onTabSelect={handleTabSelect} allComplexes={allComplexes}
          complexSearchTerm={complexSearchTerm}
          setComplexSearchTerm={setComplexSearchTerm}
          complexActiveRegion={complexActiveRegion}
          onComplexActiveRegionChange={(r) => {
            setComplexActiveRegion(r);
            setMapCenterOverride(REGION_CENTERS[r]);
          }}
          annRegionMap={annRegionMap}
          bookmarkedIds={bookmarkedIds} onToggleBookmark={toggleBookmark}
          bookmarkFolders={bookmarkFolders}
          bookmarkItems={bookmarkItems}
          activeFolderIds={activeFolderIds}
          setActiveFolderIds={setActiveFolderIds}
          onAddFolder={handleAddFolder}
          onHoverComplex={setHoveredComplexId}
          onRemoveFolder={(folderId) => {
            const nextFolders = bookmarkFolders.filter(f => f.id !== folderId);
            const nextItems = bookmarkItems.filter(item => item.folderId !== folderId);
            setBookmarkFolders(nextFolders);
            setBookmarkItems(nextItems);
            if (member) {
              fetch('/api/member/bookmark-folders', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: folderId }),
              });
            }
            if (activeFolderIds.includes(folderId)) {
              setActiveFolderIds(prev => prev.filter(id => id !== folderId));
            }
            if (activeComparisonFolderId === folderId) {
              setActiveComparisonFolderId(null);
              setIsPanelOpen(false);
            }
          }}
          onUpdateFolder={(folderId, name, color) => {
            const updated = bookmarkFolders.map(f =>
              f.id === folderId ? { ...f, name, color: color || f.color } : f
            );
            setBookmarkFolders(updated);
            if (member) {
              const folder = bookmarkFolders.find(f => f.id === folderId);
              fetch('/api/member/bookmark-folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: folderId, name, color: color || folder?.color }),
              });
            }
          }}
          onMoveBookmarkItem={(complexId, targetFolderId) => {
            const moved = bookmarkItems.map(item =>
              item.complexId === complexId ? { ...item, folderId: targetFolderId } : item
            );
            setBookmarkItems(moved);
            if (member) {
              fetch('/api/member/bookmark-items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ complex_id: complexId, folder_id: targetFolderId }),
              });
            }
          }}
          activeComparisonFolderId={activeComparisonFolderId}
          onToggleComparison={(folderId) => {
            if (activeComparisonFolderId === folderId) {
              setActiveComparisonFolderId(null);
              setIsPanelOpen(false);
            } else {
              setActiveComparisonFolderId(folderId);
              setActiveComplexId(null);
              setSelectedComplex(null);
              setIsPanelOpen(true);
            }
          }}
        />

        <DetailPanel 
          complex={selectedComplex} 
          isOpen={isPanelOpen} 
          filterState={filterState} 
          announcements={announcements} 
          bookmarkedIds={bookmarkedIds}
          onToggleBookmark={toggleBookmark}
          activeTab={activeTab}
          onClose={() => { 
            setIsPanelOpen(false); 
            setActiveComplexId(null); 
            setSelectedComplex(null);
            setActiveComparisonFolderId(null);

            if (typeof window !== 'undefined' && window.innerWidth <= 768 && lastActiveTab !== null) {
              handleTabSelect(lastActiveTab);
              setIsSidebarCollapsed(false);
              setLastActiveTab(null);
            }

            if (activeAnnId !== null) {
              window.history.replaceState(null, '', `/?announcement_id=${activeAnnId}`);
            } else {
              window.history.replaceState(null, '', '/');
            }
          }} 
          style={{ 
            '--sidebar-offset-width': isSidebarCollapsed ? '0px' : `${SIDEBAR_DEFAULT_WIDTH}px`
          } as React.CSSProperties}
          comparisonFolder={
            bookmarkFolders.find(f => f.id === activeComparisonFolderId) || null
          }
          comparisonComplexes={
            activeComparisonFolderId 
              ? allComplexes.filter(c => 
                  bookmarkItems
                    .filter(item => item.folderId === activeComparisonFolderId)
                    .map(item => item.complexId)
                    .includes(c.id)
                )
              : []
          }
        />

        <div className={styles['app-map-container']}>
          <Map 
            complexes={mapComplexes} 
            activeComplexId={activeComplexId} 
            hoveredComplexId={hoveredComplexId}
            onSelectComplex={handleSelectComplex} 
            isSidebarCollapsed={isSidebarCollapsed} 
            bookmarkedIds={bookmarkedIds} 
            bookmarkItems={bookmarkItems}
            bookmarkFolders={bookmarkFolders}
            centerOverride={mapCenterOverride}
          />
          
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
                  <div className={styles['summary-title']}>지원 조건 요약</div>
                  {activeAnn.limits.map((limit) => (
                    <div key={limit.id} className={styles['policy-limit-item']}>
                      <span className={styles['policy-limit-lbl']}>{limit.target_group || '기본 지원'}</span>
                      <span className={styles['policy-limit-val']}>
                        {limit.max_support_amount ? `최대 ${formatMoney(limit.max_support_amount)} 지원` : '상세 조건 참조'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
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
