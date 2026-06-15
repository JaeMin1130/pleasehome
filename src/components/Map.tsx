"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// 지도 제어용 컨트롤러 컴포넌트
function MapController({ activeCoord }: { activeCoord: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (activeCoord) {
      map.setView(activeCoord, 15, { animate: true, duration: 1 });
    }
  }, [activeCoord, map]);
  return null;
}

export default function Map({ complexes, activeComplexId, onSelectComplex }: MapProps) {
  const [mappedComplexes, setMappedComplexes] = useState<MappedComplex[]>([]);
  const [activeCoord, setActiveCoord] = useState<[number, number] | null>(null);

  // 단지 주소 지오코딩 및 상태 관리
  useEffect(() => {
    let isMounted = true;

    const geocodeAll = async () => {
      const results: MappedComplex[] = [];
      
      for (let i = 0; i < complexes.length; i++) {
        const c = complexes[i];
        const addr = c.address;
        const name = c.name;
        
        let lat = 37.5665;
        let lng = 126.9780;
        
        // 1. 키워드 캐시 확인
        let found = false;
        for (const key of Object.keys(KEYWORD_COORDINATES)) {
          if (name.includes(key) || addr.includes(key)) {
            [lat, lng] = KEYWORD_COORDINATES[key];
            found = true;
            break;
          }
        }
        
        // 2. 매칭되지 않았으면 지오코딩 시도
        if (!found) {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addr)}`);
            const data = await res.json();
            if (data && data.length > 0) {
              lat = parseFloat(data[0].lat);
              lng = parseFloat(data[0].lon);
              found = true;
            }
          } catch (e) {
            // 무시하고 다음 단계 진행
          }
        }
        
        // 3. 자치구 매핑 확인
        if (!found) {
          for (const region of Object.keys(REGION_COORDINATES)) {
            if (addr.includes(region)) {
              const base = REGION_COORDINATES[region];
              // 마커가 겹치지 않게 인덱스 기반 분산
              const offsetLat = ((i % 7) - 3) * 0.0015;
              const offsetLng = ((Math.floor(i / 7) % 7) - 3) * 0.0015;
              lat = base[0] + offsetLat;
              lng = base[1] + offsetLng;
              found = true;
              break;
            }
          }
        }
        
        // 4. 최종 폴백 (서울 내 임의 분산)
        if (!found) {
          lat = 37.5665 + ((i % 11) - 5) * 0.003;
          lng = 126.9780 + ((Math.floor(i / 11) % 11) - 5) * 0.003;
        }

        results.push({
          ...c,
          lat,
          lng
        });
      }

      if (isMounted) {
        setMappedComplexes(results);
      }
    };

    geocodeAll();

    return () => {
      isMounted = false;
    };
  }, [complexes]);

  // 활성화된 단지의 위경도 좌표 설정
  useEffect(() => {
    if (activeComplexId) {
      const active = mappedComplexes.find(c => c.id === activeComplexId);
      if (active) {
        setActiveCoord([active.lat, active.lng]);
      }
    }
  }, [activeComplexId, mappedComplexes]);

  // 커스텀 DIV 아이콘 생성 헬퍼
  const createCustomIcon = (isActive: boolean) => {
    return L.divIcon({
      className: `custom-marker ${isActive ? 'active' : ''}`,
      html: `<div class="marker-pin"></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    });
  };

  return (
    <div className="map-wrapper">
      <MapContainer 
        center={[37.5665, 126.9780]} 
        zoom={11} 
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {mappedComplexes.map((c) => {
          const isActive = c.id === activeComplexId;
          return (
            <Marker 
              key={c.id} 
              position={[c.lat, c.lng]} 
              icon={createCustomIcon(isActive)}
            >
              <Popup>
                <div className="popup-title">{c.name}</div>
                <div className="popup-address">{c.address}</div>
                <button 
                  className="popup-btn" 
                  onClick={() => onSelectComplex(c)}
                >
                  상세 정보 및 가격 보기
                </button>
              </Popup>
            </Marker>
          );
        })}

        <MapController activeCoord={activeCoord} />
      </MapContainer>
    </div>
  );
}
