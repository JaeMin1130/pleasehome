"use client";

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

// 전역 naver 객체 타입 정의
declare global {
  interface Window {
    naver: any;
  }
}



// 자치구별 중심 좌표 폴백
const REGION_COORDINATES: { [key: string]: [number, number] } = {
  '은평구': [37.6027, 126.9291],
  '의정부': [37.7381, 127.0337],
  '강북구': [37.6396, 127.0257],
  '동작구': [37.5124, 126.9397],
  '강남구': [37.4959, 127.0664],
  '강서구': [37.5509, 126.8497],
  '노원구': [37.6542, 127.0565],
  '성동구': [37.5635, 127.0368],
  '강동구': [37.5302, 127.1237],
  '광진구': [37.5385, 127.0823],
  '구로구': [37.4954, 126.8874],
  '금천구': [37.4573, 126.8954],
  '동대문구': [37.5744, 127.0397],
  '마포구': [37.5622, 126.9083],
  '서초구': [37.4837, 127.0324],
  '송파구': [37.5145, 127.1062],
  '양천구': [37.5169, 126.8665],
  '영등포구': [37.5264, 126.8962],
  '중랑구': [37.6065, 127.0927],
  '관악구': [37.4784, 126.9516],
  '성북구': [37.5894, 127.0167],
  '용산구': [37.5326, 126.9904],
  '종로구': [37.5730, 126.9794],
  '중구': [37.5638, 126.9976],
  '서대문구': [37.5791, 126.9368],
  '남양주': [37.6360, 127.2165]
};

// 2번 이슈: 주소 변환 레이턴시를 최소화하기 위한 인메모리 지오코딩 캐시
const GEOCODE_CACHE: { [address: string]: [number, number] } = {};

interface Complex {
  id: number;
  announcement_id: number;
  name: string;
  address: string;
  heating_type?: string;
  has_elevator?: boolean;
  parking_info?: string;
}

interface MappedComplex extends Complex {
  lat: number;
  lng: number;
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
  const [mappedComplexes, setMappedComplexes] = useState<MappedComplex[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);

  // 1. 네이버 지도 SDK 초기화
  const initMap = () => {
    if (!mapRef.current || !window.naver || !window.naver.maps) return;

    const mapOptions = {
      center: new window.naver.maps.LatLng(37.5665, 126.9780),
      zoom: 11,
      minZoom: 6,
      maxZoom: 19,
      zoomControl: false
    };

    const map = new window.naver.maps.Map(mapRef.current, mapOptions);
    setNaverMap(map);
    setMapLoaded(true);
  };

  // 2. 주택 단지 주소 지오코딩 및 마커 생성
  useEffect(() => {
    // 네이버 지도 핵심 클래스(Marker, Service)가 확실히 로드 완료되었는지 2중 체크
    if (!mapLoaded || !naverMap || !window.naver || !window.naver.maps || !window.naver.maps.Marker) return;

    // 기존 마커 전체 삭제 및 맵 연결 해제
    markers.forEach(m => m.marker.setMap(null));

    let isMounted = true;

    const geocodeAll = async () => {
      // 병렬 지오코딩 프로미스 배열 생성
      const promises = complexes.map(async (c, i) => {
        const addr = c.address;

        // 괄호 및 전각 괄호 기호와 그 뒤에 오는 부가 텍스트 제거하여 순수 행정 주소로 정제
        const cleanAddr = addr.split(/[([\uFF08\u3010]/)[0].trim();

        // A. 인메모리 캐시 우선 확인
        if (GEOCODE_CACHE[cleanAddr]) {
          const [lat, lng] = GEOCODE_CACHE[cleanAddr];
          return { ...c, lat, lng };
        }

        // B. 네이버 지오코딩 API 시도 (정제된 순수 주소 쿼리 사용)
        if (window.naver?.maps?.Service?.geocode) {
          try {
            const coords = await new Promise<[number, number] | null>((resolve) => {
              window.naver.maps.Service.geocode({ query: cleanAddr }, (status: any, response: any) => {
                if (status === window.naver.maps.Service.Status.OK && response.v2.addresses.length > 0) {
                  const item = response.v2.addresses[0];
                  resolve([parseFloat(item.y), parseFloat(item.x)]);
                } else {
                  resolve(null);
                }
              });
            });
            if (coords) {
              GEOCODE_CACHE[cleanAddr] = coords;
              return { ...c, lat: coords[0], lng: coords[1] };
            }
          } catch (e) {
            // 실패 시 폴백 진행
          }
        }

        // C. 자치구 중심점 기반 분산 폴백
        for (const region of Object.keys(REGION_COORDINATES)) {
          if (cleanAddr.includes(region) || addr.includes(region)) {
            const base = REGION_COORDINATES[region];
            const offsetLat = ((i % 7) - 3) * 0.0015;
            const offsetLng = ((Math.floor(i / 7) % 7) - 3) * 0.0015;
            const lat = base[0] + offsetLat;
            const lng = base[1] + offsetLng;
            GEOCODE_CACHE[cleanAddr] = [lat, lng];
            return { ...c, lat, lng };
          }
        }

        // D. 서울 시청 중심점 기반 최종 분산 폴백
        const lat = 37.5665 + ((i % 11) - 5) * 0.003;
        const lng = 126.9780 + ((Math.floor(i / 11) % 11) - 5) * 0.003;
        GEOCODE_CACHE[cleanAddr] = [lat, lng];
        return { ...c, lat, lng };
      });

      // 모든 주택 단지에 대해 병렬 지오코딩 처리 수행
      const results = await Promise.all(promises);

      // 비동기 완료 후 맵이 여전히 마운트되어 있고 유효한지 검사
      if (!isMounted || !window.naver || !window.naver.maps || !window.naver.maps.Marker) {
        return;
      }

      const newMarkers: any[] = [];

      // 매핑된 주택 좌표 목록 기반으로 마커 고속 생성
      results.forEach((mapped) => {
        const isActive = mapped.id === activeComplexId;
        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(mapped.lat, mapped.lng),
          map: naverMap,
          title: mapped.name,
          icon: {
            content: `
              <div class="custom-marker ${isActive ? 'active' : ''}" style="cursor: pointer;">
                <div class="marker-pin"></div>
              </div>
            `,
            size: new window.naver.maps.Size(30, 30),
            anchor: new window.naver.maps.Point(15, 30)
          }
        });

        // 마커 클릭 시 즉시 우측 상세 정보 패널 활성화
        window.naver.maps.Event.addListener(marker, 'click', () => {
          onSelectComplex(mapped);
        });

        newMarkers.push({ id: mapped.id, marker });
      });

      if (isMounted) {
        setMappedComplexes(results);
        setMarkers(newMarkers);
      }
    };

    geocodeAll();

    return () => {
      isMounted = false;
    };
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
      <div className="map-wrapper">
        <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '12px' }} />
      </div>
    </>
  );
}
