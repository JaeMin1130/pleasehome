"use client";

import { useState, useEffect, useRef } from 'react';
import { useBottomSheetGesture } from '@/hooks/useBottomSheetGesture';
import { Announcement, ApplicationStatus, Complex, BookmarkFolder, BookmarkItem, HousingUnit } from '@/types';
import AnnouncementCard from '@/components/features/AnnouncementCard';
import ComplexCard from '@/components/features/ComplexCard';
import styles from './Sidebar.module.css';
import { formatMoney, formatRent } from '@/utils/formatters';
import {
  UI_SIZES,
  UI_STROKE_WIDTHS,
  BOOKMARK_PRESET_COLORS,
} from '@/constants';

interface SidebarProps {
  announcements: Announcement[];
  activeAnnId: number | null;
  onSelectAnnouncement: (id: number | null) => void;
  width?: number;
  isCollapsed?: boolean;
  onCollapseChange?: (isCollapsed: boolean) => void;
  displayComplexes: Complex[];
  activeComplexId: number | null;
  onSelectComplex: (complex: Complex) => void;
  activeTab: 'SEARCH' | 'BOOKMARK' | 'MORE';
  allComplexes: Complex[];
  style?: React.CSSProperties;
  bookmarkedIds: number[];
  onToggleBookmark: (complexId: number) => void;
  bookmarkFolders: BookmarkFolder[];
  bookmarkItems: BookmarkItem[];
  activeFolderIds: string[];
  setActiveFolderIds: (folderIds: string[]) => void;
  onAddFolder: (name: string, color?: string) => string;
  onRemoveFolder: (folderId: string) => void;
  onUpdateFolder?: (folderId: string, name: string, color?: string) => void;
  onMoveBookmarkItem?: (complexId: number, targetFolderId: string) => void;
  activeComparisonFolderId: string | null;
  onToggleComparison: (folderId: string) => void;
  onHoverComplex?: (id: number | null) => void;
}

export default function Sidebar({ 
  announcements, activeAnnId, onSelectAnnouncement, 
  width, isCollapsed, onCollapseChange,
  displayComplexes, activeComplexId, onSelectComplex,
  activeTab, allComplexes, style,
  bookmarkedIds, onToggleBookmark,
  bookmarkFolders, bookmarkItems, activeFolderIds, setActiveFolderIds,
  onAddFolder, onRemoveFolder, onUpdateFolder, onMoveBookmarkItem,
  activeComparisonFolderId, onToggleComparison,
  onHoverComplex
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const getDvhInPixels = (percent: number) => {
    if (typeof window === 'undefined') return 0;
    return (window.innerHeight * percent) / 100;
  };

  const minHeight = 60;
  const midHeight = getDvhInPixels(45);
  const maxHeight = getDvhInPixels(80);

  const { sheetHeight, setSheetHeight, touchHandlers } = useBottomSheetGesture({
    minHeight,
    midHeight,
    maxHeight,
    scrollSelector: '[class*="sidebar-list"], [class*="folders-list-container"], [class*="more-list-container"]',
    onMinHeightReached: () => {
      onSelectAnnouncement(null);
      onCollapseChange?.(true);
    },
    onMidHeightReached: () => {
      onCollapseChange?.(false);
    },
    onMaxHeightReached: () => {
      onCollapseChange?.(false);
    }
  });

  // isCollapsed 변화에 따른 상태 싱크
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      if (isCollapsed) {
        setSheetHeight(minHeight);
      } else {
        setSheetHeight(midHeight);
      }
    } else {
      setSheetHeight(null);
    }
  }, [isCollapsed, minHeight, midHeight, setSheetHeight]);

  const [complexSearchTerm, setComplexSearchTerm] = useState('');
  const [activeTabStatus, setActiveTabStatus] = useState<ApplicationStatus | 'HIDDEN'>('ONGOING');
  const [activeRegion, setActiveRegion] = useState<string>('ALL');
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const listRef = useRef<HTMLDivElement>(null);
  const bookmarkListRef = useRef<HTMLDivElement>(null);
  const [bookmarkUnits, setBookmarkUnits] = useState<Record<number, HousingUnit[]>>({});

  // 📂 북마크 폴더명 수정 상태
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState<string>('');

  const handleSaveRename = (folderId: string) => {
    if (editingFolderName.trim() && onUpdateFolder) {
      onUpdateFolder(folderId, editingFolderName.trim());
    }
    setEditingFolderId(null);
  };

  // 🔀 드래그 앤 드롭 상태 관리
  const [draggingComplexId, setDraggingComplexId] = useState<number | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // 숨긴 공고 목록 관리 상태 (최근 숨긴 순서 정렬을 위한 타임스탬프 기록 구조)
  const [disabledAnns, setDisabledAnns] = useState<{ id: number; disabledAt: string }[]>([]);

  // 파생 상태: 기존 단수 ID 배열 참조 로직과의 호환용
  const disabledAnnIds = disabledAnns.map((x) => x.id);

  // 마운트 시 localStorage에서 숨긴 공고 목록 로드 및 하위 호환성 복구
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('disabledAnnouncementIds');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const formatted = parsed.map((item) => {
              if (typeof item === 'number') {
                return { id: item, disabledAt: new Date().toISOString() };
              }
              return item;
            });
            setDisabledAnns(formatted);
          }
        }
      } catch (e) {
        console.error('Failed to load disabled announcement IDs', e);
      }
    }
  }, []);

  const handleToggleDisableAnn = (id: number) => {
    const exists = disabledAnns.some((x) => x.id === id);
    let next: { id: number; disabledAt: string }[];
    if (exists) {
      next = disabledAnns.filter((x) => x.id !== id);
    } else {
      next = [...disabledAnns, { id, disabledAt: new Date().toISOString() }];
      // 💡 만약 현재 보던 공고가 숨겨진다면 공고 선택 상태를 해제하여 우측 패널 닫기 연동
      if (activeAnnId === id) {
        onSelectAnnouncement(null);
      }
    }
    setDisabledAnns(next);
    localStorage.setItem('disabledAnnouncementIds', JSON.stringify(next));
  };

  // 사이드바 폴더 폼 상태
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [selectedSidebarColor, setSelectedSidebarColor] = useState<string>(BOOKMARK_PRESET_COLORS[0]);

  // 찜한 단지가 늘어날 때 주택 상세 정보를 동적으로 로드
  useEffect(() => {
    bookmarkedIds.forEach((id) => {
      if (!bookmarkUnits[id]) {
        fetch(`/api/housing-units?complex_id=${id}`)
          .then((res) => res.json())
          .then((data) => {
            setBookmarkUnits((prev) => ({ ...prev, [id]: data }));
          })
          .catch((err) => console.error('Failed to load bookmark unit data', err));
      }
    });
  }, [bookmarkedIds, bookmarkUnits]);

  // 외부에서 공고 ID가 활성화되어 전달될 때, 필터 상태(지역 및 접수 상태)를 해당 공고의 데이터에 동기화
  useEffect(() => {
    if (activeAnnId && announcements.length > 0) {
      // 현재 필터링된 공고 목록에 이미 해당 공고가 포함되어 보이는 상태라면, 필터를 변경하지 않고 그대로 유지
      const isAlreadyVisible = getSortedAnnouncements().some(a => a.id === activeAnnId);
      if (isAlreadyVisible) return;

      const activeAnn = announcements.find(a => a.id === activeAnnId);
      if (activeAnn) {
        // 접수 상태 동기화
        const status = getAnnouncementStatus(activeAnn);
        if (status) {
          setActiveTabStatus(status);
        }
      }
    }
  }, [activeAnnId, announcements]);

  // 선택된 공고가 활성화되었을 때 해당 카드로 부드럽게 스크롤 포커스 이동
  useEffect(() => {
    if (activeAnnId !== null) {
      const timer = setTimeout(() => {
        const cardElement = document.getElementById(`ann-card-${activeAnnId}`);
        if (cardElement && listRef.current) {
          const targetScrollTop = cardElement.offsetTop - 16; // 상단 여백 고려
          listRef.current.scrollTo({
            top: targetScrollTop >= 0 ? targetScrollTop : 0,
            behavior: 'smooth'
          });
        }
      }, 150); // 아코디언 애니메이션 딜레이 감안
      return () => clearTimeout(timer);
    }
  }, [activeAnnId]);



  // 공급 주택 목록 개폐 상태 추가
  const [isComplexListOpen, setIsComplexListOpen] = useState(false);

  // 💡 activeAnnId 변경 시 렌더링 도중 상태를 초기화하는 React 추천 패턴 적용 (useEffect 경고 차단)
  const [prevActiveAnnId, setPrevActiveAnnId] = useState<number | null>(activeAnnId);
  if (activeAnnId !== prevActiveAnnId) {
    setPrevActiveAnnId(activeAnnId);
    setIsComplexListOpen(false);
  }

  // 다크 모드 상태
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dark = document.body.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
      if (dark) {
        document.body.classList.add('dark');
      }
      // 💡 동기식 cascading render 경고 차단을 위해 비동기 갱신 처리
      setTimeout(() => {
        setIsDarkMode(dark);
      }, 0);
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        if (next) {
          document.body.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        } else {
          document.body.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        }
      }
      return next;
    });
  };

  // 모달 약관 노출 상태
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | null>(null);

  const getAnnouncementStatus = (ann: Announcement): 'UPCOMING' | 'ONGOING' | 'CLOSED' => {
    const minStart = getAnnouncementMinStart(ann);
    const maxEnd = getAnnouncementMaxEnd(ann);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (minStart) {
      const startDate = new Date(minStart.getFullYear(), minStart.getMonth(), minStart.getDate());
      if (today < startDate) return 'UPCOMING';
    }
    if (maxEnd && now > maxEnd) return 'CLOSED';
    return 'ONGOING';
  };

  const getAnnouncementMinStart = (ann: Announcement): Date | null => {
    const applySchedules = ann.schedules.filter(s => s.schedule_type.includes('신청접수'));
    if (applySchedules.length === 0) return null;
    let minStart: Date | null = null;
    for (const s of applySchedules) {
      if (s.start_date) {
        const start = new Date(s.start_date);
        if (!isNaN(start.getTime())) {
          if (!minStart || start < minStart) minStart = start;
        }
      }
    }
    return minStart;
  };

  const getAnnouncementMaxEnd = (ann: Announcement): Date | null => {
    const applySchedules = ann.schedules.filter(s => s.schedule_type.includes('신청접수'));
    if (applySchedules.length === 0) return null;
    let maxEnd: Date | null = null;
    for (const s of applySchedules) {
      if (s.end_date) {
        const end = new Date(s.end_date);
        if (!isNaN(end.getTime())) {
          if (!maxEnd || end > maxEnd) maxEnd = end;
        }
      }
    }
    return maxEnd;
  };

  // 💡 DB 행정구역 데이터 규격(서울특별시, 경기도 등)과 필터 탭 라벨을 매핑해주는 헬퍼 함수
  const matchesActiveRegion = (annRegion: string | null | undefined, active: string): boolean => {
    if (active === 'ALL') return true;
    if (!annRegion) return false;
    
    if (active === '서울') return annRegion.startsWith('서울');
    if (active === '경기') return annRegion.startsWith('경기');
    if (active === '인천') return annRegion.startsWith('인천');
    
    if (active === '기타') {
      // 서울, 경기, 인천으로 시작하지 않는 모든 나머지 행정구역들을 기타로 분류
      return !annRegion.startsWith('서울') && 
             !annRegion.startsWith('경기') && 
             !annRegion.startsWith('인천');
    }
    
    return annRegion === active;
  };

  // 💡 지역 구분을 반영한 공고 목록 정렬 및 필터링 함수
  const getSortedAnnouncements = () => {
    const filtered = announcements.filter(ann => {
      // ① 검색어 필터
      const matchesSearch = ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            ann.institution.toLowerCase().includes(searchTerm.toLowerCase());
      
      // ② 지역 구분 필터 (정밀 매퍼 연동)
      const matchesRegion = matchesActiveRegion(ann.region, activeRegion);

      // ③ 접수 상태 및 숨김 필터 분기
      if (activeTabStatus === 'HIDDEN') {
        const isHidden = disabledAnnIds.includes(ann.id);
        return matchesSearch && matchesRegion && isHidden;
      } else {
        const matchesStatus = getAnnouncementStatus(ann) === activeTabStatus;
        const isNotHidden = !disabledAnnIds.includes(ann.id);
        return matchesSearch && matchesRegion && matchesStatus && isNotHidden;
      }
    });

    if (activeTabStatus === 'UPCOMING') {
      return [...filtered].sort((a, b) => {
        const startA = getAnnouncementMinStart(a);
        const startB = getAnnouncementMinStart(b);
        if (!startA && !startB) return 0;
        if (!startA) return 1;
        if (!startB) return -1;
        return startA.getTime() - startB.getTime();
      });
    }

    if (activeTabStatus === 'ONGOING') {
      return [...filtered].sort((a, b) => {
        const endA = getAnnouncementMaxEnd(a);
        const endB = getAnnouncementMaxEnd(b);
        if (!endA && !endB) return 0;
        if (!endA) return 1;
        if (!endB) return -1;
        return endA.getTime() - endB.getTime();
      });
    }

    if (activeTabStatus === 'CLOSED') {
      return [...filtered].sort((a, b) => {
        const endA = getAnnouncementMaxEnd(a);
        const endB = getAnnouncementMaxEnd(b);
        if (!endA && !endB) return 0;
        if (!endA) return 1;
        if (!endB) return -1;
        return endB.getTime() - endA.getTime();
      });
    }

    if (activeTabStatus === 'HIDDEN') {
      return [...filtered].sort((a, b) => {
        const itemA = disabledAnns.find((x) => x.id === a.id);
        const itemB = disabledAnns.find((x) => x.id === b.id);
        if (!itemA || !itemB) return 0;
        return new Date(itemB.disabledAt).getTime() - new Date(itemA.disabledAt).getTime();
      });
    }

    return filtered;
  };

  // 💡 지역 구분을 연계하여 접수 상태별 개수를 동적으로 집계하는 함수 (숨긴 공고 제외)
  const getStatusCount = (status: string) => {
    return announcements.filter(ann => {
      const matchesStatus = getAnnouncementStatus(ann) === status;
      const matchesRegion = matchesActiveRegion(ann.region, activeRegion);
      const isNotHidden = !disabledAnnIds.includes(ann.id);
      return matchesStatus && matchesRegion && isNotHidden;
    }).length;
  };

  // 💡 지역 구분을 연계하여 숨긴 공고 개수를 동적으로 집계하는 함수
  const getHiddenStatusCount = () => {
    return announcements.filter(ann => {
      const matchesRegion = matchesActiveRegion(ann.region, activeRegion);
      const isHidden = disabledAnnIds.includes(ann.id);
      return matchesRegion && isHidden;
    }).length;
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCardClick = (annId: number) => {
    if (activeAnnId === annId) {
      onSelectAnnouncement(null);
    } else {
      onSelectAnnouncement(annId);
    }
  };

  const filteredComplexes = displayComplexes.filter(c => 
    c.name.toLowerCase().includes(complexSearchTerm.toLowerCase()) ||
    c.address.toLowerCase().includes(complexSearchTerm.toLowerCase())
  );

  // 약관 상수 텍스트
  const PRIVACY_POLICY = `제 1 조 (목적)
본 방침은 공공맵(이하 '서비스')이 제공하는 위치기반 정보 서비스 및 회원 편의 서비스 이용과 관련하여 회사가 수집하는 개인정보의 처리 목적, 항목, 보유 기간 등을 규정함을 목적으로 합니다.

제 2 조 (수집하는 개인정보 항목 및 수집 방법)
서비스는 회원가입 없이 브라우저 로컬 저장소(localStorage)만을 활용하여 북마크 정보를 저장하므로, 별도의 개인식별정보(이름, 이메일, 전화번호 등)를 서버에 전송하거나 수집하지 않습니다. 다만, 이용 과정에서 IP 주소, 쿠키, 서비스 이용 기록 등이 자동 생성되어 수집될 수 있습니다.

제 3 조 (개인정보의 보유 및 이용기간)
이용자가 브라우저 캐시 및 로컬 저장소를 삭제할 때까지 북마크 데이터 등은 이용자의 기기에 유지됩니다. 서버에 저장되는 로그 데이터는 통계 분석 및 시스템 안정성 확보를 위해 3개월간 보관 후 복구 불가능한 방법으로 파기됩니다.`;

  const TERMS_OF_SERVICE = `제 1 조 (목적)
본 약관은 공공맵 서비스의 이용 조건 및 절차, 이용자와 서비스 제공자 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.

제 2 조 (용어의 정의)
1. "서비스"란 공공주택 공고문 및 단지 정보를 지도 위에 시각화하여 제공하는 웹 서비스를 의미합니다.
2. "이용자"란 본 약관에 동의하고 서비스를 이용하는 웹 브라우저 방문자를 의미합니다.

제 3 조 (서비스의 내용 및 변경)
1. 서비스는 LH, GH 등 공공기관이 공시한 공고문 데이터를 재구성하여 정보 제공 목적으로 제공합니다.
2. 실제 청약 접수 및 최종 당첨 여부는 해당 시행기관(LH 청약플러스, GH 청약센터 등)의 공식 사이트에서 직접 확인하셔야 하며, 서비스에서 발생하는 정보의 불일치로 인한 불이익에 대해 본 서비스는 법적 책임을 지지 않습니다.`;

  return (
    <aside 
      className={`${styles['app-sidebar']} ${isCollapsed ? styles.collapsed : ''}`} 
      style={{ 
        width: width ? `${width}px` : undefined,
        height: sheetHeight ? `${sheetHeight}px` : undefined,
        ...style
      }}
      {...touchHandlers}
    >
      {/* 모바일 화면 전용 상단 드래그 핸들바 */}
      <div className={styles['drag-handle-bar']} />


      {/* 탭 분기 렌더링 */}
      {activeTab === 'SEARCH' && (
        <>
          <div className={styles['sidebar-search']}>
            <div className={styles['search-wrapper']}>
              <svg
                className={styles['search-icon']}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input 
                type="text" placeholder="공고명 또는 공급기관 검색..." 
                className={styles['search-input']} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className={styles['clear-btn']}
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* ① 지역 구분 필터 태그 */}
            <div className={`${styles['region-tags']} ${styles['desktop-only']}`}>
              {['ALL', '서울', '인천', '경기', '기타'].map((r) => {
                const label = r === 'ALL' ? '전체 지역' : r;
                return (
                  <span 
                    key={r}
                    className={`${styles['region-tag']} ${activeRegion === r ? styles.active : ''}`}
                    onClick={() => setActiveRegion(r)}
                  >
                    {label}
                  </span>
                );
              })}
            </div>

            {/* ② 접수 구분 필터 태그 */}
            <div className={`${styles['filter-tags']} ${styles['desktop-only']}`}>
              <span className={`${styles['filter-tag']} ${activeTabStatus === 'UPCOMING' ? styles.active : ''}`} onClick={() => setActiveTabStatus('UPCOMING')}>
                접수 예정 ({getStatusCount('UPCOMING')})
              </span>
              <span className={`${styles['filter-tag']} ${activeTabStatus === 'ONGOING' ? styles.active : ''}`} onClick={() => setActiveTabStatus('ONGOING')}>
                접수 중 ({getStatusCount('ONGOING')})
              </span>
              <span className={`${styles['filter-tag']} ${activeTabStatus === 'CLOSED' ? styles.active : ''}`} onClick={() => setActiveTabStatus('CLOSED')}>
                접수 마감 ({getStatusCount('CLOSED')})
              </span>
              <span className={`${styles['filter-tag']} ${activeTabStatus === 'HIDDEN' ? styles.active : ''}`} onClick={() => setActiveTabStatus('HIDDEN')}>
                숨긴 공고 ({getHiddenStatusCount()})
              </span>
            </div>
          </div>
          <div 
            ref={listRef} 
            className={styles['sidebar-list']}
            style={{ 
              height: sheetHeight ? `${sheetHeight}px` : undefined,
              overflowY: (sheetHeight !== null && sheetHeight < maxHeight) ? 'hidden' : 'auto'
            }}
            {...touchHandlers}
          >
            {/* 모바일 화면 전용 상단 드래그 핸들바 */}
            <div className={styles['drag-handle-bar']} />
            {/* 모바일 화면 전용 필터 영역 (바텀 시트 내부에 위치) */}
            <div className={styles['mobile-only-filters']}>
              <div className={styles['search-wrapper']}>
                <svg
                  className={styles['search-icon']}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input 
                  type="text" placeholder="공고명 또는 공급기관 검색..." 
                  className={styles['search-input']} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className={styles['clear-btn']}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className={styles['region-tags']}>
                {['ALL', '서울', '인천', '경기', '기타'].map((r) => {
                  const label = r === 'ALL' ? '전체 지역' : r;
                  return (
                    <span 
                      key={r}
                      className={`${styles['region-tag']} ${activeRegion === r ? styles.active : ''}`}
                      onClick={() => setActiveRegion(r)}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
              <div className={styles['filter-tags']}>
                <span className={`${styles['filter-tag']} ${activeTabStatus === 'UPCOMING' ? styles.active : ''}`} onClick={() => setActiveTabStatus('UPCOMING')}>
                  예정 ({getStatusCount('UPCOMING')})
                </span>
                <span className={`${styles['filter-tag']} ${activeTabStatus === 'ONGOING' ? styles.active : ''}`} onClick={() => setActiveTabStatus('ONGOING')}>
                  접수중 ({getStatusCount('ONGOING')})
                </span>
                <span className={`${styles['filter-tag']} ${activeTabStatus === 'CLOSED' ? styles.active : ''}`} onClick={() => setActiveTabStatus('CLOSED')}>
                  마감 ({getStatusCount('CLOSED')})
                </span>
                <span className={`${styles['filter-tag']} ${activeTabStatus === 'HIDDEN' ? styles.active : ''}`} onClick={() => setActiveTabStatus('HIDDEN')}>
                  숨김 ({getHiddenStatusCount()})
                </span>
              </div>
            </div>
            {getSortedAnnouncements().length === 0 ? (
              <div className={styles['empty-msg']}>결과가 없습니다.</div>
            ) : (
              getSortedAnnouncements().map((ann) => {
                const isCurrentActive = ann.id === activeAnnId;
                return (
                  <AnnouncementCard
                    key={ann.id} 
                    ann={ann} 
                    isActive={isCurrentActive}
                    onClick={() => handleCardClick(ann.id)}
                    expandedSections={expandedSections} 
                    onToggleSection={(key) => toggleSection(key)}
                    isComplexListOpen={isComplexListOpen}
                    onToggleComplexList={() => setIsComplexListOpen(!isComplexListOpen)}
                    isDisabled={disabledAnnIds.includes(ann.id)}
                    onDisableToggle={() => handleToggleDisableAnn(ann.id)}
                  >
                    {isCurrentActive && (
                      <div className={styles['complex-search-container']}>
                        <div className={styles['complex-search-wrapper']}>
                          <input 
                            type="text" 
                            placeholder="주택명 검색..." 
                            value={complexSearchTerm}
                            onChange={(e) => setComplexSearchTerm(e.target.value)}
                            className={styles['complex-search-input']}
                          />
                          {complexSearchTerm && (
                            <button 
                              onClick={() => setComplexSearchTerm('')}
                              className={styles['complex-clear-btn']}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className={styles['complexes-list-container']}>
                          {filteredComplexes.length === 0 ? (
                            <div className={styles['complex-empty-msg']}>
                              {complexSearchTerm ? '검색 결과가 없습니다.' : '이 공고는 특정 단지 없이 개별적으로 지원되는 전세임대형 정책이거나, 필터 조건에 맞는 주택이 없습니다.'}
                            </div>
                          ) : (
                            filteredComplexes.map((complex) => (
                              <ComplexCard
                                key={complex.id}
                                complex={complex}
                                isActive={activeComplexId === complex.id}
                                onClick={() => onSelectComplex(complex)}
                                isBookmarked={bookmarkedIds.includes(complex.id)}
                                onBookmarkToggle={() => onToggleBookmark(complex.id)}
                                onMouseEnter={() => onHoverComplex?.(complex.id)}
                                onMouseLeave={() => onHoverComplex?.(null)}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </AnnouncementCard>
                );
              })
            )}
          </div>
        </>
      )}

      {activeTab === 'BOOKMARK' && (
        <div 
          className={styles['bookmark-panel-container']}
          style={{ 
            height: sheetHeight ? `${sheetHeight}px` : undefined,
            overflowY: (sheetHeight !== null && sheetHeight < maxHeight) ? 'hidden' : 'auto'
          }}
          {...touchHandlers}
        >
          {/* 모바일 화면 전용 상단 드래그 핸들바 */}
          <div className={styles['drag-handle-bar']} />
          <div className={styles['bookmark-header']}>
            <h3 className={styles['bookmark-title']}>저장 목록</h3>
            <button 
              className="btn-outline-primary-mini"
              onClick={() => setShowNewFolderInput(!showNewFolderInput)}
            >
              {showNewFolderInput ? '취소' : '+ 폴더 추가'}
            </button>
          </div>

          {showNewFolderInput && (
            <div className={styles['sidebar-folder-add-container']}>
              <div className={styles['sidebar-folder-form-wrap']}>
                <input
                  type="text"
                  placeholder="새 폴더 이름..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  maxLength={15}
                  className={styles['sidebar-folder-input']}
                />
                <button 
                  className={styles['sidebar-folder-submit']}
                  onClick={() => {
                    if (newFolderName.trim()) {
                      onAddFolder(newFolderName.trim(), selectedSidebarColor);
                      setNewFolderName('');
                      setShowNewFolderInput(false);
                    }
                  }}
                >
                  추가
                </button>
              </div>
              <div className={`color-picker-list ${styles['sidebar-color-picker']}`}>
                {BOOKMARK_PRESET_COLORS.map((color) => (
                  <span
                    key={color}
                    className={`color-picker-item ${selectedSidebarColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedSidebarColor(color)}
                    title="폴더 색상 선택"
                  />
                ))}
              </div>
            </div>
          )}

          <div 
            ref={bookmarkListRef} 
            className={styles['folders-list-container']}
            style={{
              overflowY: (sheetHeight !== null && sheetHeight < maxHeight) ? 'hidden' : 'auto'
            }}
          >
            {bookmarkFolders.map((folder) => {
              const isExpanded = activeFolderIds.includes(folder.id);
              const folderItems = bookmarkItems.filter(item => item.folderId === folder.id);
              const folderCount = folderItems.length;
              const folderComplexes = allComplexes.filter(c => folderItems.map(i => i.complexId).includes(c.id));

              return (
                <div 
                  key={folder.id} 
                  id={`folder-card-${folder.id}`}
                  className={`${styles['accordion-item']} ${isExpanded ? styles.active : ''} ${dragOverFolderId === folder.id ? styles['drag-over'] : ''}`}
                  style={{
                    ...(isExpanded ? { borderColor: folder.color } : {}),
                    ...(dragOverFolderId === folder.id ? { borderColor: folder.color } : {})
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggingComplexId) {
                      const item = bookmarkItems.find(i => i.complexId === draggingComplexId);
                      if (item && item.folderId === folder.id) {
                        return;
                      }
                    }
                    if (dragOverFolderId !== folder.id) {
                      setDragOverFolderId(folder.id);
                    }
                  }}
                  onDragLeave={() => {
                    setDragOverFolderId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverFolderId(null);
                    setDraggingComplexId(null); // 👈 부모 폴더 재마운트 시 onDragEnd 유실에 따른 드래그 상태 강제 해제
                    const complexIdStr = e.dataTransfer.getData("text/plain");
                    const complexId = parseInt(complexIdStr, 10);
                    if (!isNaN(complexId) && onMoveBookmarkItem) {
                      onMoveBookmarkItem(complexId, folder.id);
                    }
                  }}
                >
                  {/* 💡 아코디언 헤더: 폴더 행 */}
                  <div 
                    className={`${styles['folder-card']} ${isExpanded ? styles.expanded : ''}`}
                    onClick={() => {
                      if (isExpanded) {
                        setActiveFolderIds(activeFolderIds.filter(id => id !== folder.id));
                      } else {
                        setActiveFolderIds([...activeFolderIds, folder.id]);
                      }
                    }}
                  >
                    <div className={styles['folder-info-left']}>
                      <span 
                        className={styles['folder-color-badge']} 
                        style={{ backgroundColor: folder.color }}
                      >
                        <svg viewBox="0 0 24 24" fill="var(--color-white)">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      </span>
                      {editingFolderId === folder.id ? (
                        <div className={styles['folder-rename-form']} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingFolderName}
                            onChange={(e) => setEditingFolderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveRename(folder.id);
                              } else if (e.key === 'Escape') {
                                setEditingFolderId(null);
                              }
                            }}
                            className={styles['folder-rename-input']}
                            autoFocus
                            maxLength={15}
                          />
                          <button 
                            className={styles['folder-rename-save']}
                            onClick={() => handleSaveRename(folder.id)}
                            title="저장"
                          >
                            ✓
                          </button>
                          <button 
                            className={styles['folder-rename-cancel']}
                            onClick={() => setEditingFolderId(null)}
                            title="취소"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className={styles['folder-name-container']}>
                          <span className={styles['folder-card-name']}>{folder.name}</span>
                          {folder.id !== 'default' && (
                            <button
                              className={styles['folder-edit-btn']}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolderId(folder.id);
                                setEditingFolderName(folder.name);
                              }}
                              title="폴더 이름 수정"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                      <span className={styles['folder-count-badge']}>{folderCount}</span>
                    </div>
                    <div className={styles['folder-info-right']} onClick={(e) => e.stopPropagation()}>
                      {/* 💡 폴더가 열려있고 저장 단지가 있을 때만 노출되는 콤팩트 비교 토글 버튼 */}
                      {isExpanded && folderCount > 0 && (
                        <button 
                          className={`btn-outline-primary-mini ${activeComparisonFolderId === folder.id ? 'active' : ''}`}
                          onClick={() => onToggleComparison(folder.id)}
                          title="상세 패널에서 단지 스펙 비교표를 엽니다"
                        >
                          {activeComparisonFolderId === folder.id ? '비교 표 닫기' : '단지 비교'}
                        </button>
                      )}

                      {folder.id !== 'default' && (
                        <button 
                          className={styles['folder-delete-btn']}
                          onClick={() => {
                            if (confirm(`'${folder.name}' 폴더를 삭제하시겠습니까? 안의 저장 단지들도 함께 해제됩니다.`)) {
                              onRemoveFolder(folder.id);
                              if (isExpanded) {
                                setActiveFolderIds(activeFolderIds.filter(id => id !== folder.id));
                              }
                            }
                          }}
                          title="폴더 삭제"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 💡 아코디언 바디: 단지 목록 */}
                  {isExpanded && (
                    <div className={styles['accordion-body']}>
                      {folderCount === 0 ? (
                        <div className={styles['empty-bookmark-msg']}>
                          이 폴더에 저장된 단지가 없습니다.<br />지도에서 단지를 선택한 뒤 별표를 눌러 저장해 보세요.
                        </div>
                      ) : (
                        <>


                          <div className={styles['sidebar-list']}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                              {folderComplexes.map((complex) => {
                                const item = bookmarkItems.find(i => i.complexId === complex.id);
                                const ann = announcements.find(a => a.id === complex.announcement_id);
                                return (
                                  <div 
                                    key={complex.id} 
                                    className={`${styles['bookmark-card-wrapper']} ${draggingComplexId === complex.id ? styles.dragging : ''}`}
                                    draggable={true}
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData("text/plain", complex.id.toString());
                                      setDraggingComplexId(complex.id);
                                    }}
                                    onDragEnd={() => {
                                      setDraggingComplexId(null);
                                    }}
                                  >
                                    <ComplexCard
                                      complex={complex}
                                      isActive={activeComplexId === complex.id}
                                      onClick={() => {
                                        onSelectAnnouncement(complex.announcement_id);
                                        setTimeout(() => {
                                          onSelectComplex(complex);
                                        }, 100);
                                      }}
                                      isBookmarked={true}
                                      onBookmarkToggle={() => onToggleBookmark(complex.id)}
                                      announcementTitle={ann?.title}
                                      announcementStatus={ann ? getAnnouncementStatus(ann) : undefined}
                                      announcementInstitution={ann?.institution}
                                      announcement={ann}
                                      onMouseEnter={() => onHoverComplex?.(complex.id)}
                                      onMouseLeave={() => onHoverComplex?.(null)}
                                    />
                                    {item?.memo && (
                                      <div className={styles['bookmark-card-memo']}>
                                        <svg className={styles['memo-icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M12 20h9"></path>
                                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                        </svg>
                                        <span className={styles['memo-text']}>{item.memo}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'MORE' && (
        <>
          <div 
            className={styles['more-list-container']}
            style={{ 
              height: sheetHeight ? `${sheetHeight}px` : undefined,
              overflowY: (sheetHeight !== null && sheetHeight < maxHeight) ? 'hidden' : 'auto'
            }}
            {...touchHandlers}
          >
            {/* 모바일 화면 전용 상단 드래그 핸들바 */}
            <div className={styles['drag-handle-bar']} />
            <div className={styles['more-menu-group']}>
              <div className={styles['more-menu-item']} onClick={toggleTheme}>
                <span className={styles['more-menu-label']}>지도 모드</span>
                <div className={styles['more-menu-value-wrapper']}>
                  <span className={styles['more-menu-value']}>{isDarkMode ? "다크 지도" : "기본 지도"}</span>
                  <span className={styles['more-menu-chevron']}>
                    <svg width={UI_SIZES.ICON_XS} height={UI_SIZES.ICON_XS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={UI_STROKE_WIDTHS.BOLD} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </span>
                </div>
              </div>

              <div className={styles['more-menu-item']} onClick={() => setActiveModal('terms')}>
                <span className={styles['more-menu-label']}>이용약관 및 정책</span>
                <span className={styles['more-menu-chevron']}>
                  <svg width={UI_SIZES.ICON_XS} height={UI_SIZES.ICON_XS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={UI_STROKE_WIDTHS.BOLD} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </span>
              </div>
              <div className={styles['more-menu-item']} onClick={() => setActiveModal('privacy')}>
                <span className={styles['more-menu-label']}>개인정보처리방침</span>
                <span className={styles['more-menu-chevron']}>
                  <svg width={UI_SIZES.ICON_XS} height={UI_SIZES.ICON_XS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={UI_STROKE_WIDTHS.BOLD} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </span>
              </div>
            </div>

            <div className={styles['more-info-box-wrapper']}>
              <div className={styles['info-box']}>
                <h4 className={styles['info-box-title']}>
                  <svg className={styles['info-box-icon']} width={UI_SIZES.ICON_XS + 2} height={UI_SIZES.ICON_XS + 2} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={UI_STROKE_WIDTHS.MEDIUM} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  법적 고지 및 데이터 출처
                </h4>
                <p className={styles['info-box-desc']}>
                  본 서비스의 주택 공급 정보와 일정은 LH, GH 등 공공기관의 공고문 데이터를 기반으로 제공됩니다.
                </p>
                <p className={styles['info-box-desc']}>
                  정확한 청약 신청은 시행기관의 공식 홈페이지에서 최종 확인해 주시기 바라며, 제공 정보의 불일치로 인한 법적 책임은 지지 않습니다.
                </p>
              </div>
            </div>

            <div className={styles['more-footer']}>
              <p>&copy; 2026 공공맵 All rights reserved.</p>
            </div>
          </div>
        </>
      )}

      {activeModal && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h3 className={styles['modal-title']}>
                {activeModal === 'privacy' ? '개인정보처리방침' : '이용약관'}
              </h3>
              <button className={styles['modal-close-btn']} onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className={styles['modal-body']}>
              <pre className={styles['modal-pre']}>
                {activeModal === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE}
              </pre>
            </div>
            <div className={styles['modal-footer']}>
              <button className={styles['modal-btn-confirm']} onClick={() => setActiveModal(null)}>확인</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}