# PleaseHome (플리즈홈) - 통합 임대주택 정보 대시보드 🏠

> 🌐 **실제 서비스 URL**: [https://pleasehome.com](https://pleasehome.com)

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)](https://nginx.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PM2](https://img.shields.io/badge/PM2-2B037A?style=for-the-badge&logo=pm2&logoColor=white)](https://pm2.keymetrics.io/)
[![Naver Maps API](https://img.shields.io/badge/Naver%20Maps%20API-03C75A?style=for-the-badge&logo=naver&logoColor=white)](https://www.ncloud.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**PleaseHome(플리즈홈)**은 LH, SH, GH 등 공공기관에서 발행하는 방대하고 복잡한 임대주택 입주자 모집 공고를 정밀 분석하여, 사용자 친화적인 지도 기반 인터페이스로 제공하는 풀스택 서비스입니다. 

기존에 분리되어 운영되던 프론트엔드(Next.js 대시보드)와 백엔드(Python 데이터 파이프라인)를 하나의 모노레포(Monorepo)로 통합하여 유지보수성 및 개발 생산성을 극대화하였습니다.

---

## 🚀 핵심 기능 (Key Features)

### 1. 데이터 파이프라인 (Backend)
* **공공데이터포털(OpenAPI) 연동**: LH 분양임대공고문 API와 실시간 통신하여 최신 입주자 모집 공고 목록과 세부 상세 정보(BBS)를 자동 수집합니다.
* **자동화된 문서 수집**: 공고문에 첨부된 필수 PDF 원문(모집 안내문 등)을 식별하여 지정된 로컬/클라우드 스토리지로 일괄 다운로드하는 ETL 파이프라인을 갖추고 있습니다.

### 2. 지도 기반 대시보드 (Frontend)
* **실시간 지리 시각화**: 네이버 지도 API와 연동하여 위경도 좌표를 기반으로 공공주택 단지를 브라우저 레이턴시 없이 즉시 렌더링합니다.
* **다차원 조건별 맞춤 필터링**: 공고 기관별, 임대 유형별, 공급 대상별 및 보증금/월세 범위 등 사용자 맞춤형 조건을 통한 빠른 필터링을 지원합니다.
* **상세 조건 대조 분석**: 단지 선택 시 우측 슬라이딩 상세 패널을 통해 평형, 공급 호수, 기본 임대조건 및 최대 전환 조건(보증금 ↔ 월세)을 직관적으로 대조합니다.
* **공고 세부 자격 및 정보 가이드**: 복잡한 신청 자격 요건을 직관적인 아코디언 레이아웃으로 제공하고, 변환된 마크다운 뷰어 연동을 통해 원문 공고 정보까지 쾌적하게 조회합니다.

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

* **좌측 영역 (Sidebar)**: 공고 목록 조회 및 청약 조건 다차원 검색/필터링
* **중앙 영역 (Naver Map)**: 단지들의 실제 위치 매핑 (DB 위경도 기반 동기식 즉시 마킹)
* **우측 영역 (Sliding Detail Panel)**: 평형별 공급 호수 및 최대 상호 전환 조건(보증금 ↔ 월 임대료) 상세 분석

---

## 📐 시스템 아키텍처 (Architecture)

웹 서비스 운영의 효율성과 시스템 자원의 최적화를 위해 **데이터 적재(Backend)**와 **웹 서빙(Frontend)**의 책임을 명확하게 분리합니다.

```mermaid
graph TD
    subgraph "Backend (Data Pipeline)"
        LH_API[LH OpenAPI] --> |공고 및 첨부파일 Fetch| Python_ETL[Python 데이터 파이프라인]
        Python_ETL --> |가공 및 병합| SQLite[(SQLite Database)]
        Python_ETL --> |문서 저장| PDF_Storage[PDF Documents]
    end

    subgraph "Frontend (Web Dashboard)"
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
├── frontend/                   # 웹 프론트엔드 (Next.js 14+)
│   ├── .agents/                # AI 에이전트 소통/행동 규칙 (AGENTS.md 등)
│   ├── docs/                   # 프론트엔드 상세 배포 가이드 및 CHANGELOG
│   ├── src/app/                # App Router 기반 페이지 & REST API
│   ├── src/components/         # 네이버 지도, 사이드바 등 재사용 UI 컴포넌트
│   ├── public/                 # 정적 에셋 파일
│   └── package.json            # Node.js 의존성 관리
├── backend/                    # 데이터 파이프라인 백엔드 (Python)
│   └── src/lh_notice/          # LH API 연동 및 PDF 다운로드 스크립트
├── docs/                       # 각종 설계 및 배포 가이드 문서
├── .gitignore                  # 통합 형상 관리 예외 규칙
└── README.md                   # 프로젝트 메인 문서 (Current)
```

---

## 🛠️ 개발 환경 구축 및 실행 가이드 (Getting Started)

### 1. 사전 요구사항 (Prerequisites)
* **Node.js**: v24.16.0 이상 (npm v11.13.0+)
* **Python**: v3.10 이상
* **Database**: SQLite 3

### 2. 환경 변수 설정
최상위 루트(또는 각 폴더 루트)에 `.env.local` 파일을 생성하고 아래의 API Key를 설정합니다.
```env
# Frontend (Naver Map API)
NEXT_PUBLIC_NAVER_CLIENT_ID=your_naver_map_client_id

# Backend (LH OpenAPI - 공공데이터포털)
LH_NOTICE_LIST_API_KEY=your_lh_list_decoded_api_key
LH_NOTICE_DTL_API_KEY=your_lh_detail_decoded_api_key
```

### 3. 백엔드 파이프라인 실행 (데이터 수집)
```bash
# 패키지 설치
pip install requests python-dotenv

# LH API 통신 및 PDF 다운로드 스크립트 실행
cd backend/src/lh_notice
python main.py
```

### 4. 프론트엔드 대시보드 실행 (웹 서비스)
```bash
# Node 패키지 설치
cd frontend
npm install

# 로컬 웹 개발 서버 가동
npm run dev
```
서버 가동 후 브라우저를 통해 [http://localhost:3000](http://localhost:3000) 에 접속하시면 지도 대시보드 화면을 확인하실 수 있습니다.

---

## 🚀 CI/CD 및 배포 파이프라인 (Deployment Pipeline)

본 프로젝트는 최소한의 클라우드 서버 자원(Micro 단위, 1GB RAM)을 효율적으로 활용하기 위해 격리된 무중단 배포(Zero-Downtime) 전략을 취하고 있습니다. 서버 성능 최적화와 실서비스 데이터의 안전한 보호를 위해 소스 코드 배포와 데이터베이스 배포가 정밀하게 분리(격리)되어 수행됩니다.

1. **로컬 빌드 및 데이터 적재**:
   * 로컬 환경에서 외부 API 통신을 통해 최신 `public_housing.db` 구축 및 검증.
   * 프론트엔드 최적화를 위한 Static Build 수행.
2. **격리된 고속 배포 (rsync & scp)**:
   * **소스 코드 동기화 (rsync)**: 로컬의 Git 히스토리 및 개발 문서들 외에 실서비스용 데이터베이스(`public_housing.db*`), 마스터 키 파일(`.pem`), 환경변수(`.env.local`) 등은 전송 제외(`--exclude`)하여 소스 코드만 초고속으로 동기화.
   * **중요 설정 및 데이터 업로드 (scp)**: 완성된 SQLite DB 파일 및 네이버 API 환경변수 파일 등은 `scp`를 통해 별도 단독 업로드.
3. **PM2 Zero-Downtime Reload**:
   * 서버 측 Nginx 리버스 프록시 환경에서 공고 데이터가 갱신되어 DB 파일을 교체하거나 코드가 업데이트될 때, 웹서버를 다운시키지 않고 애플리케이션 프로세스를 교체(`pm2 reload`)하여 서버 다운타임을 원천 차단합니다.

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

* **Git 커밋 규약**: `feat`, `fix`, `refactor`, `chore` 등 Conventional Commits 표준을 엄격하게 준수합니다. 구체적인 작성 규약은 `frontend/.agents/commit_convention.md`를 참조하십시오.
* **코드 품질 관리**: 프론트엔드는 전역 설정된 ESLint 및 Prettier 규칙에 종속되며, 백엔드 파이프라인은 PEP 8 코드 스타일 가이드라인을 지향합니다.
* **디자인 토큰 시스템**: 프론트엔드의 모든 UI 간격 및 색상은 컴포넌트 내에 하드코딩하지 않고 전역 `globals.css`의 디자인 토큰 변수에 100% 종속됩니다.
* **에이전트 소통 규약**: AI 에이전트의 행동 및 피드백 누적 규칙에 대한 규정은 `frontend/AGENTS.md` 파일에 명기되어 있습니다.

---

## 📜 라이선스 (License)

본 프로젝트는 [MIT License](LICENSE) 하에 배포 및 관리됩니다. 자세한 사항은 `LICENSE` 파일을 참조 바랍니다.

---

## 🚨 트러블슈팅 (Troubleshooting)

프로젝트 개발 및 운영 과정에서 발생했던 핵심 이슈와 해결(Troubleshooting) 내역입니다.

### [프론트엔드 (Frontend)]

1. Next.js Standalone 배포 시 SQLite DB 경로 매핑 문제
   • 현상: 빌드된 `server.js` 구동 시 `public_housing.db`를 찾지 못함.
   • 해결: 로컬과 서버의 디렉토리 구조(`frontend`, `backend`)를 완벽히 일치시키고, `db.ts`에서 `process.cwd()` 기준 상대 경로(`../backend/public_housing.db`)로 동적 참조하도록 설계하여 해결.

2. Standalone 아티팩트 구버전 DB 중복 패키징 현상
   • 현상: Next.js 빌드 시 File Tracing 기능이 기존 DB를 번들에 통째로 포함시켜, 서버에 최신 DB를 업로드해도 프론트엔드가 낡은 과거 사본을 우선적으로 읽어오는 데이터 불일치 발생.
   • 해결: 배포 자동화 스크립트(`build:pack`)에 아티팩트 압축 직전 번들링된 DB 사본을 강제 삭제(`rm -f deploy/public_housing.db`)하는 구문을 삽입하여 최신 단일 DB 참조 보장.

3. 하드코딩된 인라인 스타일 파편화 및 반응형 붕괴
   • 현상: 컴포넌트(TSX) 내부에 `50%`, `100vh` 등의 원시 레이아웃 수치가 악의적인 인라인 스타일(`style={{...}}`)로 하드코딩되어 반응형 뷰가 깨지고 유지보수가 마비됨.
   • 해결: 전수 조사를 통해 족쇄가 된 인라인 스타일을 어떠한 예외도 없이 걷어내고, 모듈형 CSS(`index.css`) 및 Tailwind 유틸리티 토큰으로 100% 치환하여 렌더링 무결성 확보.

4. 1GB RAM 인프라 OOM(Out of Memory) 셧다운 에러
   • 현상: 1GB RAM의 제한된 NCP Micro 서버에서 프론트엔드 패키지 설치(`npm install`) 및 네이티브 모듈(`sqlite3`) 컴파일 시도 시, 메모리 임계치 초과로 서버가 뻗어버림.
   • 해결: 서버 내 빌드 과정을 전면 폐기하고, 로컬에서 사전 컴파일된 `standalone` 아티팩트(`.tar.gz`)만 업로드하여 `pm2 start server.js`로 구동하는 무중단 초경량 아키텍처로 개편.

5. Nginx 프록시 구성 시 정적 자원(Static) 누락 및 심볼릭 링크 오류
   • 현상: 서버 배포 후 접속 시 CSS/JS 등 `.next/static` 에셋이 404 Not Found 에러를 반환하거나, `sites-enabled`의 심볼릭 링크가 깨져 Nginx 테스트(`-t`)가 실패하는 현상.
   • 해결: Nginx 설정 내 `location /_next/static/` 블록에 `alias /home/iru/app/pleasehome/frontend/.next/static/;` 절대 경로를 명확히 매핑하고, `sites-available` 원본 파일을 에디터로 확실히 저장한 뒤 링크를 생성하도록 배포 절차를 교정.

6. 애드센스 심사용 정적 상세 라우팅 및 지도의 실시간 쿼리 상태 동기화
   • 현상: 메인 지도가 CSR(클라이언트 렌더링) 방식으로 동작하여 검색 로봇(애드센스)이 1,000자 이상의 정보성 텍스트를 읽지 못해 승인이 거절되고, 상세 페이지 뷰포트 내 스크롤이 차단되거나 딥링크 진입 후 URL 모순이 발생함.
   • 해결: `/announcements/details/[id]` 정적 상세 페이지를 개설해 SQLite DB를 서버 사이드에서 실시간 쿼리하여 마크다운 포맷으로 풀 텍스트(MarkdownViewer) 렌더링을 구현하고, `detail-layout.css` 스크롤 래퍼를 씌워 글로벌 `overflow: hidden` 간섭을 우회함. 동시에 메인 지도 탐색 시 선택된 공고 ID를 HTML5 replaceState 기반 Shallow Routing으로 실시간 양방향 URL 동기화하여 해결.

### [백엔드 (Backend)]

1. SQLite 컬럼 Comment 속성 미지원 및 메타데이터 표출 한계
   • 현상: 데이터베이스 스키마 설계 시 시스템 수준의 컬럼 주석(Comment) 파싱을 SQLite 엔진 자체가 지원하지 않아, GUI 조회 툴 등에서 논리적 메타데이터를 확인할 수 없음.
   • 해결: 무리한 DB 구조 변형을 배제하고 엔진 제약 사항을 수용하는 대신, 개발 규약 문서(`PROJECT.md`) 내에 테이블/컬럼 단위 메타데이터 명세서를 구축해 단일 진실 공급원(SSOT) 마련.

2. Geocoding API 좌표 변환 시 인증 거부 (210/401 에러)
   • 현상: 데이터 파이프라인에서 텍스트 주소를 위경도로 변환하기 위해 네이버 지도 API 호출 시 지속적인 인증 거부 에러 반환.
   • 해결: 백엔드의 Geocoding 서버 간 통신 특성을 파악하여, 프론트엔드 클라이언트와 달리 런타임 호환용 전용 도메인(`maps.apigw.ntruss.com`)을 엔드포인트로 명확히 분리하여 호출하도록 통신 규격 수정.

3. Geocoding API 주소 파싱 실패 및 정밀도 하락 (마커 누락)
   • 현상: 일부 신도시 주소나 비표준 도로명, 괄호가 포함된 주소를 통째로 넘길 경우 네이버 Geocoding API가 좌표 변환에 실패하여 지도상에 단지 마커가 아예 누락됨.
   • 해결: 1차 변환 실패 시 주소의 뒷단어를 읍/면/동 단위 마지노선까지 하나씩 잘라내며 재시도하는 폴백(Fallback) 검색 알고리즘을 도입. 동시에 불완전 매핑 여부를 구분하기 위해 DB에 `is_imprecise` 플래그를 추가하여 무결성 통제.

---

