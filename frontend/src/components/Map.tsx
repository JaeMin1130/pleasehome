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
} from '@/constants';

// 전역 naver 객체 타입 정의
declare global {
  interface Window {
    naver: any;
  }
}

interface MapProps {
  complexes: Complex[];
  activeComplexId: number | null;
  onSelectComplex: (complex: Complex) => void;
}

export default function Map({ complexes, activeComplexId, onSelectComplex }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [naverMap, setNaverMap] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [markers, setMarkers] = useState<any[]>([]);

  // 1. 네이버 지도 SDK 초기화
  const initMap = () => {
    if (!mapRef.current || !window.naver || !window.naver.maps) return;

    const mapOptions = {
      center: new window.naver.maps.LatLng(MAP_DEFAULT_CENTER.lat, MAP_DEFAULT_CENTER.lng),
      zoom: MAP_DEFAULT_ZOOM,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      zoomControl: false,
      tileTransition: false
    };

    const map = new window.naver.maps.Map(mapRef.current, mapOptions);
    setNaverMap(map);
    setMapLoaded(true);
  };

  // 마운트 시점에 이미 naver 객체가 전역에 로드되어 있다면 즉시 지도 초기화 실행
  // (Next.js 라우팅 전환으로 Script의 onLoad가 트리거되지 않는 예외 상황 처리)
  useEffect(() => {
    if (window.naver && window.naver.maps) {
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

      const isActive = mapped.id === activeComplexId;
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(mapped.latitude, mapped.longitude),
        map: naverMap,
        title: mapped.name,
        icon: {
          content: `
            <div class="custom-marker ${isActive ? 'active' : ''}" style="cursor: pointer;">
              <div class="marker-pin">
                <svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3L3 10.5h2v10h14v-10h2L12 3z" fill="white" />
                  <rect x="9" y="11" width="2.5" height="2.5" class="window-hole" />
                  <rect x="12.5" y="11" width="2.5" height="2.5" class="window-hole" />
                  <rect x="9" y="14.5" width="2.5" height="2.5" class="window-hole" />
                  <rect x="12.5" y="14.5" width="2.5" height="2.5" class="window-hole" />
                </svg>
              </div>
            </div>
          `,
          size: new window.naver.maps.Size(MAP_MARKER_SIZE.width, MAP_MARKER_SIZE.height),
          anchor: new window.naver.maps.Point(MAP_MARKER_ANCHOR.x, MAP_MARKER_ANCHOR.y)
        }
      });

      // 마커 클릭 시 즉시 우측 상세 정보 패널 활성화
      window.naver.maps.Event.addListener(marker, 'click', () => {
        onSelectComplex(mapped);
      });

      newMarkers.push({ id: mapped.id, marker });
    });

    setMarkers(newMarkers);
  }, [complexes, mapLoaded, naverMap]);

  // 3. 외부 활성화 단지 변경 시 마커 상태 동기화
  useEffect(() => {
    if (!naverMap || markers.length === 0 || !activeComplexId) return;

    const target = markers.find(m => m.id === activeComplexId);
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
    }
  }, [activeComplexId, markers, naverMap]);

  const naverClientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;

  return (
    <>
      {naverClientId && (
        <Script
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverClientId}&submodules=geocoding`}
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
