# PleaseHome (플리즈홈) - 지도 기반 임대주택 정보 대시보드 🏠

> 🌐 **실제 서비스 URL**: [https://pleasehome.com](https://pleasehome.com)

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)](https://nginx.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PM2](https://img.shields.io/badge/PM2-2B037A?style=for-the-badge&logo=pm2&logoColor=white)](https://pm2.keymetrics.io/)
[![Naver Maps API](https://img.shields.io/badge/Naver%20Maps%20API-03C75A?style=for-the-badge&logo=naver&logoColor=white)](https://www.ncloud.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

LH, SH, GH 등 공공기관에서 발행하는 복잡하고 방대한 **임대주택 입주자 모집 공고**를 정밀 분석하여, 지도 상에서 누구나 쉽게 공급 위치와 임대 조건(보증금, 월세, 평형별 호수 등)을 탐색하고 직관적으로 비교할 수 있도록 제공하는 풀스택 대시보드 서비스입니다.

---

## 🚀 주요 기능 (Key Features)

1. **전국 임대주택 공급 정보 지도 시각화**
   * 네이버 지도 API와 동적 지오코더(Geocoder)를 연동하여 모집 공고에 포함된 공급 단지들의 실제 지리적 위치를 정확하게 매핑하고 시각화합니다.
2. **다차원 조건별 맞춤 필터링 검색**
   * 공고 기관별(LH, SH, GH 등), 임대 유형별, 공급 대상별(청년, 신혼부부, 다자녀 등) 필터와 함께 보증금/임대료 범위를 설정하여 나에게 맞는 공고만 맞춤 탐색할 수 있습니다.
3. **공급 단지 및 평형별 상세 조건 비교**
   * 단지 선택 시 우측 슬라이딩 상세 패널을 통해 전용면적, 공급 호수, 기본 임대조건 및 최대 전환 조건(보증금-월세 상호전환)을 한눈에 비교 분석할 수 있습니다.
4. **공고 세부 자격 및 정보 가이드**
   * 복잡한 신청 자격 요건(소득/자산 기준 등)을 직관적인 아코디언 레이아웃으로 제공하고, 변환된 마크다운 뷰어 연동을 통해 원문 공고 정보까지 쾌적하게 조회합니다.

---

## 📐 서비스 아키텍처 (Service Architecture)

본 서비스는 외부 개발 환경(또는 전담 CLI)에서 데이터 파이프라인 적재가 완료된 SQLite 데이터베이스를 기반으로 동작하며, 웹 서비스 제공 레이어만 단독 구동됩니다. 이를 통해 초경량 가상 서버(NCP Micro 1GB RAM)의 자원 낭비를 원천 방지하고 최상의 웹 반응 속도를 유지합니다.

```mermaid
graph TD
    subgraph Dev [로컬 개발 환경 - Next.js]
        Next_Dev[Next.js 로컬 구동] --> |Read Only| DB_Dev[(public_housing.db)]
    end

    subgraph Server [NCP Micro 가상 서버 - WAS]
        Nginx[Nginx 역방향 프록시] --> |Rate Limit & Proxy| Next_Srv[Next.js 웹 서비스]
        Next_Srv --> |Read Only| DB_Server[(public_housing.db)]
    end

    DB_Dev -- "1. scp 최초/정기 스왑 (외부 빌드 DB)" --> DB_Server
    Dev -- "2. rsync 소스 배포" --> Next_Srv
```

* **로컬 영역 (Local Dev)**: 완성된 SQLite DB 파일(`public_housing.db`)의 읽기(Read-Only) 동작만 수행하며 로컬에서 웹 애플리케이션을 가동하고 검증합니다.
* **서버 영역 (Web Serving)**: 이미 데이터 구축이 끝난 `public_housing.db` 파일의 읽기(Read-Only) 동작만 수행하며 3000포트 Next.js 및 Nginx 입구 방화벽(Rate Limit)을 통해 가볍게 화면을 서빙합니다.

---

## 🚀 경량화 배포 흐름 (Deployment Flow)

서버 성능 최적화와 실서비스 데이터의 안전한 보호를 위해 소스 코드 배포와 데이터베이스 배포가 정밀하게 분리(격리)되어 수행됩니다.

1. **소스 코드 배포 (rsync)**: 
   * 로컬의 Git 히스토리 및 개발 문서들 외에 실서비스용 데이터베이스(`public_housing.db*`)와 마스터 키 파일(`.pem`), 환경변수(`.env.local`)까지 완벽히 전송 제외(`--exclude`)하여 소스 코드만 초고속으로 동기화합니다.
2. **중요 설정 및 데이터 업로드 (scp)**: 
   * 네이버 API 환경변수 파일(`.env.local`)과 외부에서 빌드 완료된 최신 데이터베이스 파일(`public_housing.db`)은 최초 1회 또는 데이터 갱신 시에만 `scp` 명령어로 타깃 지정하여 개별 단독 업로드합니다.
3. **무중단 운영 스왑 (Zero-Downtime Swap)**:
   * 공고 데이터가 갱신되어 DB 파일을 교체할 때, 웹서버를 다운시키지 않고 `scp`로 최신 DB를 제자리에 스왑한 뒤 `pm2 reload public-housing` 명령어만 입력하여 무중단 상태로 즉각 최신 데이터를 클라이언트에게 서비스합니다.

---

## 🛠️ 개발 환경 및 요구사항 (Prerequisites)

* **Node.js:** v24.16.0 이상 (npm 11.13.0)
* **Database:** SQLite 3

---

## 📂 폴더 구조 요약 (Directory Structure)

```text
project03/
├── .agents/
│   ├── skills/
│   │   └── note/                   # 규칙 및 동기화 관리 에이전트 스킬
│   └── commit_convention.md        # Conventional Commits 규칙 정의 가이드
├── docs/
│   ├── db/
│   │   └── query.sql               # 쿼리 참고용 SQL 파일
│   └── dev/
│       ├── DEPLOYMENT.md           # NCP Micro 서버 전용 상세 배포 및 트러블슈팅 가이드
│       └── CHANGELOG.md            # 변경 상세 릴리즈 노트
├── src/
│   ├── app/                        # Next.js App Router (대시보드 페이지 및 REST API)
│   ├── components/                 # 네이버 지도(Map.tsx), 사이드바, 슬라이딩 상세 패널
│   └── lib/                        # SQLite 데이터베이스 커넥터 모듈 (db.ts)
├── public_housing.db               # 외부 CLI에서 적재 완료되어 복사된 SQLite 데이터베이스
├── package.json                    # Node.js 패키지 및 스크립트 정의
└── tsconfig.json                   # TypeScript 설정 파일
```

---

## 💻 실행 및 사용 방법 (Execution Guide)

### 1. 의존성 패키지 설치
```bash
# Node 종속성 복원
npm install
```

### 2. 외부 DB 파일 준비
* 외부 CLI 데이터 파이프라인에서 빌드가 완료된 `public_housing.db` 파일을 프로젝트 루트 디렉토리에 위치시킵니다.

### 3. Next.js 대시보드 웹 개발 서버 실행
```bash
# 로컬 개발 서버 가동
npm run dev
```
브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하여 지도 및 실시간 아코디언 필터링 대시보드를 확인할 수 있습니다.

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
* **중앙 영역 (Naver Map)**: 단지들의 실제 위치 매핑 및 지오코더 폴백 연동
* **우측 영역 (Sliding Detail Panel)**: 평형별 공급 호수 및 최대 상호 전환 조건(보증금 ↔ 월 임대료) 상세 분석

---

## 📄 형상 관리 및 개발 규약

* **Git 커밋 규칙**: 모든 커밋은 Conventional Commits에 기재된 형태를 따르며, 구체적인 작성 규약은 [.agents/commit_convention.md](file:///home/iru/project03/.agents/commit_convention.md)를 참조하십시오.
* **디자인 토큰 시스템**: 모든 UI 간격 및 색상은 컴포넌트 내에 하드코딩하지 않고 전역 [globals.css](file:///home/iru/project03/src/app/globals.css)의 디자인 토큰 변수에 100% 종속됩니다.
* **에이전트 소통 규약**: AI 에이전트의 행동 및 피드백 누적 규칙에 대한 규정은 [AGENTS.md](file:///home/iru/project03/AGENTS.md) 파일에 명기되어 있습니다.

---

## 📄 라이선스 (License)

본 프로젝트는 [MIT License](file:///home/iru/project03/LICENSE) 하에 오픈소스로 관리 및 활용됩니다. 자세한 사항은 `LICENSE` 파일을 참고하시기 바랍니다.
