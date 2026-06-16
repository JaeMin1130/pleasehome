"use client";

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

// 전역 naver 객체 타입 정의
declare global {
  interface Window {
    naver: any;
  }
}





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

  // 마운트 시점에 이미 naver 객체가 전역에 로드되어 있다면 즉시 지도 초기화 실행
  // (Next.js 라우팅 전환으로 Script의 onLoad가 트리거되지 않는 예외 상황 처리)
  useEffect(() => {
    if (window.naver && window.naver.maps) {
      initMap();
    }
  }, []);

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
                  console.error(`[Map Geocoding Failed Callback] Address: "${cleanAddr}", Status: ${status}`, response);
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

        // C. 지오코딩 실패 시 에러 로그를 콘솔에 기록하고 null 좌표 반환
        console.error(`[Map Geocoding Failed] Address: "${addr}" (Cleaned: "${cleanAddr}")`);
        return { ...c, lat: null as any, lng: null as any };
      });

      // 모든 주택 단지에 대해 병렬 지오코딩 처리 수행
      const results = await Promise.all(promises);

      // 비동기 완료 후 맵이 여전히 마운트되어 있고 유효한지 검사
      if (!isMounted || !window.naver || !window.naver.maps || !window.naver.maps.Marker) {
        return;
      }

      const validCoords: MappedComplex[] = [];
      const newMarkers: any[] = [];
      results.forEach((mapped) => {
        if (mapped.lat === null || mapped.lng === null || isNaN(mapped.lat) || isNaN(mapped.lng)) {
          return; // 지오코딩 실패한 단지는 마커를 렌더링하지 않음
        }
        validCoords.push(mapped as MappedComplex);

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

        // 지도의 시점을 유효한 단지가 보이도록 맞춤 (2번 이슈 대응)
        if (validCoords.length > 0) {
          const bounds = new window.naver.maps.LatLngBounds();
          validCoords.forEach((coord) => {
            bounds.extend(new window.naver.maps.LatLng(coord.lat, coord.lng));
          });

          // 현재 지도의 영역(Bounds) 가져오기
          const currentBounds = naverMap.getBounds();
          let allInView = true;

          if (currentBounds) {
            validCoords.forEach((coord) => {
              const latLng = new window.naver.maps.LatLng(coord.lat, coord.lng);
              if (!currentBounds.hasLatLng(latLng)) {
                allInView = false;
              }
            });
          } else {
            allInView = false;
          }

          if (validCoords.length === 1) {
            // 단지가 1개인 경우: 항상 줌 레벨 변경 없이 중심 좌표만 이동
            naverMap.setCenter(bounds.getCenter());
          } else if (allInView) {
            // 단지가 여러 개이고 이미 모두 화면 내에 들어와 있는 경우: 줌 레벨 변경 없이 중심만 이동
            naverMap.setCenter(bounds.getCenter());
          } else {
            // 단지가 여러 개이고 화면을 벗어난 단지가 있는 경우: 줌 레벨을 11으로 조정하고 중심 이동
            naverMap.setZoom(11);
            naverMap.setCenter(bounds.getCenter());
          }
        }
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
