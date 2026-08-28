# PROJECT.md

<!-- Note sync: 2026-07-09 -->

이 파일은 이 프로젝트의 **물리적 상태, 개발 환경 사양, 폴더 구조 및 실행 명령어**를 관리하는 문서입니다.

---

## 1. 프로젝트 개요 (Project Overview)

본 프로젝트는 공공기관(LH, SH 등)에서 발행하는 복잡한 서식과 표가 포함된 **임대주택 입주자 모집 공고 PDF 문서**를 자동으로 분석 및 정제하여 관계형 데이터베이스(SQLite)에 적재하고, 이를 지도 기반의 **Next.js 풀스택 대시보드 웹 애플리케이션**을 통해 사용자에게 체계적이고 직관적인 정보로 시각화해 주는 통합 시스템입니다.

### 주요 시스템 구성 및 흐름 (System Architecture & Pipeline)
1. **외부 빌드 데이터 적재 (External SQLite Database)**
   * LH, SH 등 공공기관의 공고문 데이터를 관계형 스키마 구조로 추출/정제한 완성형 SQLite 데이터베이스(`public_housing.db`) 파일을 로컬 또는 실서버로 직접 배포하여 구동합니다.
2. **지도 기반 대시보드 웹 서비스 (Next.js & Naver Maps Integration)**
   * **지리적 시각화:** Naver Maps API를 연동하여 `complexes` 테이블에 기저장된 위도(`latitude`)/경도(`longitude`) 좌표를 기반으로 마커를 지도 위에 쾌적하게 즉시 매핑하고 렌더링합니다. (클라이언트 단의 지오코딩 연산 및 캐싱 레이턴시 완전 제거)
   * **다차원 동적 필터링:** 청약 유형, 주택형(평형), 임대 조건(보증금/월세 범위), 시행 기관 등에 따른 대화형 필터를 실시간 제공합니다.
   * **슬라이딩 상세 패널:** 사이드바 공고 카드 및 아코디언 메뉴를 통해 모집 정보와 일정을 빠르게 파악하고, 단지 클릭 시 평형별 상세 조건이 우측에서 슬라이딩 아웃되는 상세 패널을 제공합니다.
3. **철저한 바닐라 CSS 디자인 토큰 시스템**
   * 모든 프론트엔드 UI는 픽셀(px), 색상(Hex, 원시 키워드), 뷰포트 비율(vh, vw, %), 레이아웃 구조 수치(flex, z-index 등)의 하드코딩을 원천 차단하고 `globals.css` 전역 디자인 토큰에 100% 종속되도록 설계하여 시각적 일관성과 미세 튜닝 유연성을 극대화하였습니다.

---

## 2. 개발 환경 및 도구 (Development Environment & Tools)

* **Node.js 버전:** v24.16.0 이상 (npm 11.13.0) - Next.js 풀스택 웹 서버 구동을 위해 필수적입니다.
* **설치된 주요 라이브러리:**
  * **Node.js:** `next`, `react`, `react-dom`, `better-sqlite3`, `@types/better-sqlite3`, `tailwindcss`, `@tailwindcss/postcss`


---

## 3. 폴더 구조 (Directory Structure)

```text
web/
├── .agents/
│   ├── skills/
│   │   └── note/
│   │       └── SKILL.md            # 규칙 및 동기화 관리 스킬
│   └── commit_convention.md        # Conventional Commits 규칙 정의 가이드
├── docs/
│   ├── db/
│   │   └── query.sql               # 쿼리 참고용 SQL 파일
│   └── dev/
│       ├── DEPLOYMENT.md           # NCP Micro 서버 전용 상세 배포 및 트러블슈팅 가이드
│       ├── TROUBLESHOOTING.md      # 개발/배포 과정에서 발생한 에러 해결 이력 누적 문서
│       └── CHANGELOG.md            # 변경 상세 릴리즈 노트
├── mock/
│   ├── 01_mock_page.html           # 기본 와이어프레임 목업
│   └── 02_mock_page.html           # 지도 및 아코디언 연동 동적 프리미엄 목업
├── public/                         # Next.js 정적 자산 (SVG 아이콘 등)
├── src/
│   ├── app/                        # Next.js App Router 영역
│   │   ├── announcements/          # 청약 공고 개별 상세조회 라우트 (SEO 및 애드센스 대응)
│   │   │   └── details/
│   │   │       └── [id]/
│   │   │           ├── page.tsx        # 공고 요약 전문 SSR 렌더링 컴포넌트 (MarkdownViewer 탑재)
│   │   │           ├── layout.tsx      # 글로벌 overflow hidden 방지용 스크롤바 바인딩 레이아웃
│   │   │           ├── detail-layout.css # 독립 뷰포트 고정형 세로 스크롤 컨테이너
│   │   │           ├── detail.module.css # 상세 카드 및 지원 조건 표 전용 테마 스타일
│   │   │           └── not-found.tsx   # 만료/무효 공고 ID 유입 시 404 커스텀 복귀 안내
│   │   ├── api/                    # 백엔드 데이터베이스 조회 중개 API
│   │   │   ├── announcements/
│   │   │   │   └── route.ts        # GET /api/announcements (공고 및 상세 정보 통합 API)
│   │   │   ├── complexes/
│   │   │   │   └── route.ts        # GET /api/complexes (단지 정보 API)
│   │   │   └── housing-units/
│   │   │       └── route.ts        # GET /api/housing-units (단지 평형별 상세 조건 API)
│   │   ├── globals.css             # Slate-Teal 다크 테마 바닐라 CSS
│   │   ├── layout.tsx              # 구글 서치 콘솔 소유권 인증 메타태그 및 폰트 공통 레이아웃
│   │   └── page.tsx                # 웹 홈 화면 대시보드 (딥링크 shallow query 동기화 탑재)
│   ├── components/                 # 프론트엔드 UI 컴포넌트
│   │   ├── features/               # 도메인 비즈니스 로직 결합 컴포넌트 (AnnouncementCard, UnitCard 등)
│   │   ├── ui/                     # 공통 재사용 컴포넌트 (Badge, MarkdownViewer 등)
│   │   ├── Map.tsx                 # 네이버 지도 컴포넌트 (ncpKeyId 인증 방식 및 지오코딩 폴백 탑재)
│   │   ├── Sidebar.tsx             # 검색/필터 및 상세 아코디언 컴포넌트
│   │   └── DetailPanel.tsx         # 평형별 공급 조건 슬라이딩 상세 패널
│   ├── constants/
│   │   └── index.ts                # 중앙 설정 상수 파일 (리사이저 제한, 지도 초기 설정 등)
│   ├── hooks/                      # 공통 커스텀 훅 영역
│   │   └── useBottomSheetGesture.ts # 모바일 바텀 시트 터치 제스처 및 스크롤 충돌 방지 훅
│   └── lib/
│       └── db.ts                   # SQLite 데이터베이스 커넥터 모듈
├── public_housing.db               # 외부 CLI에서 적재 완료되어 복사된 SQLite 데이터베이스
├── .env.local                      # 환경 변수 및 시크릿 키 설정 파일 (Git 제외 대상)
├── node_modules/                   # Node.js 패키지 (자동 관리, Git 제외 대상)
├── package.json                    # Node.js 패키지 및 스크립트 정의 파일
├── package-lock.json               # Node.js 의존성 잠금 파일
├── tsconfig.json                   # TypeScript 환경 설정 파일
├── next.config.ts                  # Next.js 컴파일/빌드 설정 파일
├── eslint.config.mjs               # ESLint 정적 분석 설정 파일
└── postcss.config.mjs              # PostCSS 스타일 처리 설정 파일
```

---

## 5. 데이터베이스 스키마 및 컬럼 명세 (Database Schema & Column Descriptions)

`public_housing.db` SQLite 파일은 7개의 핵심 테이블로 구성되어 있으며, 공고문에서 파싱 및 가공된 입주 조건 정보를 아래 구조로 저장합니다.

### 5.1. `announcements` (공고 기본 정보)
* **설명:** 수집 및 변환된 공공청약 공고의 기본 메타데이터를 저장합니다.

| 컬럼명 | 데이터 타입 | Nullable | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | N (PK, Auto) | 공고 일련번호 (기본키) |
| `title` | VARCHAR(255) | N | 공고 제목 (예: `2026년 1차 행복주택 입주자 모집공고`) |
| `institution` | VARCHAR(50) | N | 시행 기관 (예: `LH`, `SH`, `HUG` 등) |
| `subscription_type` | VARCHAR(50) | N | 청약 유형 (예: `행복주택`, `장기전세`, `장기전세2`, `국민임대`, `영구임대` 등) |
| `doc_path` | VARCHAR(255) | N | 변환된 마크다운 문서 및 리소스 디렉토리 경로 |
| `attributes` | TEXT | Y | 비정형 추가 공고 공통 속성 정보 |
| `dtl_url` | VARCHAR(500) | Y | 공식 모집공고 원문 PC 버전 URL |
| `dtl_url_mob` | VARCHAR(500) | Y | 공식 모집공고 원문 모바일 버전 URL |
| `region` | VARCHAR(100) | Y | 관할 행정구역 (예: `서울특별시`, `경기도 성남시`) |
| `created_at` | TIMESTAMP | Y (Default) | 레코드 최초 생성 일시 |
| `updated_at` | TIMESTAMP | Y (Default) | 레코드 최종 수정 일시 |

---

### 5.2. `announcement_schedules` (공고 청약 일정)
* **설명:** 공고별로 다른 접수일, 서류발표일, 당첨발표일, 계약기간 등의 일정을 관리합니다.

| 컬럼명 | 데이터 타입 | Nullable | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | N (PK, Auto) | 일정 일련번호 (기본키) |
| `announcement_id` | INTEGER | N (FK) | 소속 공고 ID (`announcements.id` 참조, Cascade) |
| `schedule_type` | VARCHAR(50) | N | 일정 유형 (예: `청약신청접수`, `서류발표`, `당첨자발표`, `계약체결`) |
| `start_date` | DATETIME | Y | 일정 시작 일시 |
| `end_date` | DATETIME | Y | 일정 종료 일시 |
| `raw_text` | VARCHAR(255) | Y | 가공 전 원본 텍스트 형태의 일정 표기 |
| `notes` | TEXT | Y | 일정 관련 추가 안내 및 예외사항 설명 |

---

### 5.3. `announcement_details` (공고 세부 안내 요약)
* **설명:** 신청 자격, 소득/자산 기준 등 공고문 본문에서 요약 발췌된 상세 정보를 웹 아코디언 메뉴 노출용으로 저장합니다.

| 컬럼명 | 데이터 타입 | Nullable | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | N (PK, Auto) | 상세정보 일련번호 (기본키) |
| `announcement_id` | INTEGER | N (FK) | 소속 공고 ID (`announcements.id` 참조, Cascade) |
| `section_title` | VARCHAR(100) | N | 상세정보 대분류 제목 (예: `신청자격`, `소득 및 자산 기준`) |
| `section_content` | TEXT | N | 해당 분류의 본문 마크다운 포맷 텍스트 |
| `sort_order` | INTEGER | Y (Default 0)| 화면 출력 순서 조정을 위한 정렬 가중치 |

---

### 5.4. `complexes` (모집 주택 단지 정보)
* **설명:** 해당 공고에서 공급하는 아파트, 빌라 등 주택 단지별 정보를 나타내며, 주소 데이터를 통해 지도에 매핑됩니다.

| 컬럼명 | 데이터 타입 | Nullable | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | N (PK, Auto) | 단지 일련번호 (기본키) |
| `announcement_id` | INTEGER | N (FK) | 소속 공고 ID (`announcements.id` 참조, Cascade) |
| `name` | VARCHAR(150) | N | 단지/건물명 (예: `정릉 하늘마루`, `개포라프레앙`) |
| `address` | VARCHAR(255) | N | 도로명 또는 지번 주소 (마이그레이션 대상 원본 주소) |
| `latitude` | REAL | Y | 해당 단지의 위도 좌표 (빌드 시점에 네이버 Geocoding API로 자동 마이그레이션 적재) |
| `longitude` | REAL | Y | 해당 단지의 경도 좌표 (빌드 시점에 네이버 Geocoding API로 자동 마이그레이션 적재) |
| `is_imprecise` | INTEGER | Y (Default 0) | 주소의 임시/미확정 여부 플래그 (1: 뒷단어 잘라내기 폴백 검색 매핑, 0: 정밀 매핑) |
| `heating_type` | VARCHAR(50) | Y | 난방 방식 (예: `개별난방`, `지역난방`) |
| `has_elevator` | BOOLEAN | Y | 엘리베이터 유무 (1: 설치, 0: 미설치) |
| `parking_info` | VARCHAR(100) | Y | 주차 구획수 등 주차 관련 설명 |
| `complex_type` | VARCHAR(50) | Y | 단지 유형 (예: `아파트`, `오피스텔`, `다가구주택` 등) |
| `attributes` | TEXT | Y | 비정형 추가 단지 속성 정보 |
| `created_at` | TIMESTAMP | Y (Default) | 레코드 생성 일시 |
| `updated_at` | TIMESTAMP | Y (Default) | 레코드 최종 수정 일시 |

---

### 5.5. `housing_units` (단지별/평형별 세부 공급 조건 및 가격)
* **설명:** 단지 내 개별 평형별 세부 모집 단위(exclusive_area)와 대상군별 공급 보증금 및 월세를 정의합니다.

| 컬럼명 | 데이터 타입 | Nullable | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | N (PK, Auto) | 공급유닛 일련번호 (기본키) |
| `announcement_id` | INTEGER | N (FK) | 소속 공고 ID (`announcements.id` 참조, Cascade) |
| `complex_id` | INTEGER | Y (FK) | 소속 단지 ID (`complexes.id` 참조, Cascade, 단지가 없는 경우 NULL) |
| `room_number` | VARCHAR(50) | Y | 동/호수 등 특정 호실 지정 시 기록 |
| `room_count` | INTEGER | Y | 방의 개수 |
| `room_type` | VARCHAR(100) | Y | 주택형 (예: `39형`, `59형`) |
| `supply_type` | VARCHAR(100) | Y | 공급 구분 (예: `우선공급`, `일반공급`, `특별공급`) |
| `exclusive_area` | REAL | N | 주거전용면적 (제곱미터 ㎡ 단위) |
| `contract_area` | REAL | Y | 계약면적 (제곱미터 ㎡ 단위) |
| `target_group` | VARCHAR(100) | Y | 세부 청약 대상 계층 (예: `대학생`, `청년`, `신혼부부`, `고령자`) |
| `income_group` | VARCHAR(50) | Y | 소득 순위 조건 (예: `50% 이하`, `70% 이하`, `100% 이하`) |
| `supply_count` | INTEGER | Y (Default 0)| 공급(모집) 예정 호수 |
| `reserve_count` | INTEGER | Y (Default 0)| 예비 대상자 모집 호수 |
| `deposit` | BIGINT | N | 기준 임대보증금 (원 단위) |
| `monthly_rent` | BIGINT | Y (Default 0)| 기준 월 임대료 (원 단위, 전세형일 시 0) |
| `attributes` | TEXT | Y | 기타 구조(복층 등) 및 수선 사항 특이사항 속성 (JSON 등) |
| `created_at` | TIMESTAMP | Y (Default) | 레코드 생성 일시 |
| `updated_at` | TIMESTAMP | Y (Default) | 레코드 최종 수정 일시 |

---

### 5.6. `data_load_logs` (데이터 적재 이력 로그)
* **설명:** 마크다운 파서 및 적재 스크립트 실행 시 각 공고별 적재 실행 상태와 적재된 행 수를 저장 및 추적합니다.

| 컬럼명 | 데이터 타입 | Nullable | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | N (PK, Auto) | 로그 일련번호 (기본키) |
| `announcement_id` | INTEGER | Y | 적재 시도된 공고 ID |
| `status` | VARCHAR(20) | N | 적재 상태 (`SUCCESS` 또는 `FAIL`) |
| `parsed_rows_count` | INTEGER | Y (Default 0)| 파싱 완료되어 적재된 `housing_units` 레코드 수 |
| `error_message` | TEXT | Y | 적재 실패 또는 예외 발생 시 에러 메시지 |
| `loaded_at` | TIMESTAMP | Y (Default) | 로그 기록(적재) 일시 |

---

## 4. 실행 및 개발 규약 (Commands & Conventions)

### 패키지 설치 및 환경 설정
```bash
# Node.js 패키지 설치 (의존성 복원 시)
npm install
```

### Next.js 프론트엔드/백엔드 가동 및 빌드 명령어
로컬에서 개발 서버를 기동하거나 프로덕션 상태를 검증하기 위한 명령어 모음입니다.
```bash
# [방법 1] 로컬 개발 서버 기동 (개발 모드 실행)
npm run dev

# [방법 2] 프로덕션 빌드 검증 및 빌드 본체 생성
npm run build

# [방법 3] 빌드된 프로덕션 서버 실행
npm run start
```

> [!TIP]
> NCP Micro 가상 서버 실배포 프로세스, Nginx 리버스 프록시(Rate Limit 락 적용), OOM 방지 Swap 활성화 및 `pleasehome.com` 도메인 HTTPS SSL 적용 등 정식 운영 서버 구축 단계는 **[DEPLOYMENT.md](file:///home/iru/app/pleasehome/web/docs/dev/DEPLOYMENT.md)** 가이드를 확인하여 실행해 주시기 바랍니다.

---

### Git 형상 관리 규약 (Git Version Control Conventions)

1. **커밋 메시지 규약:** Git 커밋을 생성할 때는 반드시 [.agents/commit_convention.md](file:///home/iru/app/pleasehome/web/.agents/commit_convention.md)에 명시된 Conventional Commits 규칙을 엄격히 준수합니다. (구 AGENTS.md 누적 규칙 #11 이관)
2. **Git Diverged(이력 불일치) 대응:** 로컬과 원격 저장소의 Git 히스토리가 갈라졌을 때(Diverged), 복잡한 리베이스나 강제 병합 충돌 해결을 임의로 수행하지 않습니다. 작업 디렉토리의 변경사항을 Stash에 안전하게 임시 백업한 후, 원격의 정상 완료된 빌드 버전을 기준으로 로컬을 깔끔하게 리셋(`git reset --hard`)하고, 필요한 최소한의 코드 수정 패치만을 적용한 뒤 커밋 및 푸시하여 히스토리를 한 줄로 투명하게 유지합니다. (구 AGENTS.md 누적 규칙 #20 이관)
3. **가이드 문서 예외적 추적 관리:** 개발 문서 디렉토리 전체(`docs/`)는 Git 무시 대상(`.gitignore`)으로 차단하되, 개발 가이드(`docs/dev/`)와 API 문서(`docs/api-guide/`) 등의 마크다운 문서 디렉토리는 예외 패턴(`!docs/dev/`, `!docs/api-guide/`)으로 등록하여 형상 관리가 정상 작동하도록 보장합니다.

---

### 코드 구현 및 파일 편집 규약 (Implementation & Editing Conventions)

1. **프론트엔드 컴포넌트 모듈화:** 프론트엔드 UI를 개발할 때, 선제적으로 재사용 가능한 컴포넌트(Component) 단위로 기능을 분리하여 모듈화된 아키텍처를 구축해야 합니다. (구 AGENTS.md 누적 규칙 #23 이관)
2. **전역 스타일 리팩토링 안전 점검:** 전역 설정 파일(`globals.css` 등)을 리팩토링하거나 구조를 변경할 때는, 기존 레이아웃이나 지도가 깨지지 않도록 누락된 숨겨진 의존성(예: 지도 래퍼 클래스)을 사전에 꼼꼼히 점검하고 작업에 임해야 합니다. (구 AGENTS.md 누적 규칙 #24 이관)
3. **디자인 토큰 시스템 100% 종속화 및 렌더링 매직 넘버 원천 차단:** 
   - 전역 디자인 시스템은 `src/app/globals.css`에 구축된 글로벌 시스템 토큰에 100% 종속된다. 색상(Hex, 원시 키워드 white 등), 공간(Spacing, px), 폰트(rem, em, weight), 뷰포트 비율(vh, vw, %), 그리고 레이아웃 구조 수치(flex, z-index, 중앙 정렬 50% 등)를 포함하여 **렌더링에 관여하는 모든 형태의 숫자와 단위는 컴포넌트 내부 하드코딩이 엄격히 금지**된다.
   - 예외 없는 무결성: 컴포넌트의 `*.module.css` 내부에 `border-radius: 50%`, `max-height: 80vh`, `flex: 1`, `color: white`, `letter-spacing: -0.02em`, `translate(-50%)` 같은 관습적 뼈대 공식조차도 모두 `var(--radius-full)`, `var(--layout-modal-max-height)`, `var(--layout-flex-1)`, `var(--color-white)`, `var(--position-center)` 등으로 맵핑하여 사용해야 한다. 단, 로직에 필요한 매직 넘버(예: 슬라이더 조작 step 크기, 지도 좌표 제한)는 `src/constants/index.ts`에 분리 관리한다.
4. **레이아웃 미세 튜닝 유연성 확보:** 디자인 토큰 적용 후 미세한 간격을 튜닝할 때 픽셀(px) 수치 하드코딩으로 롤백하여 토큰 시스템을 무력화하지 않습니다. 반드시 `calc(var(--spacing-md) * 0.75)`와 같이 기준 전역 토큰에 배율 연산을 적용하여, 향후 토큰 크기 변경 시에도 전체 시스템의 비율 연동성이 유지되도록 설계합니다.


---

### 대시보드 UI 및 필터링 구현 규약 (Dashboard UI & Filtering Conventions)

1. **스크립트 및 컴포넌트 모듈화 표준**: 모든 컴포넌트는 전용 CSS 모듈(`*.module.css`) 방식으로 분리하여 캡슐화합니다.
2. **데이터 타입 런타임 호환성 보장**: SQLite DB에서 넘어오는 정수형 데이터(`0` 또는 `1`)와 TypeScript의 엄격한 boolean 타입(`true`/`false`) 간 비교 시 strict 비교문(`!==`, `===`)을 쓰면 필터 오작동이 일어납니다. 이를 방지하기 위해 type assertion(`as any` 캐스팅 등)을 적용하여 런타임 형 변환을 거쳐 안전하게 비교하도록 구현합니다.
3. **디자인 철학 및 레이아웃**: 'AI가 짠 것 같은' 과도한 디자인을 배제하고 전문적인 실무형 라이트 모드(Light Mode)를 기본 채택합니다. 레이아웃은 상단 헤더를 없애고 [네비게이션 바 | 사이드바 | 지도] 삼분형 구조로 화면을 꽉 채우도록 설계하며, 사이드바 브랜드 로고 영역은 제거하고 검색창을 사이드바 최상단에 직접 배치합니다.
4. **React 인라인 스타일에서 CSS 변수 참조 금지:** React 컴포넌트의 인라인 `style` 속성으로 CSS Custom Property에 `'var(--token-name)'` 문자열을 대입하면 브라우저가 Invalid로 처리하여 해당 변수를 참조하는 `calc()` 수식 전체가 무효화됩니다. 동적 수치 전달 시 반드시 `${JS_CONSTANT}px` 형태의 리터럴로 주입하고, 실제 `calc()` 위치 계산 수식은 CSS 모듈 파일 내부에서 해당 변수를 참조하도록 이원화합니다.

