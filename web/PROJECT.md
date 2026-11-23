# web PROJECT.md

<!-- Note sync: 2026-11-23 -->

이 파일은 **PleaseHome 프론트엔드 대시보드 웹 애플리케이션(`web`)의 단일 진실 공급원(SSOT)**입니다.

---

## 1. 프로젝트 개요 (Project Overview)

`web`은 공공기관(LH, SH, GH) 임대주택 공고를 지도 기반으로 직관적으로 시각화하는 **Next.js 16 (App Router) + React 19 기반의 웹 대시보드**입니다.

### 주요 시스템 구성 및 아키텍처
1. **백엔드 REST API 통신 (`src/lib/api.ts`)**:
   * Next.js 내부 API 라우트 대신 독립 Kotlin + Spring Boot 코어 서버의 REST API(`/api/*`)를 호출하며, Nginx 리버스 프록시 및 SSR fetch를 통해 데이터를 공급받습니다.
2. **지도 기반 대시보드 (Naver Maps Integration)**:
   * **지리적 시각화:** `complexes` 테이블에 사전 지오코딩된 위도(`latitude`)/경도(`longitude`) 좌표를 활용해 지도 위에 마커를 고속 렌더링합니다.
   * **다차원 동적 필터링:** 청약 유형, 주택형, 보증금/월세 범위, 시행 기관별 실시간 인터랙티브 필터를 제공합니다.
3. **3단 네비게이션 및 슬라이딩 상세 패널**:
   * 단지 탭(`COMPLEX`)을 제거하고 **공고 / 저장(북마크) / 더보기(테마·설정)**의 3단 네비게이션으로 압축하여 직관성을 극대화했습니다.
   * 공고 상세 본문(`details`, 약 190만 자)은 초기 로딩 시 제외하고 카드 확장 시 온디맨드로 지연 로딩(Lazy fetch)하여 초기 HTML 페이로드를 대폭 경량화(8MB → 3.9MB, gzip 420KB)했습니다.
4. **모바일 퍼스트 반응형 UX**:
   * 모바일 뷰 전용 실시간 터치 제스처 바텀시트(`useBottomSheetGesture.ts`, 25dvh / 50dvh / 85dvh), 수평 스크롤 칩 필터 및 Safe Area 대응을 완비했습니다.
5. **전역 디자인 토큰 및 다크모드**:
   * 슬레이트-틸(Slate-Teal) 톤의 전역 다크모드 및 라이트모드 토글 스위치(☀️/🌙)를 제공하며, 모든 수치와 컬러는 `globals.css` 디자인 토큰에 100% 종속됩니다.

---

## 2. 개발 환경 및 디렉토리 구조

* **런타임 및 프레임워크:** Node.js v20.x+ (npm 10+), Next.js 16.2.9, React 19.2.4, TypeScript 5.x
* **스타일링:** Tailwind CSS, Vanilla CSS Modules (`*.module.css`), 전역 디자인 토큰 (`globals.css`)

```text
web/
├── public/                         # 정적 자산 (SVG 아이콘, 파비콘 등)
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── announcements/details/[id]/ # 공고 요약 상세 SSR 라우트 (SEO & 애드센스)
│   │   ├── complexes/[complexId]/  # 단지 상세 SSR 라우트
│   │   ├── globals.css             # 전역 디자인 토큰 & 다크 테마 변수
│   │   ├── layout.tsx              # SEO 메타태그 및 폰트 공통 레이아웃
│   │   ├── not-found.tsx           # 커스텀 404 안내 페이지
│   │   └── page.tsx                # 웹 홈 화면 (하이브리드 SSR + 정적 SEO 텍스트)
│   ├── components/                 # React UI 컴포넌트
│   │   ├── HomeClientLayout.tsx    # 지도, 사이드바, 필터, 북마크 모달 오케스트레이션
│   │   ├── Map.tsx                 # Naver Maps 연동 지도 컴포넌트
│   │   ├── Sidebar.tsx             # 메인 사이드바 컨테이너
│   │   ├── sidebar/                # 서브 탭 모듈 (SearchTab, BookmarkTab, MoreTab)
│   │   ├── features/               # 도메인 컴포넌트 (AnnouncementCard, ComplexCard, CountdownTimer)
│   │   └── ui/                     # 공통 컴포넌트 (Badge, Modal, Toast)
│   ├── hooks/                      # 커스텀 훅 (useBottomSheetGesture, useTheme)
│   ├── lib/
│   │   └── api.ts                  # Spring Boot REST API 통신 및 SSR 데이터 페치 클라이언트
│   └── constants/
│       └── index.ts                # 전역 상수 (지도 초기 좌표, 줌 레벨 등)
├── package.json
└── next.config.ts                  # Next.js 컴파일 및 301 리다이렉트 맵 연동
```

---

## 3. 데이터 모델 및 API 연동 (요약)

> [!NOTE]
> 상세한 SQLite 물리 스키마는 [db-pipeline/PROJECT.md](file:///home/iru/app/pleasehome/db-pipeline/PROJECT.md)를 참조하고, 23개 백엔드 REST API 명세는 [backend/PROJECT.md](file:///home/iru/app/pleasehome/backend/PROJECT.md) 및 [docs/dev/ARCHITECTURE.md](file:///home/iru/app/pleasehome/docs/dev/ARCHITECTURE.md)를 참조하세요.

프론트엔드는 `src/lib/api.ts`를 통해 다음 주요 엔드포인트와 통신합니다:
* **공고 목록**: `GET /api/announcements` (본문 제외 경량 목록)
* **공고 본문 (온디맨드)**: `GET /api/announcements/{id}` (카드 확장 시 해당 공고 본문 온디맨드 fetch, `/api/announcements/{id}/details`는 SSR 종합 상세 번들)
* **단지 및 평형**: `GET /api/complexes`, `GET /api/housing-units`
* **회원/인증**: `/api/auth/*` (로그인, 회원가입, 세션 확인)
* **인터랙션**: `/api/member/favorites`, `/api/member/hidden-anns`, `/api/member/bookmark-*`

---

## 4. UI 구현 규약 및 디자인 토큰

1. **디자인 토큰 시스템 100% 종속화**:
   * 색상, 간격(Spacing), 폰트 크기, z-index, radius 등 모든 스타일링은 `src/app/globals.css`의 CSS 변수(`var(--spacing-md)`, `var(--color-bg-primary)` 등)를 사용합니다.
   * 하드코딩된 픽셀(px)이나 원시 색상 코드(Hex)의 인라인 삽입을 엄격히 금지합니다.
2. **CSS 모듈 캡슐화**:
   * 컴포넌트마다 독립적인 `*.module.css`를 사용하여 스타일 충돌을 원천 방지합니다.
3. **컴포넌트 단위 변경 (YAGNI 준수)**:
   * 리팩토링 시 대형 파일 전체를 임의로 갈아엎지 않고, 단위 컴포넌트(`AnnouncementCard`, `CountdownTimer` 등)별로 격리하여 안전하게 수정합니다.

---

## 5. 실행 및 빌드 명령어

```bash
# 로컬 개발 서버 기동 (포트 3000)
./command.sh web:run
# 또는 직접 실행: cd web && npm run dev

# 프로덕션 빌드 검증
./command.sh web:build
# 또는 직접 실행: cd web && npm run build
```

### 대시보드 UI 및 필터링 구현 규약 (Dashboard UI & Filtering Conventions)

1. **스크립트 및 컴포넌트 모듈화 표준**: 모든 컴포넌트는 전용 CSS 모듈(`*.module.css`) 방식으로 분리하여 캡슐화합니다.
2. **데이터 타입 런타임 호환성 보장**: 백엔드 REST API 또는 DB에서 넘어오는 정수형 플래그(`0` 또는 `1`)와 TypeScript boolean 타입(`true`/`false`) 비교 시 엄격 비교 오작동을 방지하기 위해 불리언 변환(예: `Boolean(val)` 또는 `!!val`)을 명시적으로 거칩니다.
3. **디자인 철학 및 레이아웃**: 레이아웃은 [네비게이션 바 | 사이드바 | 지도] 3분형 구조로 화면을 채우며, 슬레이트-틸(Slate-Teal) 기반 다크모드와 라이트모드를 지원합니다.
4. **React 인라인 스타일에서 CSS 변수 참조 금지:** React 컴포넌트의 인라인 `style` 속성으로 CSS Custom Property에 `'var(--token-name)'` 문자열을 대입하면 브라우저가 무효화하므로, 동적 수치 전달 시 `${JS_CONSTANT}px` 형태로 주입하고 `calc()` 수식은 CSS 모듈 내부에서 처리합니다.

