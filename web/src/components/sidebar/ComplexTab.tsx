"use client";

import React from 'react';
import { Complex, Announcement } from '@/types';
import ComplexCard from '@/components/features/ComplexCard';
import styles from '../Sidebar.module.css';

interface ComplexTabProps {
  sheetHeight: number | null;
  maxHeight: number;
  isMounted: boolean;
  minHeight: number;
  translateY: number;
  touchHandlers: any;
  style?: React.CSSProperties;
  allComplexes: Complex[];
  announcements: Announcement[];
  activeComplexId: number | null;
  onSelectComplex: (complex: Complex) => void;
  bookmarkedIds: number[];
  onToggleBookmark: (complexId: number) => void;
  onHoverComplex?: (id: number | null) => void;
  // 💡 부모 상태(HomeClientLayout)와 연동하여 지도 마커/시점과 실시간 싱크하기 위한 Props
  complexSearchTerm: string;
  setComplexSearchTerm: (term: string) => void;
  complexActiveRegion: string;
  onComplexActiveRegionChange: (region: string) => void;
  annRegionMap: Record<number, string>;
}

export default function ComplexTab({
  sheetHeight,
  maxHeight,
  isMounted,
  minHeight,
  translateY,
  touchHandlers,
  style,
  allComplexes,
  announcements,
  activeComplexId,
  onSelectComplex,
  bookmarkedIds,
  onToggleBookmark,
  onHoverComplex,
  complexSearchTerm,
  setComplexSearchTerm,
  complexActiveRegion,
  onComplexActiveRegionChange,
  annRegionMap,
}: ComplexTabProps) {

  // 지오코딩 및 공고 연동을 아우르는 지역 필터 판별 헬퍼 함수
  const matchesRegion = (complex: Complex, active: string): boolean => {
    if (active === 'ALL') return true;
    
    // 💡 1단계: O(1) 맵에서 공고 표준 지역명을 검사하여 판별
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
    
    // 💡 2단계: 공고 지역명이 아예 비어있을 때에만 예외적으로 도로명 주소 파싱을 수행
    const addr = complex.address || '';
    if (active === '서울') {
      return addr.startsWith('서울');
    }
    if (active === '인천') {
      return addr.startsWith('인천');
    }
    if (active === '대전') {
      return addr.startsWith('대전');
    }
    if (active === '대구') {
      return addr.startsWith('대구');
    }
    if (active === '광주') {
      return addr.startsWith('광주');
    }
    if (active === '울산') {
      return addr.startsWith('울산');
    }
    if (active === '부산') {
      return addr.startsWith('부산');
    }
    if (active === '세종') {
      return addr.startsWith('세종');
    }
    if (active === '경기도') {
      return addr.startsWith('경기');
    }
    if (active === '강원도') {
      return addr.startsWith('강원');
    }
    if (active === '충청도') {
      return addr.startsWith('충청');
    }
    if (active === '경상도') {
      return addr.startsWith('경상');
    }
    if (active === '전라도') {
      return addr.startsWith('전라') || addr.startsWith('전북');
    }
    
    return false;
  };

  const filteredComplexes = allComplexes.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(complexSearchTerm.toLowerCase()) ||
                         c.address.toLowerCase().includes(complexSearchTerm.toLowerCase());
    const matchesReg = matchesRegion(c, complexActiveRegion);
    return matchesSearch && matchesReg;
  });

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
            type="text"
            placeholder="단지명 또는 단지 주소 검색..."
            className={styles['search-input']}
            value={complexSearchTerm}
            onChange={(e) => setComplexSearchTerm(e.target.value)}
          />
          {complexSearchTerm && (
            <button
              onClick={() => setComplexSearchTerm('')}
              className={styles['clear-btn']}
            >
              ✕
            </button>
          )}
        </div>

        {/* 광역시 개별 분리 적용된 지역 필터 버튼 레이아웃 */}
        <div className={styles['region-tags']} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px 8px 0', borderTop: 'none' }}>
          {['ALL', '서울', '인천', '대전', '대구', '광주', '울산', '부산', '세종', '경기도', '강원도', '충청도', '경상도', '전라도'].map((r) => {
            const label = r === 'ALL' ? '전체' : r;
            return (
              <span
                key={r}
                className={`${styles['region-tag']} ${complexActiveRegion === r ? styles.active : ''}`}
                onClick={() => onComplexActiveRegionChange(r)}
                style={{ cursor: 'pointer', margin: 0 }}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>

      <div
        className={styles['sidebar-list']}
        style={{
          overflowY: (sheetHeight !== null && sheetHeight < maxHeight) ? 'hidden' : 'auto',
          marginTop: '12px'
        } as React.CSSProperties}
      >
        {filteredComplexes.length === 0 ? (
          <div className={styles['complex-empty-msg']} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            검색 결과와 일치하는 단지가 없습니다.
          </div>
        ) : (
          <div className={styles['complexes-list-container']} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 4px' }}>
            {filteredComplexes.map((complex) => {
              const isActive = activeComplexId === complex.id;
              
              return (
                <div key={complex.id} className={styles['complex-card-wrapper']} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <ComplexCard
                    complex={complex}
                    isActive={isActive}
                    onClick={() => {
                      onSelectComplex(complex);
                    }}
                    isBookmarked={bookmarkedIds.includes(complex.id)}
                    onBookmarkToggle={() => onToggleBookmark(complex.id)}
                    onMouseEnter={() => onHoverComplex?.(complex.id)}
                    onMouseLeave={() => onHoverComplex?.(null)}
                    // 💡 최초 카드 상태에서는 공고 제목 및 타임라인 바 등의 공고 정보 노출을 차단하여 "주소까지만" 나오도록 제어합니다.
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
