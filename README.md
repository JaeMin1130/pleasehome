# PleaseHome (플리즈홈) - 통합 임대주택 정보 대시보드 🏠

> 🌐 **실제 서비스 URL**: [https://pleasehome.com](https://pleasehome.com)

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)](https://nginx.org/)
[![Next.js 16.x](https://img.shields.io/badge/Next.js%2016.x-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PM2](https://img.shields.io/badge/PM2-2B037A?style=for-the-badge&logo=pm2&logoColor=white)](https://pm2.keymetrics.io/)
[![Naver Maps API](https://img.shields.io/badge/Naver%20Maps%20API-03C75A?style=for-the-badge&logo=naver&logoColor=white)](https://www.ncloud.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Mantine UI](https://img.shields.io/badge/Mantine_UI-339AF0?style=for-the-badge&logo=mantine&logoColor=white)](https://mantine.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**PleaseHome(플리즈홈)**은 LH, SH, GH 등 공공기관에서 발행하는 방대하고 복잡한 임대주택 입주자 모집 공고를 정밀 분석하여, 사용자 친화적인 지도 기반 인터페이스로 제공하는 풀스택 서비스입니다. 

기존에 분리되어 운영되던 프론트엔드(Next.js 대시보드)와 백엔드(Python 데이터 파이프라인)를 하나의 모노레포(Monorepo)로 통합하여 유지보수성 및 개발 생산성을 극대화하였습니다.

---

## 🚀 핵심 기능 (Key Features)

### 1. 데이터 파이프라인 (db-pipeline)
* **공공데이터포털(OpenAPI) 연동**: LH 분양임대공고문 API와 실시간 통신하여 최신 입주자 모집 공고 목록과 세부 상세 정보(BBS)를 자동 수집합니다.
* **자동화된 문서 수집**: 공고문에 첨부된 필수 PDF 원문(모집 안내문 등)을 식별하여 지정된 로컬/클라우드 스토리지로 일괄 다운로드하는 ETL 파이프라인을 갖추고 있습니다.

### 2. 지도 기반 대시보드 (web)
* **실시간 지리 시각화 (Naver Maps API)**: 네이버 지도 API와 정밀 연동하여, SQLite DB의 위경도 좌표를 기반으로 수백 개의 공공주택 단지 마커를 브라우저 레이턴시 없이 즉각 매핑 및 렌더링합니다.
* **다차원 조건별 맞춤 필터링**: 공급 기관별(SH/LH/GH/민간), 임대 유형별, 공급 대상별 및 보증금/월 임대료 구간 슬라이더 등 사용자 맞춤형 조건을 조합한 고속 다차원 필터링을 지원합니다.
* **상세 조건 대조 분석 (Detail Panel)**: 단지 클릭 시 우측에서 슬라이딩 아웃되는 상세 패널을 통해 평형별 공급 세대수, 기본 임대 조건 및 최대 전환 임대조건(보증금 ↔ 월 임대료)을 실시간 모의 계산하고 대조 분석합니다.
* **공고 세부 자격 및 정보 가이드**: 주택형별 세부 신청 자격 요건을 직관적인 아코디언 레이아웃으로 제공하고, 파싱된 마크다운 원본 공고 정보 뷰어를 연동하여 텍스트 명세를 쾌적하게 조회합니다.
* **실시간 마감 디데이(D-Day) 타이머**: 접수 상태가 '접수중' 또는 '접수예정'인 공고 대상에 대해 초 단위 실시간 마감 임박 타이머 및 툴팁을 노출하고, 마감일이 없는 공고는 '상시모집' 상태로 자동 예외 판정합니다.
* **단계별 청약 일정 타임라인바**: 접수 기간, 서류 발표, 당첨자 발표, 계약 기간 등 청약 생애주기 일정을 10px 정원(Dot) 툴팁과 단계별 활성 게이지 바(Step-based offset gauge) 디자인으로 도식화하여 직관적인 타임라인 대조를 가능하게 합니다.
* **드래그앤드롭(Drag & Drop) 기반 저장 폴더 이관**: 저장(북마크) 탭에서 단지 카드를 마우스로 드래그하여 원하는 폴더 위로 드롭해 소속 폴더를 직관적이고 빠르게 재배치할 수 있습니다. (드래그 진입 상태에 따라 폴더 고유 색상의 점선 비주얼 피드백 제공)
* **다중 폴더 개폐(Multi-open) 및 실시간 맵 마커 동기화**: 여러 저장 폴더를 동시에 확장해 놓을 수 있으며, 현재 열려 있는 폴더들에 소속된 저장 단지들만을 실시간 취합해 지도상에 필터링 마킹합니다. (열린 폴더가 하나도 없을 때는 전체 저장 단지를 표출)
* **북마크 폴더명 인라인 편집(Rename)**: 저장 탭 내에서 별도 모달 없이 연필 단추를 클릭해 폴더 이름을 즉각 수정할 수 있는 인라인 폼 편집 및 토글 기능을 제공합니다. (Enter/Esc 바인딩 및 아코디언 개폐 전파 차단)
* **공고 숨김(비활성화) 및 타임스탬프 역순 정렬**: 관심 없는 모집 공고를 메인 뷰에서 숨길 수 있으며, 최근 숨긴 시점의 역순(타임스탬프 기반) 정렬 및 언제든지 다시 복원할 수 있는 독립 관리 탭을 제공합니다.
* **찜한 공고 필터링 및 숨김 상호 베타 제어**: 관심 있는 공고에 대해 하트(찜) 기능을 지원하며, 찜하기를 선택하면 자동으로 숨김이 해제되고, 반대로 숨김 처리 시 자동으로 찜이 해제되는 상호 베타적 비즈니스 로직(방안 A)을 탑재했습니다.
* **양방향 호버(Hover) 시각 연동**: 사이드바 주택 목록 카드에 마우스를 올리면(Hover) 지도상의 대응 마커가 즉시 강조 색상으로 변경되는 양방향 시각적 호버 동기화 프로세스를 갖추고 있습니다.
* **외부 길찾기 내비게이션 연동**: 단지 상세 주소를 기반으로 네이버 지도 및 카카오 맵 길찾기 웹 서비스로 직접 경로 검색 매개변수를 전송하여 연결해 주는 출발지-목적지 경로 탐색 바로가기를 탑재했습니다.

---

## 🖥️ UI 레이아웃 구조 (UI Layout Structure)

본 서비스는 사용자가 정보의 맥락을 잃지 않고 다차원 요소를 유연하게 대조·탐색할 수 있도록 3단 화면 분할 시스템을 채택하고 있습니다.

```text
┌────────────────────────────────────────────────────────┐
│                 PleaseHome Dashboard Header            │
├───────────────────┬────────────────────────────────────┤
│                   │                                    │
│ [검색 및 필터]    │           [ Naver Map ]            │
│ - 기관 / 유형별   │ - 공급 단지별 마커 시각화          │
│ - 보증금/월세 락  │ - 마커 클릭 시 요약 팝업           │
│                   │                                    │
│ [모집 공고 목록]  │                                    │
│ - 공고 아코디언   │                                    │
│ - 데이터 연동     │                                    │
│                   │                                    │
└───────────────────┴────────────────────────────────────┘
│ [우측 슬라이딩 상세 패널 (Detail Panel)]              │
│ - 단지 선택 시 우측에서 등장, 평형별 세부 조건 상세 분석│
└────────────────────────────────────────────────────────┘
```

* **좌측 영역 (Sidebar)**: 공고 목록 조회 및 청약 조건 다차원 검색/필터링, **저장 탭(북마크)의 다중 폴더 및 D-Day/타임라인바 기반 단지 카드 리스트 관리 (드래그앤드롭 이동 지원)**
* **중앙 영역 (Naver Map)**: 단지들의 실제 위치 매핑 (DB 위경도 기반 동기식 즉시 마킹, **저장 폴더 다중 개폐 상태와의 실시간 필터 동기화**)
* **우측 영역 (Sliding Detail Panel)**: 평형별 공급 호수 및 최대 상호 전환 조건(보증금 ↔ 월 임대료) 상세 분석

---

## 📐 시스템 아키텍처 (Architecture)

웹 서비스 운영의 효율성과 시스템 자원의 최적화를 위해 **데이터 적재(db-pipeline)**와 **웹 서빙(web)**의 책임을 명확하게 분리합니다.

```mermaid
graph TD
    subgraph "db-pipeline (Data Pipeline)"
        LH_API[LH OpenAPI] --> |공고 및 첨부파일 Fetch| Python_ETL[Python 데이터 파이프라인]
        Python_ETL --> |가공 및 병합| SQLite[(SQLite Database)]
        Python_ETL --> |문서 저장| PDF_Storage[PDF Documents]
    end

    subgraph "web (Web Dashboard)"
        SQLite -.-> |Read-Only 연결| Next_Server[Next.js App Router]
        Next_Server --> |지도 시각화 및 UI 서빙| Client[Web Browser]
        Naver_Map[Naver Maps API] --> Client
    end
```

> **아키텍처 설계 철학**: 
> 초경량 가상 서버(NCP Micro 등)에서의 안정적인 무중단 서비스를 위해, 무거운 API 통신 및 데이터 가공 작업은 백엔드 파이프라인에서 선제적으로 처리하여 완성된 SQLite `.db` 파일 형태로 빌드합니다. 프론트엔드는 오직 이 완성된 DB 파일을 `Read-Only`로 조회하며 빠른 화면 서빙에만 집중합니다.

---

## 📂 프로젝트 구조 (Project Structure)

```text
pleasehome/
├── web/                   # 웹 프론트엔드 (Next.js 16.x)
│   ├── .agents/                # AI 에이전트 소통/행동 규칙 및 가이드라인 스킬 모음
│   ├── docs/                   # 프론트엔드 배포 가이드 및 상세 [트러블슈팅 로그](file:///home/iru/app/pleasehome/web/docs/dev/TROUBLESHOOTING.md)
│   ├── src/app/                # App Router 기반 페이지 & REST API (상세 SEO용 동적 SSR 라우트 개설)
│   ├── src/components/         # 네이버 지도, 사이드바, 즐겨찾기, 타임라인 등 핵심 React 컴포넌트
│   ├── public/                 # 이미지 및 마크 등 정적 에셋 파일
│   └── package.json            # Node.js 패키지 의존성 (Mantine UI 9.x, TailwindCSS v4, better-sqlite3 포함)
├── db-pipeline/                    # 데이터 파이프라인 백엔드 (Python 3.12.x)
│   ├── .agents/scripts/        # PDF-마크다운 변환, DB 초기화, 데이터 정상 적재 및 감사 스크립트 모음
│   ├── src/lh_notice/          # LH API 연동 및 데이터 수집 스크립트 (api.py, main.py)
│   ├── docs/pdf/               # OpenAPI 수집을 통해 저장된 원본 PDF 임대 공고문 보존소
│   ├── docs/md/                # PDF에서 마크다운 형태로 파싱 변환된 document.md 및 data.json 보존소
│   ├── public_housing.db       # 최종 가공 적재된 SQLite3 공고 데이터베이스
│   ├── user_data.db            # 실서버 회원/찜/숨김/북마크 독립 SQLite3 데이터베이스 (배포 덮어쓰기 대상 제외)
│   └── PROJECT.md              # 파이프라인 전역 개발 환경 및 스키마 물리 명세서 (SSOT)
├── docs/                       # 각종 통합 설계 및 서버 배포 가이드 문서
├── .gitignore                  # 통합 형상 관리 예외 규칙
└── README.md                   # 프로젝트 메인 문서 (Current)
```

---

## 🛠️ 개발 환경 구축 및 실행 가이드 (Getting Started)

### 1. 사전 요구사항 (Prerequisites)
* **Node.js**: v20.x 이상 (npm v10+)
* **Python**: v3.12.x 이상
* **Database**: SQLite 3.x 이상

### 2. 환경 변수 설정

최상위 루트(또는 각 폴더 루트)에 `.env.local` 파일을 생성하고 아래의 API Key를 설정합니다.

이 설정을 빠르게 시작하려면 프로젝트 루트에 준비된 `.env.example` 파일을 복사하여 사용할 수 있습니다:
```bash
cp .env.example .env.local
```

복사한 `.env.local` 파일에 아래의 실제 API Key들을 기입합니다:
```env
# web (Naver Map API - Client ID)
NEXT_PUBLIC_NAVER_CLIENT_ID=your_naver_map_client_id

# db-pipeline (LH OpenAPI - 공공데이터포털 디코딩 키)
LH_NOTICE_LIST_API_KEY=your_lh_list_decoded_api_key
LH_NOTICE_DTL_API_KEY=your_lh_detail_decoded_api_key
```


### 3. 백엔드 파이프라인 실행 (데이터 수집)
```bash
# 가상 환경 생성 및 활성화
cd db-pipeline
python -m venv .venv
source .venv/bin/activate # Windows: .venv\Scripts\activate

# 패키지 설치
pip install requests python-dotenv lxml openpyxl python-docx opendataloader-pdf

# LH API 통신 및 PDF 다운로드 스크립트 실행
cd src/lh_notice
python main.py
```

### 4. 프론트엔드 대시보드 실행 (웹 서비스)
```bash
# Node 패키지 설치 (Mantine Core, Tailwind v4, better-sqlite3 동시 구성)
cd web
npm install

# 로컬 웹 개발 서버 가동
npm run dev
```
서버 가동 후 브라우저를 통해 [http://localhost:3000](http://localhost:3000) 에 접속하시면 지도 대시보드 화면을 확인하실 수 있습니다.

---

## 🚀 CI/CD 및 배포 파이프라인 (Deployment Pipeline)

본 프로젝트는 최소한의 클라우드 서버 자원(Micro 단위, 1GB RAM)을 효율적으로 활용하기 위해 격리된 무중단 배포(Zero-Downtime) 전략을 취하고 있습니다. 서버 성능 최적화와 실서비스 데이터의 안전한 보호를 위해 소스 코드 배포와 데이터베이스 배포가 정밀하게 분리(격리)되어 수행됩니다.

1. **로컬 프로덕션 빌드 및 패키징 (`npm run build:pack`)**:
   * **좌표 마이그레이션**: `node migrate_coords.js`를 가동해 위경도 좌표 결함이 있는 공고 단지들을 일괄 Geocoding하여 정밀 변환합니다.
   * **최적화 컴파일**: `next build`를 통해 빌드 캐싱 및 Standalone 최적화를 탑재하여 빌드를 진행합니다.
   * **아티팩트 병합**: standalone 실행 파일 번들(`.next/standalone/`), 정적 public 에셋, 빌드 캐시(`.next/static/`)를 단일 `deploy/` 경로로 일괄 수집합니다.
   * **용량 최적화**: 서버 상의 라이브 DB 오버라이트를 예방하기 위해 빌드 번들에 말려 들어간 중복 DB(`deploy/public_housing.db`)를 강제 삭제합니다.
   * **최종 패키징**: `tar -czf ../announce_deploy.tar.gz .`로 단일 압축을 수행하여 1GB RAM 서버에서도 메모리 폭동 없이 로드되도록 경량 아카이브를 빌드합니다.
2. **격리된 고속 배포 (rsync & scp)**:
   * **소스 코드 동기화 (rsync)**: 로컬의 Git 히스토리 및 개발 문서들 외에 실서비스용 데이터베이스(`public_housing.db*`), 마스터 키 파일(`.pem`), 환경변수(`.env.local`) 등은 전송 제외(`--exclude`)하여 소스 코드만 초고속으로 동기화합니다.
   * **중요 설정 및 데이터 업로드 (scp)**: 로컬에서 빌드된 경량 standalone 아티팩트(`announce_deploy.tar.gz`) 및 최종 검증된 SQLite DB 파일(`public_housing.db`)은 `scp`를 통해 개별 단독 업로드합니다.
3. **PM2 Zero-Downtime Reload**:
   * 서버 측 Nginx 리버스 프록시 환경에서 공고 데이터가 갱신되어 DB 파일을 교체하거나 코드가 업데이트될 때, 웹서버를 다운시키지 않고 애플리케이션 프로세스를 교체(`pm2 reload server.js`)하여 서버 다운타임을 원천 차단합니다.

*(추후 GitHub Actions를 활용한 전면 자동화 배포 파이프라인으로 고도화될 예정입니다.)*

---

## 🤝 기여 가이드 (Contributing)

안정적인 협업과 코드 품질 유지를 위해 다음 절차를 권장합니다.

1. `main` 브랜치에서 기능 개발을 위한 브랜치를 분기합니다. (예: `feature/map-optimization`, `fix/api-timeout`)
2. 작업 후 로컬에서 정상 구동 여부를 확인합니다.
3. 커밋 메시지는 규약(Conventional Commits)에 맞춰 작성합니다.
4. Pull Request(PR) 생성 시 작업 배경, 변경 사항, 테스트 내역을 명확히 기재하여 리뷰를 요청합니다.

---

## 📄 형상 관리 및 코딩 규약 (Convention)

* **Git 커밋 규약**: `feat`, `fix`, `refactor`, `chore` 등 Conventional Commits 표준을 엄격하게 준수합니다. 구체적인 작성 규약은 `web/.agents/commit_convention.md`를 참조하십시오.
* **코드 품질 관리**: 프론트엔드는 전역 설정된 ESLint 및 Prettier 규칙에 종속되며, 백엔드 파이프라인은 PEP 8 코드 스타일 가이드라인을 지향합니다.
* **디자인 토큰 시스템**: 프론트엔드의 모든 UI 간격 및 색상은 컴포넌트 내에 하드코딩하지 않고 전역 `globals.css`의 디자인 토큰 변수에 100% 종속됩니다.
* **에이전트 소통 규약**: AI 에이전트의 행동 및 피드백 누적 규칙에 대한 규정은 `web/AGENTS.md` 파일에 명기되어 있습니다.

---

## 📜 라이선스 (License)

본 프로젝트는 [MIT License](LICENSE) 하에 배포 및 관리됩니다. 자세한 사항은 `LICENSE` 파일을 참조 바랍니다.

---

## 🚨 트러블슈팅 (Troubleshooting)

본 프로젝트의 개발 및 배포 과정에서 마주한 다양한 기술적 이슈와 해결 방안은 아래의 플랫폼별 상세 로그 문서에서 통합 관리되고 있습니다. (단일 진실 공급원 - SSOT 유지)

* 🖥️ **[프론트엔드 및 인프라 상세 로그](docs/dev/TROUBLESHOOTING.md)**: Next.js Standalone 배포 경로 매핑, 1GB RAM OOM 대응, HTML5 슬라이더 위치 정밀 보정, 바텀시트 터치 제스처 랙 및 모바일 뷰포트(`dvh`) 대응, Next.js SSR Hydration Mismatch 해결, 모바일 로그인 모달 터치/호버 버그 패치, Git 커밋 컨벤션 복구 이슈 등 수록.
* ⚙️ **[데이터 파이프라인 및 백엔드 상세 로그](db-pipeline/docs/dev/TROUBLESHOOTING.md)**: SQLite 컬럼 코멘트 미지원 제약 극복 방안, Geocoding API 좌표 변환(210/401 에러) 및 주소 파싱 실패에 따른 폴백 알고리즘(is_imprecise) 도입 이슈 등 수록.

---


