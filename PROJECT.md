# PROJECT.md

이 파일은 이 프로젝트의 **물리적 상태, 개발 환경 사양, 폴더 구조 및 실행 명령어**를 관리하는 문서입니다.

---

## 1. 프로젝트 개요 (Project Overview)

* **목적:** 한글과컴퓨터의 오픈소스 라이브러리인 `opendataloader-pdf`를 활용하여 PDF 문서를 고품질 마크다운(Markdown) 문서로 자동 변환하는 유틸리티 환경 구축.
* **주요 타겟 데이터:** 공공기관 입주자 모집 공고 등 복잡한 서식과 표가 포함된 PDF 문서.

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
│   │   └── convert_pdf_to_md.py    # PDF 표준 마크다운 변환 통합 스크립트
│   └── skills/
│       ├── convert-pdf/SKILL.md    # PDF 자동 스캔/변환 스킬
│       ├── extract-data/SKILL.md   # 마크다운 to DB 추출/적재 자동화 스킬
│       └── note/SKILL.md           # 규칙 및 동기화 관리 스킬
├── doc/
│   ├── pdf/                        # 원본 PDF 저장소 (규격 폴더 구조)
│   └── md/                         # 변환된 Markdown 및 이미지 저장소
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
│   │   ├── Map.tsx                 # 네이버 지도 컴포넌트 (ncpKeyId 인증 방식 및 지오코딩 폴백 탑재)
│   │   ├── Sidebar.tsx             # 검색/필터 및 상세 아코디언 컴포넌트
│   │   └── DetailPanel.tsx         # 평형별 공급 조건 슬라이딩 상세 패널
│   ├── db/
│   │   ├── db_init.py              # 데이터베이스 테이블 및 인덱스 초기화 스크립트
│   │   └── query.sql               # 쿼리 참고용 SQL 파일
│   ├── lib/
│   │   └── db.ts                   # SQLite 데이터베이스 커넥터 모듈
│   └── parser/
│       ├── insert_loader.py        # 서브에이전트 JSON 정제 데이터를 파일로 저장 및 관계형 DB 적재 스크립트
│       └── audit_db.py             # DB 데이터 정합성 및 무결성 감사/검증 스크립트
├── public_housing.db               # 적재 완료된 SQLite 데이터베이스 파일
├── node_modules/                   # Node.js 패키지 (자동 관리, Git 제외 대상)
├── package.json                    # Node.js 패키지 및 스크립트 정의 파일
├── package-lock.json               # Node.js 의존성 잠금 파일
├── tsconfig.json                   # TypeScript 환경 설정 파일
├── next.config.ts                  # Next.js 컴파일/빌드 설정 파일
├── eslint.config.mjs               # ESLint 정적 분석 설정 파일
├── postcss.config.mjs              # PostCSS 스타일 처리 설정 파일
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
| `subscription_type` | VARCHAR(50) | N | 청약 유형 (예: `행복주택`, `장기전세`, `전세임대` 등) |
| `doc_path` | VARCHAR(255) | N | 변환된 마크다운 문서 및 리소스 디렉토리 경로 |
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
| `supply_type` | VARCHAR(100) | Y | 공급 구분 (예: `우선공급`, `일반공급`, `재공급`) |
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
./venv/bin/python .agents/scripts/convert_pdf_to_md.py doc/pdf/2026_1차_행복주택/origin.pdf
```

### 데이터베이스 테이블 구축 및 파싱 적재 파이프라인 명령어
데이터베이스를 구성하거나 마크다운으로부터 정제 데이터를 갱신 적재하고자 할 때 사용하는 스크립트 실행 가이드라인입니다.
```bash
# [방법 4] 데이터베이스 스키마 및 인덱스 초기화 (최초 1회 실행)
./venv/bin/python src/db/db_init.py

# [방법 5] 적재된 DB 데이터 정합성 검증 및 리포팅 감사(Audit) 실행
./venv/bin/python src/parser/audit_db.py

# [방법 6] 서브에이전트가 추출한 JSON 데이터를 파일로 보관하고 데이터베이스에 관계형 적재
./venv/bin/python src/parser/insert_loader.py <JSON_파일경로_또는_JSON문자열> [저장할_JSON_대상경로]

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

```

### 자료 수집 및 파일명 명명 규약 (Data & File Naming Conventions)
일관성 있는 자동 변환 및 데이터 파싱을 위해 수집된 데이터는 아래 규약을 엄격하게 준수해야 합니다.

1. **폴더 구조 및 이름:** `doc/pdf/` 및 `doc/md/` 하위의 폴더명은 공고 폴더 생성 시 띄어쓰기를 배제하고 언더바(`_`)로 연결하며, **`YYYY_[차수/구분]_[청약유형]_[기관명]_[시퀀스(01, 02, ...)]`** 포맷(예: `2026_1차_행복주택_LH_01`)으로 명명합니다.
2. **원본 PDF 파일명:** 폴더 하위에 위치하는 원본 공고문 PDF 파일은 식별을 위해 **원본 파일명 그대로 유지**하여 저장합니다.
3. **마크다운 문서명:** 변환 완료된 마크다운 문서 파일은 항상 **`document.md`**로 명명합니다.
4. **추출 이미지 폴더명:** 문서에서 추출한 이미지 파일들은 항상 **`images/`** 하위 디렉토리에 저장하고, `document.md` 내에서 해당 상대 경로로 참조하도록 합니다.
5. **시퀀스 동적 자동 부여:** 동일 `YYYY_차수_유형_기관` 조합의 폴더가 이미 물리적으로 존재할 경우, 자동으로 시퀀스 넘버를 `01`, `02`, `03`으로 1씩 순차 증가시켜 폴더를 생성함으로써 덮어쓰기 유실을 방지합니다.
6. **기관명 식별 보정:** 공고 파일명에 지자체명 등이 포함되어 표준 기관명(LH, SH, GH, iH, HUG) 판정이 모호할 경우, 변환 프로세스 중 본문 텍스트 상위 5000자를 스캔하여 실 청약 시행 기관을 강제 식별 및 보정합니다.

#### 공공청약 유형 표준 사전 (Subscription Type Standards)
폴더명에 들어가는 `[청약유형]`은 아래 표에 기술된 **표준 분류명**만 사용하며, 자의적인 명명은 전면 금지합니다.

| 표준 분류명 (Folder Type) | 공식 한글 명칭 | 소속 기관 | 설명 |
| :--- | :--- | :--- | :--- |
| **`행복주택`** | 행복주택 | LH, SH | 대학생, 청년, 신혼부부 등 젊은 층 대상 임대 |
| **`장기전세`** | 장기전세주택 | LH, SH | 주변 시세 80% 이하, 최장 20년 전세 임대 |
| **`장기전세2`** | 장기전세주택2 (미리내집) | SH | 서울시 저출생 대책 신혼부부 전용 장기전세 |
| **`국민임대`** | 국민임대주택 | LH, SH | 무주택 저소득 서민 대상 장기 임대 (최대 30년) |
| **`영구임대`** | 영구임대주택 | LH, SH | 기초생활수급자 등 최취약계층 대상 임대 (최대 50년) |
| **`통합공공임대`** | 통합공공임대주택 | LH | 국민/영구/행복주택을 하나로 통합한 신규 임대 유형 |
| **`공공임대`** | 공공임대주택 | LH, SH | 일정 기간 임대 거주 후 분양전환하는 임대. **50년 공공임대 유형도 이 분류로 통합 적재** |
| **`50년공공임대`** | 50년 공공임대주택 | LH | 반영구적 장기 공공임대 (폴더 분류명). DB 적재 시 `공공임대`로 정규화하지 않고 `50년공공임대`로 그대로 유지 |
| **`매입임대`** | 매입임대주택 | LH, SH | 공사가 기존 주택을 매입하여 시세보다 저렴하게 임대 |
| **`특화형매입임대`** | 특화형 매입임대주택 (GH Care Hub / 사회적주택) | GH, SH | 사회적 경제주체(운영기관)가 매입임대주택을 활용하여 주거서비스를 제공하는 임대. 운영기관별 조건 상이 |
| **`전세임대`** | 전세임대주택 | LH, SH | 입주자가 고른 민간 주택을 공사가 전세 계약 후 재임대 |
| **`든든전세`** | 든든전세주택 (전세임대형 포함) | LH, HUG | HUG/LH가 주택을 직접 확보하여 공급하는 전세주택 |
| **`청년안심`** | 청년안심주택 | SH | 역세권 청년 및 신혼부부 대상 임대 |
| **`장기안심`** | 장기안심주택 | SH | 서울시 보증금 지원형 전세임대 |
| **`희망하우징`** | 희망하우징 | SH | 대학생 전용 쉐어하우스형 매입임대 |

---

### 데이터 파싱 및 수집 규약 (Data Parsing & Extraction Conventions)

데이터 파싱 및 적재의 정합성을 확보하고 불필요한 행정 노이즈 데이터를 차단하기 위해 아래 규약을 준수합니다.

1. **원천 데이터 신뢰 원칙**: 데이터 파싱 및 가공 시 원본 PDF 파일이나 가변적인 외부 폴더 경로에 의존하여 메타데이터를 유추하지 않으며, 오직 대상 마크다운 파일(`document.md`) 본문의 텍스트 및 표 콘텐츠만 원천 데이터로 삼아 정보를 수집합니다. (구 AGENTS.md 누적 규칙 #7 이관)
2. **행정 서식 제외 (노이즈 필터링)**: 공고문 후반부에 수록되는 개인정보 동의서, 위임장, 빈 서류 양식 및 자기소개서 가이드 등 행정 서식 양식이나 불필요한 별첨 텍스트는 노이즈 데이터로 취급하여 수집 대상에서 제외합니다. (구 AGENTS.md 누적 규칙 #8 이관)
3. **위치 정보 좌표 변환 위임**: 지도 마커 생성을 위한 주택의 위치 정보 수집 시 위도, 경도 실수형 좌표 데이터를 테이블에 고정하지 않으며, 텍스트 주소(`address`) 정보만 저장하고 클라이언트 지도 라이브러리(Geocoder)의 동적 좌표 변환에 위임하여 스키마를 담백하게 관리합니다. (구 AGENTS.md 누적 규칙 #9 이관)
4. **정제 데이터 물리 보관 및 이식성 보장**: 서브에이전트가 추출한 JSON 형태의 정제 데이터는 임시 경로에 두지 않고, 각 공고 마크다운 폴더 하위인 `doc/md/{공고_폴더}/data.json`에 물리적인 파일로 보존하여 관리합니다. 또한, 데이터베이스 적재 시 파일 시스템의 절대 경로가 하드코딩되지 않도록 프로젝트 루트 기준 가변 상대 경로로 변환하여 저장함으로써 환경 이식성을 보장합니다.
5. **50년 공공임대 처리**: 모집 공고 중 '50년 공공임대' 유형은 폴더명과 DB `subscription_type` 모두 `50년공공임대`로 그대로 유지합니다. (표준 사전 항목 별도 정의)
6. **Next.js Hydration 경고 방지**: 클라이언트 브라우저 확장 프로그램 등에 의해 HTML `body` 태그의 속성이 임의 변조(예: `cz-shortcut-listen="true"`)되는 경우 Next.js SSR과 CSR 간 마크업 불일치(Hydration mismatch) 에러가 발생할 수 있습니다. 이를 방지하기 위해 최상위 레이아웃 파일([src/app/layout.tsx](file:///home/iru/project03/src/app/layout.tsx))의 `<html>` 태그에 `suppressHydrationWarning` 속성을 필수 적용합니다.

---

### 대시보드 UI 및 필터링 구현 규약 (Dashboard UI & Filtering Conventions)

1. **지상 오버레이 필터 UI 미니멀리즘**: 지도의 오버레이 필터 패널은 지도를 넓게 볼 수 있도록 접기/펼치기 기능을 탑재하고, 접었을 때 가로 폭은 `175px` 내외로 간소화합니다. 이때 가독성을 해치고 투박한 한글 글자("접기", "필터 열기")는 배제하고 심플하게 방향 표시 화살표 아이콘(`▲` / `▼`)만 노출합니다.
2. **필터 슬라이더 범위 동적 연동**: 전용면적, 임대보증금, 월 임대료 등 필터 슬라이더를 구현할 때 하드코딩된 임의의 한계값을 사용하지 않고, 선택된 공고 주택 목록의 실제 최솟값과 최댓값을 동적으로 추출하여 슬라이더의 양 끝단(min, max)으로 연동시킵니다.
3. **월 임대료 정수 표기 표준화**: 월 임대료 표기 시 소수점 단위 환산 표기("만 원")를 배제하고, 소수점 없이 정밀한 **정수 원화 단위**(예: `320,000원`)로 포맷팅하여 렌더링합니다.
4. **상호전환 조건의 단일 소스화 (SSOT)**: 청약 공고의 상호전환 이율 및 한도 조건은 개별 주택 유닛 테이블(`housing_units`)에 중복 적재하지 않고, 부모 공고 테이블(`announcements`)에 단일 메타데이터 컬럼으로 설계하여 화면 계산식에 활용합니다. (1안 설계 방향에 따름)
5. **데이터 타입 런타임 호환성 보장**: SQLite DB에서 넘어오는 정수형 데이터(`0` 또는 `1`)와 TypeScript의 엄격한 boolean 타입(`true`/`false`) 간 비교 시 strict 비교문(`!==`, `===`)을 쓰면 필터 오작동이 일어납니다. 이를 방지하기 위해 type assertion(`as any` 캐스팅 등)을 적용하여 런타임 형 변환을 거쳐 안전하게 비교하도록 구현합니다.

