"use client";

import { useState, useEffect, useRef } from 'react';
import { useBottomSheetGesture } from '@/hooks/useBottomSheetGesture';
import { Announcement, ApplicationStatus, Complex, BookmarkFolder, BookmarkItem, HousingUnit } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import AnnouncementCard from '@/components/features/AnnouncementCard';
import ComplexCard from '@/components/features/ComplexCard';
import styles from './Sidebar.module.css';
import { formatMoney, formatRent } from '@/utils/formatters';
import {
  UI_SIZES,
  UI_STROKE_WIDTHS,
  BOOKMARK_PRESET_COLORS,
  SECURITY_QUESTIONS,
} from '@/constants';
import AuthModal from '@/components/ui/AuthModal';
import SearchTab from '@/components/sidebar/SearchTab';
import BookmarkTab from '@/components/sidebar/BookmarkTab';
import MoreTab from '@/components/sidebar/MoreTab';

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
  activeTab: 'SEARCH' | 'BOOKMARK' | 'MORE' | null;
  onTabSelect?: (tab: 'SEARCH' | 'BOOKMARK' | 'MORE' | null) => void;
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
  activeTab, onTabSelect, allComplexes, style,
  bookmarkedIds, onToggleBookmark,
  bookmarkFolders, bookmarkItems, activeFolderIds, setActiveFolderIds,
  onAddFolder, onRemoveFolder, onUpdateFolder, onMoveBookmarkItem,
  activeComparisonFolderId, onToggleComparison,
  onHoverComplex
}: SidebarProps) {
  const { member } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { 
    sheetHeight, 
    setSheetHeight, 
    translateY,
    touchHandlers, 
    minHeight, 
    midHeight, 
    maxHeight 
  } = useBottomSheetGesture({
    scrollSelector: '[class*="sidebar-list"], [class*="folders-list-container"], [class*="more-list-container"]',
    onMinHeightReached: () => {
      if (isCollapsed) {
        onSelectAnnouncement(null);
        onTabSelect?.(null);
      } else {
        onCollapseChange?.(true);
      }
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
  const [activeTabStatus, setActiveTabStatus] = useState<ApplicationStatus | 'HIDDEN' | 'FAVORITE'>('ONGOING');
  const [activeRegion, setActiveRegion] = useState<string>('ALL');
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const listRef = useRef<HTMLDivElement>(null);
  const bookmarkListRef = useRef<HTMLDivElement>(null);
  const [bookmarkUnits, setBookmarkUnits] = useState<Record<number, HousingUnit[]>>({});

  // 필터 상태 변경 추적용 Ref
  const prevSearchTermRef = useRef(searchTerm);
  const prevActiveRegionRef = useRef(activeRegion);
  const prevActiveTabStatusRef = useRef(activeTabStatus);

  // 💡 최소 높이 상태에서 검색어나 필터 조건 변경 시 자동으로 중간 높이로 확장
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      const isSearchTermChanged = prevSearchTermRef.current !== searchTerm;
      const isActiveRegionChanged = prevActiveRegionRef.current !== activeRegion;
      const isActiveTabStatusChanged = prevActiveTabStatusRef.current !== activeTabStatus;

      if (
        isCollapsed && 
        (isSearchTermChanged || isActiveRegionChanged || isActiveTabStatusChanged)
      ) {
        onCollapseChange?.(false);
      }
    }
    // 직전 상태 업데이트
    prevSearchTermRef.current = searchTerm;
    prevActiveRegionRef.current = activeRegion;
    prevActiveTabStatusRef.current = activeTabStatus;
  }, [searchTerm, activeRegion, activeTabStatus, isCollapsed, onCollapseChange]);

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

  // 찜한 공고 목록 관리 상태
  const [favoriteAnns, setFavoriteAnns] = useState<{ id: number; favoritedAt: string }[]>([]);
  const favoriteAnnIds = favoriteAnns.map((x) => x.id);

  // 마운트 및 로그인 상태 변경 시 숨긴 공고 목록 로드 (API)
  useEffect(() => {
    const loadHiddenAnns = async () => {
      if (member) {
        try {
          const res = await fetch('/api/member/hidden-anns');
          const data = await res.json();
          if (Array.isArray(data)) {
            setDisabledAnns(data.map((item: any) => ({ id: item.announcement_id, disabledAt: item.hidden_at })));
          }
        } catch (e) {
          console.error('Failed to load hidden announcements', e);
        }
      } else {
        setDisabledAnns([]);
      }
    };
    loadHiddenAnns();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member]);

  const handleToggleDisableAnn = (id: number) => {
    if (!member) {
      setAuthModalOpen(true);
      return;
    }

    const exists = disabledAnns.some((x) => x.id === id);
    let next: { id: number; disabledAt: string }[];
    if (exists) {
      next = disabledAnns.filter((x) => x.id !== id);
      if (member) {
        fetch('/api/member/hidden-anns', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ announcement_id: id }),
        });
      }
    } else {
      next = [...disabledAnns, { id, disabledAt: new Date().toISOString() }];
      if (member) {
        fetch('/api/member/hidden-anns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ announcement_id: id }),
        });
      }

      // [방안 A] 숨길 때 기존 찜 목록에 있다면 찜 해제 처리
      const isFav = favoriteAnns.some((x) => x.id === id);
      if (isFav) {
        const nextFav = favoriteAnns.filter((x) => x.id !== id);
        setFavoriteAnns(nextFav);
        if (member) {
          fetch('/api/member/favorites', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ announcement_id: id }),
          });
        }
      }

      // 현재 보던 공고가 숨겨진다면 공고 선택 상태 해제
      if (activeAnnId === id) {
        onSelectAnnouncement(null);
      }
    }
    setDisabledAnns(next);
  };

  // 마운트 및 로그인 상태 변경 시 찜한 공고 목록 로드 (API)
  useEffect(() => {
    const loadFavoriteAnns = async () => {
      if (member) {
        try {
          const res = await fetch('/api/member/favorites');
          const data = await res.json();
          if (Array.isArray(data)) {
            setFavoriteAnns(data.map((item: any) => ({ id: item.announcement_id, favoritedAt: item.favorited_at })));
          }
        } catch (e) {
          console.error('Failed to load favorite announcements', e);
        }
      } else {
        setFavoriteAnns([]);
      }
    };
    loadFavoriteAnns();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member]);

  const handleToggleFavoriteAnn = (id: number) => {
    if (!member) {
      setAuthModalOpen(true);
      return;
    }

    const exists = favoriteAnns.some((x) => x.id === id);
    let next: { id: number; favoritedAt: string }[];
    if (exists) {
      next = favoriteAnns.filter((x) => x.id !== id);
      if (member) {
        fetch('/api/member/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ announcement_id: id }),
        });
      }
    } else {
      next = [...favoriteAnns, { id, favoritedAt: new Date().toISOString() }];
      if (member) {
        fetch('/api/member/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ announcement_id: id }),
        });
      }

      // [방안 A] 찜할 때 기존 숨김 목록에 있다면 숨김 해제 처리
      const isHidden = disabledAnns.some((x) => x.id === id);
      if (isHidden) {
        const nextDisabled = disabledAnns.filter((x) => x.id !== id);
        setDisabledAnns(nextDisabled);
        if (member) {
          fetch('/api/member/hidden-anns', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ announcement_id: id }),
          });
        }
      }
    }
    setFavoriteAnns(next);
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

  // 로그인 모달 (게스트용 유도)
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // 회원정보 수정 아코디언 상태
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  // 비밀번호 변경 폼
  const [profileCurPwd, setProfileCurPwd] = useState('');
  const [profileNewPwd, setProfileNewPwd] = useState('');
  const [profileNewPwdConfirm, setProfileNewPwdConfirm] = useState('');
  // 보안 질문/답변 수정 폼
  const [profileSecQ, setProfileSecQ] = useState(member?.security_q ?? SECURITY_QUESTIONS[0]);
  const [profileSecA, setProfileSecA] = useState('');

  // 회원정보 수정 폼 서븋미트 핸들러
  const handleProfileUpdate = async (type: 'password' | 'security') => {
    setProfileError('');
    setProfileSuccess('');
    if (type === 'password') {
      if (!profileCurPwd) { setProfileError('현재 비밀번호를 입력해주세요.'); return; }
      if (profileNewPwd.length < 6) { setProfileError('새 비밀번호는 6자 이상이어야 합니다.'); return; }
      if (profileNewPwd !== profileNewPwdConfirm) { setProfileError('비밀번호가 일치하지 않습니다.'); return; }
    } else {
      if (!profileSecA.trim()) { setProfileError('답변을 입력해주세요.'); return; }
    }
    setIsProfileSubmitting(true);
    const body = type === 'password'
      ? { current_password: profileCurPwd, new_password: profileNewPwd }
      : { security_q: profileSecQ, security_a: profileSecA };
    const res = await fetch('/api/auth/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setIsProfileSubmitting(false);
    if (!res.ok) { setProfileError(data.error); return; }
    setProfileSuccess('성공적으로 변경되었습니다.');
    if (type === 'password') {
      setProfileCurPwd(''); setProfileNewPwd(''); setProfileNewPwdConfirm('');
    } else {
      setProfileSecA('');
    }
  };

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

      // ③ 접수 상태 및 숨김/찜 필터 분기
      if (activeTabStatus === 'HIDDEN') {
        const isHidden = disabledAnnIds.includes(ann.id);
        return matchesSearch && matchesRegion && isHidden;
      } else if (activeTabStatus === 'FAVORITE') {
        const isFavorite = favoriteAnnIds.includes(ann.id);
        const isNotHidden = !disabledAnnIds.includes(ann.id);
        return matchesSearch && matchesRegion && isFavorite && isNotHidden;
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

    if (activeTabStatus === 'FAVORITE') {
      return [...filtered].sort((a, b) => {
        const itemA = favoriteAnns.find((x) => x.id === a.id);
        const itemB = favoriteAnns.find((x) => x.id === b.id);
        if (!itemA || !itemB) return 0;
        return new Date(itemB.favoritedAt).getTime() - new Date(itemA.favoritedAt).getTime();
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

  // 💡 지역 구분을 연계하여 찜한 공고 개수를 동적으로 집계하는 함수
  const getFavoriteStatusCount = () => {
    return announcements.filter(ann => {
      const matchesRegion = matchesActiveRegion(ann.region, activeRegion);
      const isFavorite = favoriteAnnIds.includes(ann.id);
      const isNotHidden = !disabledAnnIds.includes(ann.id);
      return matchesRegion && isFavorite && isNotHidden;
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

  const isHiddenFully = activeTab === null;

  return (
    <aside 
      className={`${styles['app-sidebar']} ${isCollapsed ? styles.collapsed : ''} ${isHiddenFully ? styles.hidden : ''}`} 
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
      {activeTab === "SEARCH" && (
        <SearchTab
          sheetHeight={sheetHeight}
          maxHeight={maxHeight}
          isMounted={isMounted}
          minHeight={minHeight}
          translateY={translateY}
          touchHandlers={touchHandlers}
          style={style}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          activeRegion={activeRegion}
          setActiveRegion={setActiveRegion}
          activeTabStatus={activeTabStatus}
          setActiveTabStatus={setActiveTabStatus}
          getStatusCount={getStatusCount}
          getHiddenStatusCount={getHiddenStatusCount}
          getFavoriteStatusCount={getFavoriteStatusCount}
          listRef={listRef}
          sortedAnnouncements={getSortedAnnouncements()}
          activeAnnId={activeAnnId}
          handleCardClick={handleCardClick}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
          isComplexListOpen={isComplexListOpen}
          setIsComplexListOpen={setIsComplexListOpen}
          disabledAnnIds={disabledAnnIds}
          handleToggleDisableAnn={handleToggleDisableAnn}
          favoriteAnnIds={favoriteAnnIds}
          handleToggleFavoriteAnn={handleToggleFavoriteAnn}
          complexSearchTerm={complexSearchTerm}
          setComplexSearchTerm={setComplexSearchTerm}
          filteredComplexes={filteredComplexes}
          activeComplexId={activeComplexId}
          onSelectComplex={onSelectComplex}
          bookmarkedIds={bookmarkedIds}
          onToggleBookmark={onToggleBookmark}
          onHoverComplex={onHoverComplex}
        />
      )}

      {activeTab === "BOOKMARK" && (
        <BookmarkTab
          sheetHeight={sheetHeight}
          maxHeight={maxHeight}
          isMounted={isMounted}
          minHeight={minHeight}
          translateY={translateY}
          touchHandlers={touchHandlers}
          member={member}
          showNewFolderInput={showNewFolderInput}
          setShowNewFolderInput={setShowNewFolderInput}
          setAuthModalOpen={setAuthModalOpen}
          newFolderName={newFolderName}
          setNewFolderName={setNewFolderName}
          selectedSidebarColor={selectedSidebarColor}
          setSelectedSidebarColor={setSelectedSidebarColor}
          onAddFolder={onAddFolder}
          bookmarkListRef={bookmarkListRef}
          bookmarkFolders={bookmarkFolders}
          activeFolderIds={activeFolderIds}
          setActiveFolderIds={setActiveFolderIds}
          bookmarkItems={bookmarkItems}
          allComplexes={allComplexes}
          announcements={announcements}
          dragOverFolderId={dragOverFolderId}
          setDragOverFolderId={setDragOverFolderId}
          draggingComplexId={draggingComplexId}
          setDraggingComplexId={setDraggingComplexId}
          onMoveBookmarkItem={onMoveBookmarkItem}
          editingFolderId={editingFolderId}
          setEditingFolderId={setEditingFolderId}
          editingFolderName={editingFolderName}
          setEditingFolderName={setEditingFolderName}
          handleSaveRename={handleSaveRename}
          activeComparisonFolderId={activeComparisonFolderId}
          onToggleComparison={onToggleComparison}
          onRemoveFolder={onRemoveFolder}
          onSelectAnnouncement={onSelectAnnouncement}
          onSelectComplex={onSelectComplex}
          onToggleBookmark={onToggleBookmark}
          getAnnouncementStatus={getAnnouncementStatus}
          onHoverComplex={onHoverComplex}
        />
      )}

      {activeTab === "MORE" && (
        <MoreTab
          sheetHeight={sheetHeight}
          minHeight={minHeight}
          isMounted={isMounted}
          translateY={translateY}
          touchHandlers={touchHandlers}
          style={style}
          member={member}
          isProfileOpen={isProfileOpen}
          setIsProfileOpen={setIsProfileOpen}
          profileError={profileError}
          setProfileError={setProfileError}
          profileSuccess={profileSuccess}
          setProfileSuccess={setProfileSuccess}
          profileCurPwd={profileCurPwd}
          setProfileCurPwd={setProfileCurPwd}
          profileNewPwd={profileNewPwd}
          setProfileNewPwd={setProfileNewPwd}
          profileNewPwdConfirm={profileNewPwdConfirm}
          setProfileNewPwdConfirm={setProfileNewPwdConfirm}
          isProfileSubmitting={isProfileSubmitting}
          handleProfileUpdate={handleProfileUpdate}
          profileSecQ={profileSecQ}
          setProfileSecQ={setProfileSecQ}
          profileSecA={profileSecA}
          setProfileSecA={setProfileSecA}
          setAuthModalOpen={setAuthModalOpen}
          toggleTheme={toggleTheme}
          isDarkMode={isDarkMode}
          setActiveModal={setActiveModal}
        />
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

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </aside>
  );
}