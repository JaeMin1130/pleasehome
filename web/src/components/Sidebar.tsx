"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useBottomSheetGesture } from '@/hooks/useBottomSheetGesture';
import { Announcement, ApplicationStatus, Complex, BookmarkFolder, BookmarkItem } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useFeedback } from '@/components/ui/Feedback';
import AnnouncementCard from '@/components/features/AnnouncementCard';
import ComplexCard from '@/components/features/ComplexCard';
import styles from './Sidebar.module.css';
import { formatMoney, formatRent } from '@/utils/formatters';
import {
  UI_SIZES,
  UI_STROKE_WIDTHS,
  BOOKMARK_PRESET_COLORS,
  SECURITY_QUESTIONS,
  REGION_FILTERS,
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
  isComplexesLoading?: boolean;
  activeComplexId: number | null;
  onSelectComplex: (complex: Complex) => void;
  activeTab: 'SEARCH' | 'BOOKMARK' | 'MORE' | null;
  onTabSelect?: (tab: 'SEARCH' | 'BOOKMARK' | 'MORE' | null) => void;
  bookmarkedComplexes: Complex[];
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
  displayComplexes, isComplexesLoading, activeComplexId, onSelectComplex,
  activeTab, onTabSelect, bookmarkedComplexes, style,
  bookmarkedIds, onToggleBookmark,
  bookmarkFolders, bookmarkItems, activeFolderIds, setActiveFolderIds,
  onAddFolder, onRemoveFolder, onUpdateFolder, onMoveBookmarkItem,
  activeComparisonFolderId, onToggleComparison,
  onHoverComplex
}: SidebarProps) {
  const { member, favoriteAnns: memberFavoriteAnns, hiddenAnns: memberHiddenAnns } = useAuth();
  const { showToast } = useFeedback();
  const [searchTerm, setSearchTerm] = useState('');
  const [complexSearchTerm, setComplexSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { 
    sheetHeight, 
    setSheetHeight, 
    toggleSheetHeight,
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


  const [activeTabStatus, setActiveTabStatus] = useState<ApplicationStatus | 'HIDDEN' | 'FAVORITE'>('ONGOING');
  const [activeRegion, setActiveRegion] = useState<string>('ALL');
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const listRef = useRef<HTMLDivElement>(null);
  const bookmarkListRef = useRef<HTMLDivElement>(null);

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

  // 💡 로그인 상태 확인(/api/auth/me)에 번들링되어 온 숨김 공고 스냅샷을 그대로 동기화
  // (과거엔 여기서 별도 fetch('/api/member/hidden-anns')를 호출해 2-hop 대기가 있었음)
  useEffect(() => {
    setDisabledAnns(member ? memberHiddenAnns : []);
  }, [member, memberHiddenAnns]);

  // 찜/숨김은 화면을 먼저 바꾸고(낙관적 업데이트) 서버 저장이 실패하면 두 목록을 클릭 전 상태로 되돌린다.
  // 한 번의 클릭이 요청 2건을 보낼 수 있어, 롤백과 알림은 클릭당 1회만 실행한다.
  const makeInterestRollback = () => {
    const prevDisabled = disabledAnns;
    const prevFavorite = favoriteAnns;
    let rolledBack = false;
    return () => {
      if (rolledBack) return;
      rolledBack = true;
      setDisabledAnns(prevDisabled);
      setFavoriteAnns(prevFavorite);
      showToast('저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    };
  };

  const persistInterest = (method: 'POST' | 'DELETE', path: 'favorites' | 'hidden-anns', id: number, onFail: () => void) => {
    fetch(`/api/member/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement_id: id }),
    })
      .then((res) => { if (!res.ok) onFail(); })
      .catch(onFail);
  };

  const handleToggleDisableAnn = (id: number) => {
    if (!member) {
      setAuthModalOpen(true);
      return;
    }

    const onFail = makeInterestRollback();
    const exists = disabledAnns.some((x) => x.id === id);
    let next: { id: number; disabledAt: string }[];
    if (exists) {
      next = disabledAnns.filter((x) => x.id !== id);
      persistInterest('DELETE', 'hidden-anns', id, onFail);
    } else {
      next = [...disabledAnns, { id, disabledAt: new Date().toISOString() }];
      persistInterest('POST', 'hidden-anns', id, onFail);

      // [방안 A] 숨길 때 기존 찜 목록에 있다면 찜 해제 처리
      const isFav = favoriteAnns.some((x) => x.id === id);
      if (isFav) {
        setFavoriteAnns(favoriteAnns.filter((x) => x.id !== id));
        persistInterest('DELETE', 'favorites', id, onFail);
      }

      // 현재 보던 공고가 숨겨진다면 공고 선택 상태 해제
      if (activeAnnId === id) {
        onSelectAnnouncement(null);
      }

      // 숨긴 카드는 목록에서 바로 사라지므로 무엇이 일어났는지 알리고 되돌릴 수 있게 한다.
      // 토스트 클릭 시점의 최신 상태로 처리하도록 ref의 핸들러를 호출한다(렌더 시점 클로저는 이미 낡음).
      showToast('공고를 숨겼습니다. 숨김 탭에서 다시 볼 수 있어요.', {
        label: '실행 취소',
        onClick: () => (isFav ? toggleFavoriteRef.current(id) : toggleHideRef.current(id)),
      });
    }
    setDisabledAnns(next);
  };

  // 💡 로그인 상태 확인(/api/auth/me)에 번들링되어 온 찜 공고 스냅샷을 그대로 동기화
  useEffect(() => {
    setFavoriteAnns(member ? memberFavoriteAnns : []);
  }, [member, memberFavoriteAnns]);

  const handleToggleFavoriteAnn = (id: number) => {
    if (!member) {
      setAuthModalOpen(true);
      return;
    }

    const onFail = makeInterestRollback();
    const exists = favoriteAnns.some((x) => x.id === id);
    let next: { id: number; favoritedAt: string }[];
    if (exists) {
      next = favoriteAnns.filter((x) => x.id !== id);
      persistInterest('DELETE', 'favorites', id, onFail);
    } else {
      next = [...favoriteAnns, { id, favoritedAt: new Date().toISOString() }];
      persistInterest('POST', 'favorites', id, onFail);

      // [방안 A] 찜할 때 기존 숨김 목록에 있다면 숨김 해제 처리
      const isHidden = disabledAnns.some((x) => x.id === id);
      if (isHidden) {
        setDisabledAnns(disabledAnns.filter((x) => x.id !== id));
        persistInterest('DELETE', 'hidden-anns', id, onFail);
      }
    }
    setFavoriteAnns(next);
  };

  // 숨김 토스트의 실행 취소가 클릭 시점의 최신 상태로 동작하도록 매 렌더 최신 핸들러를 보관
  const toggleHideRef = useRef(handleToggleDisableAnn);
  toggleHideRef.current = handleToggleDisableAnn;
  const toggleFavoriteRef = useRef(handleToggleFavoriteAnn);
  toggleFavoriteRef.current = handleToggleFavoriteAnn;

  // 사이드바 폴더 폼 상태
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [selectedSidebarColor, setSelectedSidebarColor] = useState<string>(BOOKMARK_PRESET_COLORS[0]);

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
      if (profileNewPwd.length < 3) { setProfileError('새 비밀번호는 3자 이상이어야 합니다.'); return; }
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
    
    // 전국 대상 공고는 어느 지역을 골라도 보여준다
    if (annRegion.startsWith('전국')) return true;
    const group = REGION_FILTERS.find((r) => r.key === active);
    return group ? group.prefixes.some((p) => annRegion.startsWith(p)) : annRegion === active;
  };

  // 목록 필터와 상태 칩 개수가 같은 기준을 쓰도록 검색어 판정을 한 곳에 둔다
  const matchesSearchTerm = (ann: Announcement) => {
    const term = searchTerm.toLowerCase();
    return ann.title.toLowerCase().includes(term) || ann.institution.toLowerCase().includes(term);
  };

  // 💡 지역 구분을 반영한 공고 목록 정렬 및 필터링 함수
  // 💡 지역 구분을 반영한 공고 목록 정렬 및 필터링 (useMemo)
  const sortedAnnouncements = useMemo(() => {
    const filtered = announcements.filter(ann => {
      // ① 검색어 필터
      const matchesSearch = matchesSearchTerm(ann);
      
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
  }, [announcements, searchTerm, activeRegion, activeTabStatus, disabledAnnIds, favoriteAnnIds, disabledAnns, favoriteAnns]);

  const getSortedAnnouncements = () => sortedAnnouncements;

  // 사용자가 검색어·지역·상태를 바꿔 선택된 공고가 목록에서 사라지면 선택을 해제해, 지도에 그 공고의 마커가 남지 않게 한다.
  // activeAnnId 변화(딥링크 등)에는 반응하지 않도록 필터 값만 의존한다 — 그 경우는 위의 필터 동기화 effect가 담당.
  useEffect(() => {
    if (activeAnnId !== null && !sortedAnnouncements.some(a => a.id === activeAnnId)) {
      onSelectAnnouncement(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, activeRegion, activeTabStatus]);

  // 💡 지역 구분을 연계하여 접수 상태별 개수를 단 1회 순회로 집계 (useMemo)
  const statusCounts = useMemo(() => {
    let upcoming = 0;
    let ongoing = 0;
    let closed = 0;
    let hidden = 0;
    let favorite = 0;

    announcements.forEach(ann => {
      const matchesRegion = matchesActiveRegion(ann.region, activeRegion);
      if (!matchesRegion) return;
      if (!matchesSearchTerm(ann)) return;

      const isHidden = disabledAnnIds.includes(ann.id);
      if (isHidden) {
        hidden++;
        return;
      }

      if (favoriteAnnIds.includes(ann.id)) {
        favorite++;
      }

      const status = getAnnouncementStatus(ann);
      if (status === 'UPCOMING') upcoming++;
      else if (status === 'ONGOING') ongoing++;
      else if (status === 'CLOSED') closed++;
    });

    return { upcoming, ongoing, closed, hidden, favorite };
  }, [announcements, activeRegion, searchTerm, disabledAnnIds, favoriteAnnIds]);

  const getStatusCount = (status: string) => {
    if (status === 'UPCOMING') return statusCounts.upcoming;
    if (status === 'ONGOING') return statusCounts.ongoing;
    if (status === 'CLOSED') return statusCounts.closed;
    return 0;
  };

  const getHiddenStatusCount = () => statusCounts.hidden;
  const getFavoriteStatusCount = () => statusCounts.favorite;

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
  const isHiddenFully = activeTab === null;

  return (
    <aside 
      className={`${styles['app-sidebar']} ${isCollapsed ? styles.collapsed : ''} ${isHiddenFully ? styles.hidden : ''}`} 
      style={{ 
        width: width ? `${width}px` : undefined,
        ...style
      }}
    >
      {/* 탭 분기 렌더링 */}
      {activeTab === "SEARCH" && (
        <SearchTab
          sheetHeight={sheetHeight}
          minHeight={minHeight}
          touchHandlers={touchHandlers}
          onToggleSheetHeight={toggleSheetHeight}
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
          sortedAnnouncements={sortedAnnouncements}
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
          isComplexesLoading={isComplexesLoading}
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
          minHeight={minHeight}
          touchHandlers={touchHandlers}
          onToggleSheetHeight={toggleSheetHeight}
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
          bookmarkedComplexes={bookmarkedComplexes}
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
          touchHandlers={touchHandlers}
          onToggleSheetHeight={toggleSheetHeight}
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
        />
      )}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </aside>
  );
}