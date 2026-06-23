# PROJECT.md

<!-- Note sync: 2026-06-22 -->

이 파일은 이 프로젝트의 **물리적 상태, 개발 환경 사양, 폴더 구조 및 실행 명령어**를 관리하는 문서입니다.

---

## 1. 프로젝트 개요 (Project Overview)

본 프로젝트는 공공기관(LH, SH 등)에서 발행하는 복잡한 서식과 표가 포함된 **임대주택 입주자 모집 공고 PDF 문서**를 자동으로 분석 및 정제하여 관계형 데이터베이스(SQLite)에 적재하고, 이를 지도 기반의 **Next.js 풀스택 대시보드 웹 애플리케이션**을 통해 사용자에게 체계적이고 직관적인 정보로 시각화해 주는 통합 시스템입니다.

### 주요 시스템 구성 및 흐름 (System Architecture & Pipeline)
1. **PDF 파싱 및 표준화 파이프라인 (Data Pipeline)**
   * `opendataloader-pdf` 라이브러리와 Java 기반 PDF 분석 엔진을 활용하여 모집 공고 PDF를 마크다운(Markdown) 문서 및 구조화된 이미지 리소스로 자동 변환합니다.
2. **데이터 정밀 추출 및 DB 적재 (Information Extraction & SQLite Load)**
   * 마크다운 공고문을 슬라이싱하여 청약 자격, 소득/자산 기준, 모집 단지 정보, 공급 평형별 세부 임대 조건(보증금, 월세) 등을 구조화된 JSON 데이터로 정제합니다.
   * 정제된 데이터를 관계형 스키마 구조로 파싱하여 SQLite 데이터베이스(`public_housing.db`)에 일괄 적재하고, 데이터 정합성 감사(Audit) 및 이중 로깅을 마칩니다.
3. **지도 기반 대시보드 웹 서비스 (Next.js & Naver Maps Integration)**
   * **지리적 시각화:** Naver Maps API를 연동하여 대상 단지들의 위치를 지도 위에 표시하고, 지오코딩 및 조건별 마커 클러스터링을 지원합니다.
   * **다차원 동적 필터링:** 청약 유형, 주택형(평형), 임대 조건(보증금/월세 범위), 시행 기관 등에 따른 대화형 필터를 실시간 제공합니다.
   * **슬라이딩 상세 패널:** 사이드바 공고 카드 및 아코디언 메뉴를 통해 모집 정보와 일정을 빠르게 파악하고, 단지 클릭 시 평형별 상세 조건이 우측에서 슬라이딩 아웃되는 상세 패널을 제공합니다.
4. **철저한 바닐라 CSS 디자인 토큰 시스템**
   * 모든 프론트엔드 UI는 픽셀(px), 색상(Hex, 원시 키워드), 뷰포트 비율(vh, vw, %), 레이아웃 구조 수치(flex, z-index 등)의 하드코딩을 원천 차단하고 `globals.css` 전역 디자인 토큰에 100% 종속되도록 설계하여 시각적 일관성과 미세 튜닝 유연성을 극대화하였습니다.

---

## 2. 개발 환경 및 도구 (Development Environment & Tools)

* **Python 버전:** 3.10 이상 (현재 시스템: 3.14.4)
* **Java 버전:** JDK 11 이상 (현재 시스템: OpenJDK 17.0.19) - `opendataloader-pdf` 내부의 PDF 분석 엔진 구동을 위해 필수적입니다.
* **Node.js 버전:** v24.16.0 이상 (npm 11.13.0) - Next.js 풀스택 웹 서버 구동을 위해 필수적입니다.
* **가상 환경(Virtual Environment):** `/home/iru/project03/venv`를 사용합니다.
  * 모든 외부 패키지(`opendataloader-pdf` 포함)는 가상 환경 내에 설치되어 있습니다.
  * 실행 시 반드시 가상 환경의 파이썬 인터프리터(`./venv/bin/python`)를 사용합니다.
* **설치된 주요 라이브러리:**
  * **Python:** `opendataloader-pdf`
  * **Node.js:** `next`, `react`, `react-dom`, `better-sqlite3`, `@types/better-sqlite3`, `tailwindcss`, `@tailwindcss/postcss`


---

## 3. 폴더 구조 (Directory Structure)

```text
project03/
├── .agents/
│   ├── agents/
│   │   └── markdown_sql_parser/
│   │       └── agent.json          # 서브에이전트 역할 정의 및 프롬프트 명세
│   ├── scripts/
│   │   ├── convert_pdf_to_md.py    # PDF 표준 마크다운 변환 통합 스크립트
│   │   ├── pre_processor.py        # 0단계: 7대 기본 특성 분류 및 테이블 평탄화 전처리 스크립트
│   │   ├── critic_validator.py     # 2단계: 적재 전 실시간 데이터 및 수학적 정합성 무결성 검증기
│   │   ├── insert_loader.py        # 3단계: JSON 정제 데이터를 DB 적재 및 실패 격리(성능 저하 적재) 스크립트
│   │   └── audit_db.py             # DB 적재 후 전체 데이터 무결성 및 누락 공고 검출 경보 감사 스크립트
│   └── skills/
│       ├── convert-pdf/SKILL.md    # PDF 자동 스캔/변환 스킬
│       ├── extract-data/SKILL.md   # 마크다운 to DB 추출/적재 자동화 스킬
│       └── note/SKILL.md           # 규칙 및 동기화 관리 스킬
├── errors/                         # 에러 및 이슈 관련 참고 스크린샷 이미지 보관소
├── docs/
│   ├── pdf/                        # 원본 PDF 저장소 (규격 폴더 구조)
│   ├── md/                         # 변환된 Markdown 및 이미지 저장소
│   └── dev/
│       └── DEPLOYMENT.md           # NCP Micro 서버 전용 상세 배포 및 트러블슈팅 가이드
│       └── {공고_폴더}/
│           ├── document.md         # 변환된 마크다운 공고문
│           ├── data.json           # 서브에이전트가 추출한 정제 JSON 데이터
│           ├── load.log            # insert_loader.py 적재 로그 (이중 로깅)
│           └── images/             # 문서 내 추출 이미지
├── mock/
│   ├── 01_mock_page.html           # 기본 와이어프레임 목업
│   └── 02_mock_page.html           # 지도 및 아코디언 연동 동적 프리미엄 목업
├── public/                         # Next.js 정적 자산 (SVG 아이콘 등)
├── src/
│   ├── app/                        # Next.js App Router 영역
│   │   ├── api/                    # 백엔드 API
│   │   │   ├── announcements/
│   │   │   │   └── route.ts        # GET /api/announcements (공고 및 상세 정보 통합 API)
│   │   │   ├── complexes/
│   │   │   │   └── route.ts        # GET /api/complexes (단지 정보 API)
│   │   │   └── housing-units/
│   │   │       └── route.ts        # GET /api/housing-units (단지 평형별 상세 조건 API)
│   │   ├── globals.css             # Slate-Teal 다크 테마 바닐라 CSS
│   │   ├── layout.tsx              # SEO 정보 및 폰트 공통 설정 레이아웃
│   │   └── page.tsx                # 웹 홈 화면 대시보드
│   ├── components/                 # 프론트엔드 UI 컴포넌트
│   │   ├── features/               # 도메인 비즈니스 로직 결합 컴포넌트 (AnnouncementCard, UnitCard 등)
│   │   ├── ui/                     # 공통 재사용 컴포넌트 (Badge, MarkdownViewer 등)
│   │   ├── Map.tsx                 # 네이버 지도 컴포넌트 (ncpKeyId 인증 방식 및 지오코딩 폴백 탑재)
│   │   ├── Sidebar.tsx             # 검색/필터 및 상세 아코디언 컴포넌트
│   │   └── DetailPanel.tsx         # 평형별 공급 조건 슬라이딩 상세 패널
│   ├── constants/
│   │   └── index.ts                # 중앙 설정 상수 파일 (리사이저 제한, 지도 초기 설정 등)
│   ├── db/
│   │   ├── db_init.py              # 데이터베이스 테이블 및 인덱스 초기화 스크립트
│   │   └── query.sql               # 쿼리 참고용 SQL 파일
│   └── lib/
│       └── db.ts                   # SQLite 데이터베이스 커넥터 모듈
├── public_housing.db               # 적재 완료된 SQLite 데이터베이스 파일
├── .env.local                      # 환경 변수 및 시크릿 키 설정 파일 (Git 제외 대상)
├── node_modules/                   # Node.js 패키지 (자동 관리, Git 제외 대상)
├── package.json                    # Node.js 패키지 및 스크립트 정의 파일
├── package-lock.json               # Node.js 의존성 잠금 파일
├── tsconfig.json                   # TypeScript 환경 설정 파일
├── next.config.ts                  # Next.js 컴파일/빌드 설정 파일
├── eslint.config.mjs               # ESLint 정적 분석 설정 파일
├── postcss.config.mjs              # PostCSS 스타일 처리 설정 파일
├── README.md                       # 프로젝트 전반적 실행 및 데이터 파이프라인 가이드
└── venv/                           # 파이썬 가상 환경

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

### 5.4. `announcement_limits` (전세임대 지원 한도액)
* **설명:** 주택 단지가 없고 정책 지원 형식으로 이루어지는 '전세임대' 공고에 대응하여 대상군별 융자 조건 및 한도를 정의합니다.

| 컬럼명 | 데이터 타입 | Nullable | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | N (PK, Auto) | 조건 일련번호 (기본키) |
| `announcement_id` | INTEGER | N (FK) | 소속 공고 ID (`announcements.id` 참조, Cascade) |
| `target_group` | VARCHAR(100) | Y | 지원 대상군 (예: `청년`, `신혼부부`, `다자녀`) |
| `max_support_amount` | BIGINT | Y | 최대 융자 보증금 지원금액 (원 단위) |
| `deposit_limit` | BIGINT | Y | 임차 가능한 대상 주택의 보증금 최대 한도액 (원 단위) |
| `tenant_share` | BIGINT | Y | 입주자 본인이 기본적으로 부담해야 하는 보증금 (원 단위) |
| `interest_rate` | REAL | Y | 지원금 잔액에 대한 연간 기본 이자율 (퍼센트 단위) |
| `max_monthly_rent` | BIGINT | Y | 월세 혼합형 계약 시 최대 허용 월 임대료 (원 단위) |
| `notes` | TEXT | Y | 기타 이자율 우대 조건 및 예외사항 비고 |
| `attributes` | TEXT | Y | 비정형 추가 지원 한도 속성 정보 |

---

### 5.5. `complexes` (모집 주택 단지 정보)
* **설명:** 해당 공고에서 공급하는 아파트, 빌라 등 주택 단지별 정보를 나타내며, 주소 데이터를 통해 지도에 매핑됩니다.

| 컬럼명 | 데이터 타입 | Nullable | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | N (PK, Auto) | 단지 일련번호 (기본키) |
| `announcement_id` | INTEGER | N (FK) | 소속 공고 ID (`announcements.id` 참조, Cascade) |
| `name` | VARCHAR(150) | N | 단지/건물명 (예: `정릉 하늘마루`, `개포라프레앙`) |
| `address` | VARCHAR(255) | N | 도로명 또는 지번 주소 (클라이언트 지도 Geocoder에서 사용) |
| `heating_type` | VARCHAR(50) | Y | 난방 방식 (예: `개별난방`, `지역난방`) |
| `has_elevator` | BOOLEAN | Y | 엘리베이터 유무 (1: 설치, 0: 미설치) |
| `parking_info` | VARCHAR(100) | Y | 주차 구획수 등 주차 관련 설명 |
| `attributes` | TEXT | Y | 비정형 추가 단지 속성 정보 |
| `created_at` | TIMESTAMP | Y (Default) | 레코드 생성 일시 |
| `updated_at` | TIMESTAMP | Y (Default) | 레코드 최종 수정 일시 |

---

### 5.6. `housing_units` (단지별/평형별 세부 공급 조건 및 가격)
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

### 5.7. `data_load_logs` (데이터 적재 이력 로그)
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
# 가상 환경 생성 (필요 시)
python3 -m venv venv

# 파이썬 패키지 설치
./venv/bin/pip install opendataloader-pdf

# Node.js 패키지 설치 (의존성 복원 시)
npm install
```

### PDF -> Markdown 변환 및 표준화 스크립트 실행 방법
인자(공고명/경로)를 주어 실행하면 단일 타겟 변환이 수행되고, 인자 없이 실행하면 미분류 PDF 자동 스캔 및 변환 일괄 처리가 가동됩니다.
```bash
# [방법 1] 미분류 PDF 파일 자동 스캔 및 표준화 일괄 실행 (convert-pdf 스킬 구동 명세)
./venv/bin/python .agents/scripts/convert_pdf_to_md.py

# [방법 2] 특정 공고 폴더명을 이용한 단일 변환 (가장 권장)
./venv/bin/python .agents/scripts/convert_pdf_to_md.py 2026_1차_행복주택

# [방법 3] 절대 또는 상대 파일 경로를 직접 지정하여 단일 변환
./venv/bin/python .agents/scripts/convert_pdf_to_md.py docs/pdf/2026_1차_행복주택/origin.pdf
```

### 데이터베이스 테이블 구축 및 파싱 적재 파이프라인 명령어
데이터베이스를 구성하거나 마크다운으로부터 정제 데이터를 갱신 적재하고자 할 때 사용하는 스크립트 실행 가이드라인입니다.
```bash
# [방법 4] 데이터베이스 스키마 및 인덱스 초기화 (최초 1회 실행)
./venv/bin/python src/db/db_init.py

# [방법 5] 적재된 DB 데이터 정합성 검증 및 리포팅 감사(Audit) 실행
./venv/bin/python .agents/scripts/audit_db.py

# [방법 6] 서브에이전트가 추출한 JSON 데이터를 파일로 보관하고 데이터베이스에 관계형 적재
./venv/bin/python .agents/scripts/insert_loader.py <JSON_파일경로_또는_JSON문자열> [저장할_JSON_대상경로]
```

### Next.js 프론트엔드/백엔드 가동 및 빌드 명령어
로컬에서 개발 서버를 기동하거나 프로덕션 상태를 검증하기 위한 명령어 모음입니다.
```bash
# [방법 7] 로컬 개발 서버 기동 (개발 모드 실행)
npm run dev

# [방법 8] 프로덕션 빌드 검증 및 빌드 본체 생성
npm run build

# [방법 9] 빌드된 프로덕션 서버 실행
npm run start
```

> [!TIP]
> NCP Micro 가상 서버 실배포 프로세스, Nginx 리버스 프록시(Rate Limit 락 적용), OOM 방지 Swap 활성화 및 `pleasehome.com` 도메인 HTTPS SSL 적용 등 정식 운영 서버 구축 단계는 **[DEPLOYMENT.md](file:///home/iru/project03/docs/dev/DEPLOYMENT.md)** 가이드를 확인하여 실행해 주시기 바랍니다.

---

### Git 형상 관리 규약 (Git Version Control Conventions)

1. **커밋 메시지 규약:** Git 커밋을 생성할 때는 반드시 [.agents/commit_convention.md](file:///home/iru/project03/.agents/commit_convention.md)에 명시된 Conventional Commits 규칙을 엄격히 준수합니다. (구 AGENTS.md 누적 규칙 #11 이관)
2. **Git Diverged(이력 불일치) 대응:** 로컬과 원격 저장소의 Git 히스토리가 갈라졌을 때(Diverged), 복잡한 리베이스나 강제 병합 충돌 해결을 임의로 수행하지 않습니다. 작업 디렉토리의 변경사항을 Stash에 안전하게 임시 백업한 후, 원격의 정상 완료된 빌드 버전을 기준으로 로컬을 깔끔하게 리셋(`git reset --hard`)하고, 필요한 최소한의 코드 수정 패치만을 적용한 뒤 커밋 및 푸시하여 히스토리를 한 줄로 투명하게 유지합니다. (구 AGENTS.md 누적 규칙 #20 이관)

---

### 코드 구현 및 파일 편집 규약 (Implementation & Editing Conventions)

1. **프론트엔드 컴포넌트 모듈화:** 프론트엔드 UI를 개발할 때, 선제적으로 재사용 가능한 컴포넌트(Component) 단위로 기능을 분리하여 모듈화된 아키텍처를 구축해야 합니다. (구 AGENTS.md 누적 규칙 #23 이관)
2. **전역 스타일 리팩토링 안전 점검:** 전역 설정 파일(`globals.css` 등)을 리팩토링하거나 구조를 변경할 때는, 기존 레이아웃이나 지도가 깨지지 않도록 누락된 숨겨진 의존성(예: 지도 래퍼 클래스)을 사전에 꼼꼼히 점검하고 작업에 임해야 합니다. (구 AGENTS.md 누적 규칙 #24 이관)
3. **서브에이전트 정의 갱신:** 서브에이전트의 정의 파일(`agent.json` 등)을 물리적으로 수정한 후, 이를 시스템 메모리에 반영하려면 반드시 `define_subagent`를 호출하여 재적재(Reload)해야 합니다. 단, 동일 세션 내에서 이미 구동되었던 에이전트 이름은 덮어쓰기가 불가능하므로, 업데이트 시에는 반드시 새로운 이름(예: `_v2`)으로 부여하여 기존 메모리와의 캐시 충돌 및 할루시네이션을 원천 차단합니다. (구 AGENTS.md 누적 규칙 #25 이관)
4. **거대 JSON 파일 안전 치환:** 줄바꿈(`\n`)과 이스케이프(`\"`)가 대량으로 포함된 거대한 문자열을 가진 JSON 파일을 수정할 때는, 문법 손상 위험이 큰 텍스트 치환 도구(`replace_file_content`) 대신, 파이썬 `json` 모듈을 이용한 스크립트를 `run_command`로 가동하여 안전하게 값을 치환함으로써 JSON 파일의 무결성을 100% 보장합니다. (구 AGENTS.md 누적 규칙 #26 이관)
5. **디자인 토큰 시스템 100% 종속화 및 렌더링 매직 넘버 원천 차단:** 
   - 전역 디자인 시스템은 `src/app/globals.css`에 구축된 글로벌 시스템 토큰에 100% 종속된다. 색상(Hex, 원시 키워드 white 등), 공간(Spacing, px), 폰트(rem, em, weight), 뷰포트 비율(vh, vw, %), 그리고 레이아웃 구조 수치(flex, z-index, 중앙 정렬 50% 등)를 포함하여 **렌더링에 관여하는 모든 형태의 숫자와 단위는 컴포넌트 내부 하드코딩이 엄격히 금지**된다.
   - 예외 없는 무결성: 컴포넌트의 `*.module.css` 내부에 `border-radius: 50%`, `max-height: 80vh`, `flex: 1`, `color: white`, `letter-spacing: -0.02em`, `translate(-50%)` 같은 관습적 뼈대 공식조차도 모두 `var(--radius-full)`, `var(--layout-modal-max-height)`, `var(--layout-flex-1)`, `var(--color-white)`, `var(--position-center)` 등으로 맵핑하여 사용해야 한다. 단, 로직에 필요한 매직 넘버(예: 슬라이더 조작 step 크기, 지도 좌표 제한)는 `src/constants/index.ts`에 분리 관리한다.
6. **레이아웃 미세 튜닝 유연성 확보:** 디자인 토큰 적용 후 미세한 간격을 튜닝할 때 픽셀(px) 수치 하드코딩으로 롤백하여 토큰 시스템을 무력화하지 않습니다. 반드시 `calc(var(--spacing-md) * 0.75)`와 같이 기준 전역 토큰에 배율 연산을 적용하여, 향후 토큰 크기 변경 시에도 전체 시스템의 비율 연동성이 유지되도록 설계합니다.


---

### 대시보드 UI 및 필터링 구현 규약 (Dashboard UI & Filtering Conventions)

1. **스크립트 및 컴포넌트 모듈화 표준**: 테스트용 파이썬 스크립트는 프로젝트 루트에 방치하지 않고 도메인에 맞게(`src/db/`, `src/parser/` 등) 구조적으로 배치합니다. 또한 프론트엔드 스타일링 시 글로벌 스타일(`globals.css`)은 최소화하고, 모든 컴포넌트는 전용 CSS 모듈(`*.module.css`) 방식으로 분리하여 캡슐화합니다.


6. **데이터 타입 런타임 호환성 보장**: SQLite DB에서 넘어오는 정수형 데이터(`0` 또는 `1`)와 TypeScript의 엄격한 boolean 타입(`true`/`false`) 간 비교 시 strict 비교문(`!==`, `===`)을 쓰면 필터 오작동이 일어납니다. 이를 방지하기 위해 type assertion(`as any` 캐스팅 등)을 적용하여 런타임 형 변환을 거쳐 안전하게 비교하도록 구현합니다.

8. **디자인 철학 및 레이아웃**: 'AI가 짠 것 같은' 과도한 디자인을 배제하고 전문적인 실무형 라이트 모드(Light Mode)를 기본 채택합니다. 레이아웃은 상단 헤더를 없애고 [사이드바 | 지도] 양분형 구조로 화면을 꽉 채우도록 설계하며, 맞춤 필터 토글은 우측 상단 고정, 사이드바 최상단에는 서비스 타이틀을 고정 배치합니다.

