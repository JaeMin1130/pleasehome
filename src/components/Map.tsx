"use client";

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

// 전역 naver 객체 타입 정의
declare global {
  interface Window {
    naver: any;
  }
}

// Fallback Cache 매핑 (단지 키워드 기반)
const KEYWORD_COORDINATES: { [key: string]: [number, number] } = {
  '수락리버시티': [37.6843, 127.0549],
  '마고정': [37.6321, 126.9192],
  '박석고개': [37.6324, 126.9213],
  '우물골': [37.6358, 126.9248],
  '구파발': [37.6375, 126.9189],
  '엘리프 미아역': [37.6264, 127.0261],
  '힐스테이트 동작': [37.4913, 126.9734],
  '동작 보라매역': [37.4988, 126.9212],
  '세곡2지구': [37.4674, 127.1032],
  '마곡엠밸리': [37.5683, 126.8184],
  '중계센트럴파크': [37.6475, 127.0722],
  '왕십리 모노퍼스': [37.5615, 127.0345],
  '래미안그레이튼': [37.4939, 127.0505],
  '래미안도곡카운티': [37.4937, 127.0527],
  '래미안신사': [37.5244, 127.0225],
  '강동헤리티지자이': [37.5385, 127.1422],
  '고덕아이파크': [37.5583, 127.1555],
  '강서센트레빌': [37.5501, 126.8322],
  '마곡푸르지오': [37.5714, 126.8242],
  '래미안프리미어팰리스': [37.5372, 127.0851],
  '롯데캐슬 이스트폴': [37.5358, 127.0872],
  '개봉푸르지오': [37.4918, 126.8529],
  '고척마젤란': [37.5025, 126.8615],
  '구로경남아너스빌': [37.4975, 126.8924],
  '신영지웰에스테이트': [37.4952, 126.8587],
  '온수힐스테이트': [37.4918, 126.8288],
  '금천롯데캐슬': [37.4589, 126.8973],
  '청량리 메트로블': [37.5796, 127.0378],
  '남성두산위브': [37.4851, 126.9723],
  '상도효성해링턴': [37.5029, 126.9472],
  '공덕SK리더스': [37.5441, 126.9507],
  '두산위브트레지움': [37.4842, 126.9744],
  '래미안서초에스티지': [37.4927, 127.0264],
  '반포자이': [37.5042, 127.0186],
  '서초교대': [37.4947, 127.0177],
  '서울숲아이파크': [37.5649, 127.0392],
  '잠실르엘': [37.5183, 127.1009],
  '동원데자뷰': [37.5303, 126.8647],
  '목동센트럴': [37.5265, 126.8742],
  '문래동모아미래도': [37.5173, 126.8922],
  '신길 AK': [37.5044, 126.9067],
  'e편한세상화랑대': [37.6192, 127.0864],
  '서초포레스타': [37.4542, 127.0655],
  '성지빌라': [37.5312, 127.1325],
  '신림로': [37.4722, 126.9325],
  '자양에스하임': [37.5332, 127.0782],
  '더 엘': [37.5415, 127.0855],
  '연남하이츠': [37.5642, 126.9234],
  '정목빌': [37.6082, 127.0452],
  '씨티하우스오금': [37.5021, 127.1352],
  '백제고분로': [37.5085, 127.1142],
  '남양파크빌': [37.4922, 126.9012]
};

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
  '서대문구': [37.5791, 126.9368]
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
        const name = c.name;

        // A. 인메모리 캐시 우선 확인
        if (GEOCODE_CACHE[addr]) {
          const [lat, lng] = GEOCODE_CACHE[addr];
          return { ...c, lat, lng };
        }

        // B. 키워드 캐시 확인
        for (const key of Object.keys(KEYWORD_COORDINATES)) {
          if (name.includes(key) || addr.includes(key)) {
            const [lat, lng] = KEYWORD_COORDINATES[key];
            GEOCODE_CACHE[addr] = [lat, lng];
            return { ...c, lat, lng };
          }
        }

        // C. 네이버 지오코딩 API 시도
        if (window.naver?.maps?.Service?.geocode) {
          try {
            const coords = await new Promise<[number, number] | null>((resolve) => {
              window.naver.maps.Service.geocode({ query: addr }, (status: any, response: any) => {
                if (status === window.naver.maps.Service.Status.OK && response.v2.addresses.length > 0) {
                  const item = response.v2.addresses[0];
                  resolve([parseFloat(item.y), parseFloat(item.x)]);
                } else {
                  resolve(null);
                }
              });
            });
            if (coords) {
              GEOCODE_CACHE[addr] = coords;
              return { ...c, lat: coords[0], lng: coords[1] };
            }
          } catch (e) {
            // 실패 시 폴백 진행
          }
        }

        // D. 자치구 중심점 기반 분산 폴백
        for (const region of Object.keys(REGION_COORDINATES)) {
          if (addr.includes(region)) {
            const base = REGION_COORDINATES[region];
            const offsetLat = ((i % 7) - 3) * 0.0015;
            const offsetLng = ((Math.floor(i / 7) % 7) - 3) * 0.0015;
            const lat = base[0] + offsetLat;
            const lng = base[1] + offsetLng;
            GEOCODE_CACHE[addr] = [lat, lng];
            return { ...c, lat, lng };
          }
        }

        // E. 서울 시청 중심점 기반 최종 분산 폴백
        const lat = 37.5665 + ((i % 11) - 5) * 0.003;
        const lng = 126.9780 + ((Math.floor(i / 11) % 11) - 5) * 0.003;
        GEOCODE_CACHE[addr] = [lat, lng];
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
