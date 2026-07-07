"use client";

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Complex } from '@/types';
import styles from './Map.module.css';
import {
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_MIN_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MARKER_SIZE,
  MAP_MARKER_ANCHOR,
  NAVIGATION_BAR_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  LAYOUT_GAP,
} from '@/constants';

// 전역 naver 객체 타입 정의
declare global {
  interface Window {
    naver: any;
  }
}

import { BookmarkFolder, BookmarkItem } from '@/types';

interface MapProps {
  complexes: Complex[];
  activeComplexId: number | null;
  hoveredComplexId: number | null;
  onSelectComplex: (complex: Complex) => void;
  isSidebarCollapsed: boolean;
  bookmarkedIds: number[];
  bookmarkItems: BookmarkItem[];
  bookmarkFolders: BookmarkFolder[];
}

export default function Map({ complexes, activeComplexId, hoveredComplexId, onSelectComplex, isSidebarCollapsed, bookmarkedIds, bookmarkItems, bookmarkFolders }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [naverMap, setNaverMap] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [markers, setMarkers] = useState<any[]>([]);

  // 지도가 중복 마운트 및 재생성되어 초기 좌표로 리셋되는 것을 방지하기 위한 영구 인스턴스 Ref
  const mapInstanceRef = useRef<any>(null);

  // 사용자가 지도의 마커를 직접 클릭했는지 여부를 판별하기 위한 Ref 플래그
  const isMarkerClickedRef = useRef(false);

  // 1. 네이버 지도 SDK 초기화
  const initMap = () => {
    // 💡 이미 지도 인스턴스가 존재하면 중복 생성을 전면 차단
    if (mapInstanceRef.current || !mapRef.current || !window.naver || !window.naver.maps) return;

    const mapOptions = {
      center: new window.naver.maps.LatLng(MAP_DEFAULT_CENTER.lat, MAP_DEFAULT_CENTER.lng),
      zoom: MAP_DEFAULT_ZOOM,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      zoomControl: false,
      tileTransition: false
    };

    const map = new window.naver.maps.Map(mapRef.current, mapOptions);
    mapInstanceRef.current = map; // 레퍼런스 영구 보존
    setNaverMap(map);
    setMapLoaded(true);
  };

  // 마운트 시점에 이미 naver 객체가 전역에 로드되어 있다면 즉시 지도 초기화 실행
  // (Next.js 라우팅 전환으로 Script의 onLoad가 트리거되지 않는 예외 상황 처리)
  useEffect(() => {
    if (window.naver && window.naver.maps && !mapInstanceRef.current) {
      initMap();
    }
  }, []);

  // 2. 주택 단지 마커 생성
  useEffect(() => {
    // 네이버 지도 핵심 클래스(Marker)가 확실히 로드 완료되었는지 체크
    if (!mapLoaded || !naverMap || !window.naver || !window.naver.maps || !window.naver.maps.Marker) return;

    // 기존 마커 전체 삭제 및 맵 연결 해제
    markers.forEach(m => m.marker.setMap(null));

    const newMarkers: any[] = [];
    complexes.forEach((mapped) => {
      if (
        mapped.latitude === null ||
        mapped.longitude === null ||
        isNaN(mapped.latitude) ||
        isNaN(mapped.longitude)
      ) {
        return; // 지오코딩 좌표가 없거나 올바르지 않은 단지는 마커를 렌더링하지 않음
      }

      const isBookmarked = bookmarkedIds.includes(mapped.id);
      const isActive = mapped.id === activeComplexId;

      // 💡 저장 폴더의 테마 컬러를 핀 마커 배경색으로 동적 일치시킴
      const bookmarkItem = bookmarkItems.find(item => item.complexId === mapped.id);
      const folderColor = bookmarkItem
        ? (bookmarkFolders.find(f => f.id === bookmarkItem.folderId)?.color || 'var(--primary, #3B82F6)')
        : 'var(--primary, #3B82F6)';

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(mapped.latitude, mapped.longitude),
        map: naverMap,
        title: mapped.name,
        icon: {
          content: `
            <div class="custom-marker ${isActive ? 'active' : ''} ${isBookmarked ? 'bookmarked' : ''}" style="cursor: pointer;">
              <div class="marker-pin" style="${isBookmarked ? `background-color: ${folderColor};` : ''}">
                ${isBookmarked ? `
                  <svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="white" />
                  </svg>
                ` : `
                  <svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 3L3 10.5h2v10h14v-10h2L12 3z" fill="white" />
                    <rect x="9" y="11" width="2.5" height="2.5" class="window-hole" />
                    <rect x="12.5" y="11" width="2.5" height="2.5" class="window-hole" />
                    <rect x="9" y="14.5" width="2.5" height="2.5" class="window-hole" />
                    <rect x="12.5" y="14.5" width="2.5" height="2.5" class="window-hole" />
                  </svg>
                `}
              </div>
            </div>
          `,
          size: new window.naver.maps.Size(MAP_MARKER_SIZE.width, MAP_MARKER_SIZE.height),
          anchor: new window.naver.maps.Point(MAP_MARKER_ANCHOR.x, MAP_MARKER_ANCHOR.y)
        }
      });

      // 마커 클릭 시 즉시 우측 상세 정보 패널 활성화
      window.naver.maps.Event.addListener(marker, 'click', () => {
        isMarkerClickedRef.current = true; // 지도 위의 마커 직접 클릭 플래그 수립
        onSelectComplex(mapped);
      });

      newMarkers.push({ id: mapped.id, marker });
    });

    setMarkers(newMarkers);
  }, [complexes, mapLoaded, naverMap, bookmarkedIds, bookmarkItems, bookmarkFolders, activeComplexId]);



  // 3. 현재 화면에 실제로 렌더링되어 지도를 덮고 있는 왼쪽 패널 영역의 실시간 총 가로폭을 동적으로 반환하는 헬퍼 함수
  const getActiveCoveredWidth = (isPanelOpening: boolean): number => {
    const navBar = document.querySelector('[class*="navigation-bar"]') as HTMLElement;
    const sidebar = document.querySelector('[class*="app-sidebar"]') as HTMLElement;
    const detailPanel = document.querySelector('[class*="app-detail-panel"]') as HTMLElement;

    let widthSum = 0;
    
    // ① 네비게이션 탭 바 너비 합산
    if (navBar) {
      widthSum += navBar.offsetWidth;
    }
    
    // ② 사이드바 너비 합산 (사이드바가 존재하고 활성 상태일 때만 합산)
    if (sidebar && sidebar.offsetWidth > 0) {
      widthSum += sidebar.offsetWidth;
    }

    // ③ 상세 정보 패널 너비 합산 (단, 상세패널이 새로 열리는 시점이 아닐 때만 렌더링 상태를 체크하여 반영)
    if (!isPanelOpening && detailPanel && detailPanel.offsetWidth > 0) {
      widthSum += detailPanel.offsetWidth + LAYOUT_GAP;
    }

    return widthSum;
  };

  // 4. 외부 활성화 단지 변경 및 사이드바 토글 시 마커 상태 동기화 및 시점 이동 (부드러운 이동 + 동적 오프셋)
  useEffect(() => {
    if (!naverMap || markers.length === 0 || !activeComplexId) return;

    // [경우 B-1, B-2] 사용자가 지도의 마커를 직접 조준 클릭하여 활성화한 경우
    if (isMarkerClickedRef.current) {
      isMarkerClickedRef.current = false; // 플래그 초기화
      
      // 마커의 active 클래스 상태 강제 동기화만 수행하고 지도 스크롤(panTo)은 전면 차단
      markers.forEach(m => {
        const el = m.marker.getElement();
        if (el) {
          const innerMarker = el.querySelector('.custom-marker');
          if (m.id === activeComplexId) {
            innerMarker?.classList.add('active');
          } else {
            innerMarker?.classList.remove('active');
          }
        }
      });
      return;
    }

    const target = markers.find(m => m.id === activeComplexId);
    let timerId: NodeJS.Timeout; // 비동기 타이머 참조 보관

    if (target) {
      // 마커 엘리먼트의 CSS 클래스 강제 토글 (active 디자인 적용)
      markers.forEach(m => {
        const el = m.marker.getElement();
        if (el) {
          const innerMarker = el.querySelector('.custom-marker');
          if (m.id === activeComplexId) {
            innerMarker?.classList.add('active');
          } else {
            innerMarker?.classList.remove('active');
          }
        }
      });

      // 줌 레벨 조정 없이 오직 시점 오프셋 이동만 수행 (150ms 레이아웃 지연 타이밍 반영)
      const markerPosition = target.marker.getPosition();

      timerId = setTimeout(() => {
        if (!naverMap) return;
        
        // 브라우저 레이아웃 리플로우 완료 후, 바뀐 지도의 실제 물리적 크기를 강제 인식시킴
        naverMap.autoResize();

        // 1. 화면에 실제 렌더링되어 떠 있는 활성 마커 DOM 엘리먼트의 물리 픽셀 획득
        const activeMarkerEl = document.querySelector('.custom-marker.active');
        
        if (activeMarkerEl) {
          const rect = activeMarkerEl.getBoundingClientRect();
          const markerX = rect.left;
          const markerY = rect.top;

          // 2. 지도의 실제 전체 픽셀 규격 획득
          const mapSize = naverMap.getSize();
          const mapWidth = mapSize.width;
          const mapHeight = mapSize.height;
          const margin = 40; // 패널 및 지도 경계면의 최소 여유 픽셀

          // 3. 상세 패널이 새로 열리는 시점인지 동적으로 판별
          const detailPanel = document.querySelector('[class*="app-detail-panel"]') as HTMLElement;
          const isPanelOpening = !detailPanel || detailPanel.offsetWidth === 0;

          // 4. 클릭 시점 기준의 동적 가림 폭 획득
          const checkWidth = getActiveCoveredWidth(isPanelOpening);

          // 5. 브라우저 창 뷰포트 내 실제 가용 영역에 마커가 노출되어 있는지 100% 물리 팩트 검증
          const isAlreadyVisible = 
            markerX > (checkWidth + margin) &&
            markerX < (mapWidth - margin) &&
            markerY > margin &&
            markerY < (mapHeight - margin);

          // [경우 A-1-①, A-2-①, D-1] 이미 화면 우측 가용 영역에 노출되어 있다면 지도를 전혀 스크롤하지 않고 조기 리턴
          if (isAlreadyVisible) {
            return;
          }
        }

        // [경우 A-1-②, A-2-②, D-2] 화면 밖에 있거나 패널 밑에 숨어있을 때만 오프셋 계산 후 부드러운 스크롤 실행
        const projection = naverMap.getProjection();
        if (projection) {
          const targetCoveredWidth = getActiveCoveredWidth(false); // 패널 최종 렌더링 상태 기준의 coveredWidth
          const containerPoint = projection.fromCoordToOffset(markerPosition);
          const offsetPoint = new window.naver.maps.Point(
            containerPoint.x - (targetCoveredWidth / 2),
            containerPoint.y
          );

          // 오프셋이 가미된 픽셀 위치를 다시 지도 위경도 좌표로 복원
          const offsetLatLng = projection.fromOffsetToCoord(offsetPoint);

          // 계산된 오프셋 좌표로 부드럽게 시점 이동 (panTo)
          naverMap.panTo(offsetLatLng, {
            duration: 400,
            easing: 'easeOutQuad'
          });
        }
      }, 150);
    }

    // 새로운 상태 변경 시 이전 스크롤 스케줄 타이머를 즉시 취소하여 레이스 컨디션 방지
    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [activeComplexId, markers, naverMap, isSidebarCollapsed]);

  // 5. 호버 중인 단지 마커 상태 동기화 및 최상위 레이어 노출 (Z-Index 제어)
  useEffect(() => {
    if (!naverMap || markers.length === 0) return;

    markers.forEach(m => {
      const el = m.marker.getElement();
      if (el) {
        const innerMarker = el.querySelector('.custom-marker');
        if (m.id === hoveredComplexId) {
          innerMarker?.classList.add('hover');
          m.marker.setZIndex(1000); // 호버 중인 마커를 가장 최상위 레이어로
        } else {
          innerMarker?.classList.remove('hover');
          m.marker.setZIndex(m.id === activeComplexId ? 100 : 10); // 원래 상태로 원복
        }
      }
    });
  }, [hoveredComplexId, markers, naverMap, activeComplexId]);

  const naverClientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;

  return (
    <>
      {naverClientId && (
        <Script
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverClientId}&submodules=geocoder`}
          onLoad={initMap}
          strategy="afterInteractive"
        />
      )}
      <div className={styles['map-container']}>
        <div ref={mapRef} className={styles['map-canvas']} />
      </div>
    </>
  );
}
