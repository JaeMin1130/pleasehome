// [1] 플로팅 레이아웃 마진 및 패널 간의 갭 (px 단위) - 현재는 꽉 찬 화면 레이아웃이므로 0으로 설정
export const LAYOUT_MARGIN = 0;
export const LAYOUT_GAP = 0;
export const PANEL_GAP = 0;

// [2] 수직 네비게이션 탭 바 규격
export const NAVIGATION_BAR_WIDTH = 60;

// [3] 리사이저 드래그 너비 및 높이 제한 범위
export const SIDEBAR_MIN_WIDTH = 280;
export const SIDEBAR_MAX_WIDTH = 700;
export const PANEL_MIN_WIDTH = 300;
export const PANEL_MAX_WIDTH = 800;
export const HEADER_ACCORDION_MIN_HEIGHT = 150;
export const HEADER_ACCORDION_MAX_HEIGHT = 600;
export const HEADER_ACCORDION_DEFAULT_HEIGHT = 280;

// [4] 네이버 지도 초기 세팅값
export const MAP_DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 }; // 서울 기준
export const MAP_DEFAULT_ZOOM = 11;
export const MAP_MIN_ZOOM = 6;
export const MAP_MAX_ZOOM = 19;
export const MAP_MARKER_SIZE = { width: 24, height: 24 };
export const MAP_MARKER_ANCHOR = { x: 12, y: 12 };

// [5] 상세 맞춤 필터 범위 임계값 및 슬라이더 스텝
export const FILTER_DEFAULT_LIMITS = {
  minArea: 10,
  maxArea: 100,
  minDeposit: 0,
  maxDeposit: 200000000,    // 최대 2억
  minMonthlyRent: 0,
  maxMonthlyRent: 1500000,   // 최대 150만
};
export const FILTER_SLIDER_STEPS = {
  deposit: 1000000,          // 보증금 100만 원 단위 조절
  monthlyRent: 10000,        // 월세 1만 원 단위 조절
};
