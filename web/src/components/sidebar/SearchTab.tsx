"use client";

import { clickable } from '@/utils/a11y';
import { REGION_FILTERS } from '@/constants';
import React from 'react';
import { Announcement, ApplicationStatus, Complex } from '@/types';
import AnnouncementCard from '@/components/features/AnnouncementCard';
import ComplexCard, { displayedCounts } from '@/components/features/ComplexCard';
import CatRunLoader from '@/components/ui/CatRunLoader';
import styles from '../Sidebar.module.css';

interface SearchTabProps {
  sheetHeight: number | null;
  minHeight: number;
  touchHandlers: any;
  onToggleSheetHeight?: () => void;
  style?: React.CSSProperties;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeRegion: string;
  setActiveRegion: (region: string) => void;
  activeTabStatus: ApplicationStatus | 'HIDDEN' | 'FAVORITE';
  setActiveTabStatus: (status: ApplicationStatus | 'HIDDEN' | 'FAVORITE') => void;
  getStatusCount: (status: string) => number;
  getHiddenStatusCount: () => number;
  getFavoriteStatusCount: () => number;
  listRef: React.RefObject<HTMLDivElement | null>;
  sortedAnnouncements: Announcement[];
  activeAnnId: number | null;
  handleCardClick: (annId: number) => void;
  expandedSections: { [key: string]: boolean };
  toggleSection: (key: string) => void;
  isComplexListOpen: boolean;
  setIsComplexListOpen: (open: boolean) => void;
  disabledAnnIds: number[];
  handleToggleDisableAnn: (id: number) => void;
  favoriteAnnIds: number[];
  handleToggleFavoriteAnn: (id: number) => void;
  complexSearchTerm: string;
  setComplexSearchTerm: (term: string) => void;
  filteredComplexes: Complex[];
  isComplexesLoading?: boolean;
  activeComplexId: number | null;
  onSelectComplex: (complex: Complex) => void;
  bookmarkedIds: number[];
  onToggleBookmark: (complexId: number) => void;
  onHoverComplex?: (id: number | null) => void;
}

export default function SearchTab({
  sheetHeight,
  minHeight,
  touchHandlers,
  onToggleSheetHeight,
  style,
  searchTerm,
  setSearchTerm,
  activeRegion,
  setActiveRegion,
  activeTabStatus,
  setActiveTabStatus,
  getStatusCount,
  getHiddenStatusCount,
  getFavoriteStatusCount,
  listRef,
  sortedAnnouncements,
  activeAnnId,
  handleCardClick,
  expandedSections,
  toggleSection,
  isComplexListOpen,
  setIsComplexListOpen,
  disabledAnnIds,
  handleToggleDisableAnn,
  favoriteAnnIds,
  handleToggleFavoriteAnn,
  complexSearchTerm,
  setComplexSearchTerm,
  filteredComplexes,
  isComplexesLoading,
  activeComplexId,
  onSelectComplex,
  bookmarkedIds,
  onToggleBookmark,
  onHoverComplex,
}: SearchTabProps) {
  // 공급 주택 목록 정렬: 기본순은 주소(시→구→동 묶음) → 단지명, 면적순은 단지 최대 전용면적 큰 순, 공급순은 카드에 보이는 공급호수 → 예비자수 큰 순
  const [complexSort, setComplexSort] = React.useState<'DEFAULT' | 'AREA' | 'SUPPLY'>('DEFAULT');
  const sortedComplexes = [...filteredComplexes].sort((a, b) => {
    if (complexSort === 'DEFAULT') {
      return (a.address || '').localeCompare(b.address || '', 'ko', { numeric: true })
        || a.name.localeCompare(b.name, 'ko', { numeric: true });
    }
    if (complexSort === 'AREA') {
      return (b.max_exclusive_area ?? b.min_exclusive_area ?? 0) - (a.max_exclusive_area ?? a.min_exclusive_area ?? 0);
    }
    const ca = displayedCounts(a), cb = displayedCounts(b);
    return ((cb.supply ?? 0) - (ca.supply ?? 0)) || ((cb.reserve ?? 0) - (ca.reserve ?? 0));
  });

  return (
    <div 
      className={styles['search-panel-container']}
      style={{ 
        height: sheetHeight ? `${sheetHeight}px` : undefined,
        '--sheet-min-height': `${minHeight}px`,
        ...style
      } as React.CSSProperties}
      {...touchHandlers}
    >
      {/* 모바일 화면 전용 상단 드래그 핸들바 */}
      <div 
        className={styles['drag-handle-bar']} 
        onClick={onToggleSheetHeight}
        role="button"
        tabIndex={0}
        aria-label="바텀시트 크기 전환"
      />

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
          {REGION_FILTERS.map(({ key: r, label }) => {
            return (
              <span 
                key={r}
                className={`${styles['region-tag']} ${activeRegion === r ? styles.active : ''}`}
                {...clickable(() => setActiveRegion(r), { pressed: activeRegion === r })}
              >
                {label}
              </span>
            );
          })}
        </div>

        {/* ② 접수 구분 필터 태그 */}
        <div className={`${styles['filter-tags']} ${styles['desktop-only']}`}>
          <span className={`${styles['filter-tag']} ${activeTabStatus === 'UPCOMING' ? styles.active : ''}`} {...clickable(() => setActiveTabStatus('UPCOMING'), { pressed: activeTabStatus === 'UPCOMING' })}>
            예정 ({getStatusCount('UPCOMING')})
          </span>
          <span className={`${styles['filter-tag']} ${activeTabStatus === 'ONGOING' ? styles.active : ''}`} {...clickable(() => setActiveTabStatus('ONGOING'), { pressed: activeTabStatus === 'ONGOING' })}>
            접수중 ({getStatusCount('ONGOING')})
          </span>
          <span className={`${styles['filter-tag']} ${activeTabStatus === 'CLOSED' ? styles.active : ''}`} {...clickable(() => setActiveTabStatus('CLOSED'), { pressed: activeTabStatus === 'CLOSED' })}>
            마감 ({getStatusCount('CLOSED')})
          </span>
          <span className={`${styles['filter-tag']} ${activeTabStatus === 'HIDDEN' ? styles.active : ''}`} {...clickable(() => setActiveTabStatus('HIDDEN'), { pressed: activeTabStatus === 'HIDDEN' })}>
            숨김 ({getHiddenStatusCount()})
          </span>
          <span className={`${styles['filter-tag']} ${activeTabStatus === 'FAVORITE' ? styles.active : ''}`} {...clickable(() => setActiveTabStatus('FAVORITE'), { pressed: activeTabStatus === 'FAVORITE' })}>
            찜 ({getFavoriteStatusCount()})
          </span>
        </div>
      </div>

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
      </div>

      <div 
        ref={listRef} 
        className={styles['sidebar-list']}
      >
        {/* 모바일: 칩 두 줄을 목록과 함께 스크롤시켜 바텀시트에서 카드가 보이는 영역을 넓힌다 (검색창만 고정) */}
        <div className={styles['mobile-only-chips']}>
          <div className={styles['region-tags']}>
            {REGION_FILTERS.map(({ key: r, label }) => {
              return (
                <span 
                  key={r}
                  className={`${styles['region-tag']} ${activeRegion === r ? styles.active : ''}`}
                  {...clickable(() => setActiveRegion(r), { pressed: activeRegion === r })}
                >
                  {label}
                </span>
              );
            })}
          </div>
          <div className={styles['filter-tags']}>
            <span className={`${styles['filter-tag']} ${activeTabStatus === 'UPCOMING' ? styles.active : ''}`} {...clickable(() => setActiveTabStatus('UPCOMING'), { pressed: activeTabStatus === 'UPCOMING' })}>
              예정 ({getStatusCount('UPCOMING')})
            </span>
            <span className={`${styles['filter-tag']} ${activeTabStatus === 'ONGOING' ? styles.active : ''}`} {...clickable(() => setActiveTabStatus('ONGOING'), { pressed: activeTabStatus === 'ONGOING' })}>
              접수중 ({getStatusCount('ONGOING')})
            </span>
            <span className={`${styles['filter-tag']} ${activeTabStatus === 'CLOSED' ? styles.active : ''}`} {...clickable(() => setActiveTabStatus('CLOSED'), { pressed: activeTabStatus === 'CLOSED' })}>
              마감 ({getStatusCount('CLOSED')})
            </span>
            <span className={`${styles['filter-tag']} ${activeTabStatus === 'HIDDEN' ? styles.active : ''}`} {...clickable(() => setActiveTabStatus('HIDDEN'), { pressed: activeTabStatus === 'HIDDEN' })}>
              숨김 ({getHiddenStatusCount()})
            </span>
            <span className={`${styles['filter-tag']} ${activeTabStatus === 'FAVORITE' ? styles.active : ''}`} {...clickable(() => setActiveTabStatus('FAVORITE'), { pressed: activeTabStatus === 'FAVORITE' })}>
              찜 ({getFavoriteStatusCount()})
            </span>
          </div>
        </div>
        {sortedAnnouncements.length === 0 ? (
          <div className={styles['empty-msg']}>결과가 없습니다.</div>
        ) : (
          sortedAnnouncements.map((ann) => {
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
                isFavorite={favoriteAnnIds.includes(ann.id)}
                onFavoriteToggle={() => handleToggleFavoriteAnn(ann.id)}
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
                    <div className={styles['complex-sort-tags']}>
                      {([['DEFAULT', '기본순'], ['AREA', '면적순'], ['SUPPLY', '공급순']] as const).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={`${styles['region-tag']} ${complexSort === key ? styles.active : ''}`}
                          onClick={() => setComplexSort(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className={styles['complexes-list-container']}>
                      {isComplexesLoading ? (
                        <div className={styles['complex-loading']}>
                          <CatRunLoader label="단지 목록을 불러오는 중..." scale={0.4} />
                        </div>
                      ) : filteredComplexes.length === 0 ? (
                        <div className={styles['complex-empty-msg']}>
                          {complexSearchTerm ? '검색 결과가 없습니다.' : '이 공고는 특정 단지 없이 개별적으로 지원되는 전세임대형 정책이거나, 필터 조건에 맞는 주택이 없습니다.'}
                        </div>
                      ) : (
                        sortedComplexes.map((complex) => (
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
    </div>
  );
}
