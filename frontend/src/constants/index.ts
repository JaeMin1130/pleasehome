// [1] 플로팅 레이아웃 마진 및 패널 간의 갭 (px 단위) - 현재는 꽉 찬 화면 레이아웃이므로 0으로 설정
export const LAYOUT_MARGIN = 0;
export const LAYOUT_GAP = 0;
export const PANEL_GAP = 0;

// [2] 수직 네비게이션 탭 바 규격
export const NAVIGATION_BAR_WIDTH = 60;

// [3] 리사이저 드래그 너비 및 높이 제한 범위
export const SIDEBAR_MIN_WIDTH = 280;
export const SIDEBAR_MAX_WIDTH = 700;
export const SIDEBAR_DEFAULT_WIDTH = 500;
export const PANEL_MIN_WIDTH = 450;
export const PANEL_MAX_WIDTH = 900;
export const PANEL_DEFAULT_WIDTH = 550;
export const HEADER_ACCORDION_MIN_HEIGHT = 150;
export const HEADER_ACCORDION_MAX_HEIGHT = 600;
export const HEADER_ACCORDION_DEFAULT_HEIGHT = 300;

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

// ============================================================================
// [6] UI 디자인 토큰 (Design Tokens)
// 컴포넌트 내부에 인라인으로 들어가거나 SVG 속성으로 쓰이는 수치들을 전역 관리합니다.
// ============================================================================

/**
 * 아이콘 규격 (Pixel 단위)
 * SVG 아이콘의 width, height 속성에 주로 사용됩니다.
 */
export const UI_SIZES = {
  ICON_XS: 12, // 보조 메뉴, 작은 뱃지 등에 들어가는 최소형 아이콘
  ICON_SM: 16, // 일반 텍스트 옆에 붙는 소형 아이콘
  ICON_MD: 20, // 네비게이션 바 등의 기본 사이즈 아이콘
  ICON_LG: 24, // 헤더 영역이나 강조가 필요한 대형 아이콘
  ICON_XL: 28, // 프로필 아바타 등 특대형 아이콘
};

/**
 * 아이콘 선 굵기 (Stroke Width)
 * SVG 아이콘의 strokeWidth 속성에 적용되어 선명도와 무게감을 결정합니다.
 */
export const UI_STROKE_WIDTHS = {
  THIN: 1.5,   // 얇고 섬세한 선 (디테일한 아이콘용)
  NORMAL: 1.8, // 기본 선 굵기
  MEDIUM: 2.0, // 약간 두꺼운 선 (가독성이 중요할 때)
  THICK: 2.2,  // 굵은 선 (네비게이션 탭 등에서 뚜렷하게 보일 때)
  BOLD: 2.5,   // 매우 굵은 선 (더보기 버튼 등 확실한 포인트가 필요할 때)
};

/**
 * 컴포넌트 내 여백 (Spacing)
 * 컴포넌트 간 간격(gap), 패딩(padding), 마진(margin) 등에 일관성 있게 사용됩니다.
 */
export const UI_SPACING = {
  XS: 4,  // 요소 간 최소 간격 (아이콘과 텍스트 사이 등)
  SM: 8,  // 작은 여백 (내부 패딩 등)
  MD: 12, // 기본 여백 (그룹 간 간격 등)
  LG: 16, // 넓은 여백 (섹션 간 간격, 기본 컨테이너 패딩 등)
  XL: 24, // 매우 넓은 여백 (대형 레이아웃 분리용)
};
