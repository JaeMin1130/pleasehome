"use client";

import React from 'react';
import { Announcement, ApplicationStatus, Complex } from '@/types';
import AnnouncementCard from '@/components/features/AnnouncementCard';
import ComplexCard from '@/components/features/ComplexCard';
import styles from '../Sidebar.module.css';

interface SearchTabProps {
  sheetHeight: number | null;
  maxHeight: number;
  isMounted: boolean;
  minHeight: number;
  translateY: number;
  touchHandlers: any;
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
  activeComplexId: number | null;
  onSelectComplex: (complex: Complex) => void;
  bookmarkedIds: number[];
  onToggleBookmark: (complexId: number) => void;
  onHoverComplex?: (id: number | null) => void;
}

export default function SearchTab({
  sheetHeight,
  maxHeight,
  isMounted,
  minHeight,
  translateY,
  touchHandlers,
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
  activeComplexId,
  onSelectComplex,
  bookmarkedIds,
  onToggleBookmark,
  onHoverComplex,
}: SearchTabProps) {
  return (
    <div 
      className={styles['search-panel-container']}
      style={{ 
        height: sheetHeight ? `${sheetHeight}px` : undefined,
        '--sheet-min-height': isMounted ? `${minHeight}px` : '0px',
        transform: (typeof window !== 'undefined' && window.innerWidth <= 768 && translateY > 0) 
          ? `translateY(${translateY}px)` 
          : undefined,
        ...style
      } as React.CSSProperties}
      {...touchHandlers}
    >
      {/* 모바일 화면 전용 상단 드래그 핸들바 */}
      <div className={styles['drag-handle-bar']} />

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
          <span className={`${styles['filter-tag']} ${activeTabStatus === 'FAVORITE' ? styles.active : ''}`} onClick={() => setActiveTabStatus('FAVORITE')}>
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
          <span className={`${styles['filter-tag']} ${activeTabStatus === 'FAVORITE' ? styles.active : ''}`} onClick={() => setActiveTabStatus('FAVORITE')}>
            찜 ({getFavoriteStatusCount()})
          </span>
        </div>
      </div>

      <div 
        ref={listRef} 
        className={styles['sidebar-list']}
        style={{ 
          overflowY: (sheetHeight !== null && sheetHeight < maxHeight) ? 'hidden' : 'auto'
        } as React.CSSProperties}
      >
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
    </div>
  );
}
