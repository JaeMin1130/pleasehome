# PleaseHome (플리즈홈) - 통합 공공임대주택 대시보드 🏠

> 🌐 **실제 서비스 URL**: [https://pleasehome.com](https://pleasehome.com)

[![Kotlin](https://img.shields.io/badge/Kotlin-2.3.21-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white)](https://kotlinlang.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.1.1-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.9-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-3.x-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 1. 프로젝트 개요 및 데모 (Overview & Demo)

### 📌 한 줄 소개 및 핵심 목적
* **한 줄 소개**: **PleaseHome(플리즈홈)**은 LH, SH, GH 등 여러 공공기관에 흩어져 있는 비정형 임대주택 모집 공고를 정밀 수집·분석하여, 지도 기반 대화형 인터페이스로 제공하는 **3-Tier 풀스택 웹 대시보드**입니다.
* **핵심 목적**:
  - **정보 분산 및 비정형 데이터 문제 해결**: 공공기관마다 제각각인 PDF/HWP 공고문 표를 자체 파이프라인(Stateful Row Parser)으로 정밀 추출 및 1:1 전수 수치 대사를 거쳐 무결한 정형 데이터로 통합합니다.
  - **직관적 주거 탐색 경험 제공**: 수백 개 공급 단지의 위치를 네이버 지도 위 마커로 한눈에 파악하고, 단지별 상세 공급 평형, 보증금/월세 조건, 최대 상호전환 모의 계산기를 원클릭으로 제공합니다.
  - **청약 일정 관리 및 개인화 지원**: 공고 접수부터 당첨자 발표까지의 생애주기 D-Day 타임라인과 관심 단지 드래그앤드롭(DnD) 폴더 관리 및 찜/숨김 기능을 제공합니다.

### 🌟 주요 기능 목록 (Key Features)
* 🗺️ **대화형 지도 인터페이스 (Naver Maps SDK)**
  - 수도권 및 전국 공급 단지 위치 마커 시각화 및 클러스터링
  - 단지 카드 호버 ↔ 지도 마커 실시간 양방향 포커싱 및 팝업 안내
* 🔍 **다차원 맞춤 필터링 시스템**
  - 공급 기관(LH / SH / GH), 공급 유형(행복주택, 국민임대, 매입임대, 청년·신혼 등) 멀티 필터
  - 임대보증금 및 월임대료 예산 범위 실시간 슬라이더 필터링
* 📊 **평형별 임대 조건 & 전환보증금 계산기**
  - 평형별 기본 보증금, 월세, 공급/예비 호수 상세 확인
  - 법정 전환 이율을 반영한 **보증금 ↔ 월세 최대 상호전환 모의 계산기** 지원
* ⏱️ **청약 생애주기 타임라인 & D-Day 알림**
  - 공고게시 $\rightarrow$ 서류접수 $\rightarrow$ 서류대상자 발표 $\rightarrow$ 당첨자 발표 $\rightarrow$ 계약 전 과정 시각화
  - 단계별 진행 상태 게이지 바 및 마감 임박 카운트다운 타이머 제공
* 📂 **드래그앤드롭(DnD) 관심 단지 폴더 관리**
  - 관심 단지 카드를 마우스로 드래그하여 맞춤형 폴더(직장 근처, 예산 적합 등)로 분류 및 메모 작성
* ⚡ **원자적 찜 ↔ 숨김 상호 배제 토글**
  - 관심 공고(찜)와 관심 외 공고(숨김) 상태를 백엔드 `@Transactional`로 100% 원자적 상호 배제 관리
* 🌙 **전역 다크모드 (Dark Mode)**
  - 시스템 테마 연동 및 네이버 지도 타일 반전 기반 슬레이트 톤 야간 인터페이스 지원

### 🖼️ 핵심 화면 스크린샷 또는 GIF 데모

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      PleaseHome Dashboard Header                       │
├──────────────────────────┬─────────────────────────────────────────────┤
│                          │                                             │
│  [🔍 검색 & 다차원 필터] │             [ 🗺️ Naver Map ]                │
│  - 기관: LH / SH / GH    │  - 공급 단지별 위치 마커 및 클러스터        │
│  - 유형: 행복 / 국민 / … │  - 마커 클릭 시 요약 팝업 연동              │
│  - 보증금 / 월세 슬라이더│                                             │
│                          │                                             │
│  [📋 모집 공고 목록]     │                                             │
│  - 실시간 D-Day 타임라인 │                                             │
│  - 찜(❤️) / 숨김(🚫)     │                                             │
├──────────────────────────┴─────────────────────────────────────────────┤
│  [📊 우측 슬라이딩 상세 패널 (Detail Panel)]                           │
│  - 평형별 상세 조건 & 보증금 ↔ 월세 상호전환 모의 계산기               │
│  - 과거 동일 단지 공급 이력 타임라인                                   │
└────────────────────────────────────────────────────────────────────────┘
```

> **데모 화면 미리보기**
> 
> ![PleaseHome 메인 대시보드 화면](image.png)
> *(실제 서비스 접속: [https://pleasehome.com](https://pleasehome.com))*

---

## 2. 기술 스택 (Tech Stack)

### 🛠️ 프론트엔드 / 백엔드 / 데이터베이스 / 배포 환경

| 계층 (Layer) | 기술 스택 | 설명 및 핵심 역할 |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 16, React 19, TypeScript, TailwindCSS v4** | App Router 기반 SSR/ISR 검색엔진 최적화, 반응형 UI, Naver Maps 대화형 지도 연동 |
| **Backend** | **Kotlin, Spring Boot 4.x (3.x 호환), Spring Data JPA** | 23개 규격 RESTful API 코어 서버, `@Transactional` 비즈니스 무결성, Caffeine 캐싱 |
| **Database** | **SQLite 3.x (Dual DataSource 물리 분리)** | `public_housing.db`(공고 원장, Read-Only) + `user_data.db`(회원/트랜잭션, Read-Write) |
| **Data Pipeline** | **Python 3.12, BeautifulSoup, Stateful Row Parser** | LH/SH/GH OpenAPI 수집, PDF 표 파싱 및 전수 수치 교차 검증, 네이버 지오코딩 |
| **Infra & Deploy** | **Nginx, PM2, Linux (Ubuntu), GitHub Actions** | Nginx 리버스 프록시(`/api/*` 다이렉트 바이패스), SSL/TLS 종단, PM2 무중단 프로세스 관리 |

### 📦 주요 라이브러리 및 런타임 버전

| 도메인 | 소프트웨어 / 라이브러리 | 버전 | 용도 |
| :--- | :--- | :--- | :--- |
| **Runtime** | Java (OpenJDK) | 17+ | 백엔드 실행 런타임 |
| | Node.js / npm | v20.x+ / v10+ | 프론트엔드 빌드 및 런타임 |
| | Python | 3.12.x+ | 데이터 파이프라인 가동 런타임 |
| **Backend** | Kotlin | 2.3.21 | 코어 백엔드 프로그래밍 언어 |
| | Spring Boot | 4.1.1 | 엔터프라이즈 백엔드 프레임워크 |
| | SQLite JDBC | 3.47.1.0 | 경량 RDBMS 영속 계층 드라이버 |
| | Caffeine Cache | 3.x | 인메모리 로컬 캐시 (상한 1000건, OOM 방지) |
| | Spring Security Crypto | 6.x | 사용자 비밀번호 BCrypt 단방향 암호화 |
| **Frontend** | Next.js | 16.2.9 | App Router 프레임워크 (Standalone) |
| | React / React DOM | 19.2.4 | UI 컴포넌트 렌더링 라이브러리 |
| | TailwindCSS | 4.x | 유틸리티 퍼스트 CSS 스타일링 |
| | Vitest | 5.0.1 | 프론트엔드 단위/통합 테스트 프레임워크 |

---

## 3. 시작하기 (Getting Started)

### 📋 사전 요구사항 (Prerequisites)
프로젝트 실행을 위해 다음 런타임 환경이 설치되어 있어야 합니다:
* **Java**: OpenJDK 17 이상
* **Node.js**: v20.x 이상 (npm v10 이상)
* **Python**: v3.12.x 이상
* **SQLite**: SQLite 3.x 이상

### ⚙️ 환경 변수 설정 (.env.example)
프로젝트 루트 또는 `web/` 디렉터리에 환경 변수 파일(`.env.local`)을 설정합니다.

```bash
# 환경 설정 템플릿 복사
cp .env.example web/.env.local
```

`.env.example` 구성 내용:
```env
# [Web] Naver Map API - Client ID (네이버 클라우드 플랫폼에서 발급)
NEXT_PUBLIC_NAVER_CLIENT_ID=your_naver_map_client_id

# [db-pipeline] LH OpenAPI - 공공데이터포털 디코딩 키 (공고 수집 시 필요)
LH_NOTICE_LIST_API_KEY=your_lh_list_decoded_api_key
LH_NOTICE_DTL_API_KEY=your_lh_detail_decoded_api_key
```

### 🚀 설치 및 실행 명령어 (Installation & Run)
PleaseHome은 통합 제어 스크립트([`command.sh`](file:///home/iru/app/pleasehome/command.sh))를 통해 손쉽게 서버를 가동하고 테스트할 수 있습니다.

#### 1. 백엔드 (Spring Boot) 실행
```bash
# command.sh 스크립트 실행 권한 부여 (최초 1회)
chmod +x command.sh

# Spring Boot 백엔드 서버 기동 (포트 8080)
./command.sh backend:run

# 또는 Gradle 직접 실행
cd backend && ./gradlew bootRun
```

#### 2. 프론트엔드 (Next.js) 실행
```bash
# 의존성 패키지 설치
cd web && npm install && cd ..

# Next.js 프론트엔드 개발 서버 기동 (포트 3000)
./command.sh web:run

# 또는 npm 직접 실행
cd web && npm run dev
```
> 서버 가동 후 브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속합니다.

#### 3. 테스트 및 빌드 명령어
```bash
# 백엔드 전체 REST API & 트랜잭션 통합 테스트 실행
./command.sh backend:test

# 프론트엔드 단위 테스트 실행
cd web && npm run test

# 백엔드 JAR 패키징 빌드
./command.sh backend:build

# 프론트엔드 프로덕션 빌드
./command.sh web:build
```

#### 4. 실서버 무중단 통합 배포 (Deploy)
```bash
# DB 스냅샷 무결성 검사 + 백엔드 + 프론트엔드 원클릭 전체 배포
./command.sh deploy
```

---

## 4. API 명세 (API Endpoints)

Spring Boot 코어 백엔드 서버(`backend/`)에서 서빙하는 23개 RESTful API 전체 명세입니다. Nginx 리버스 프록시를 통해 `/api/*` 경로로 다이렉트 라우팅됩니다.

### 📋 핵심 API 요약 테이블

| 도메인 (Domain) | Method | Path | 설명 및 비즈니스 로직 | 인증/권한 |
| :--- | :---: | :--- | :--- | :---: |
| **공고 (Announcements)** | `GET` | `/api/announcements` | 전체 모집 공고 목록 및 연관 일정/조건 조회 | Public |
| | `GET` | `/api/announcements/{id}` | 특정 공고 단건 조회 | Public |
| | `GET` | `/api/announcements/{id}/details` | 공고 상세, 일정, 조건, 소속 단지 및 평형 종합 번들 (SSR 최적화) | Public |
| **단지 (Complexes)** | `GET` | `/api/complexes` | 전체 또는 공고별 소속 단지 목록 조회 (`?announcement_id=`) | Public |
| | `GET` | `/api/complexes/{id}` | 특정 단지 단건 조회 | Public |
| | `GET` | `/api/complexes/{id}/details` | 단지 상세, 소속 평형 목록 및 동일 단지 과거 공고 이력 번들 | Public |
| **평형 & 사이트맵** | `GET` | `/api/housing-units` | 주택 평형별 공급호수/보증금/임대료 조회 (`?complex_id=`, `?announcement_id=`) | Public |
| | `GET` | `/api/sitemap/paths` | 검색엔진(SEO)용 전체 공고 및 단지 ID 경로 목록 조회 | Public |
| **인증 (Auth)** | `POST` | `/api/auth/register` | 신규 회원가입 (BCrypt 단방향 암호화, 세션 쿠키 발급) | Public |
| | `POST` | `/api/auth/login` | 로그인 인증 (세션 쿠키 `pleasehome_session` 발급, readOnly 트랜잭션 격리) | Public |
| | `POST` | `/api/auth/logout` | 로그아웃 (세션 쿠키 즉시 만료) | Public |
| | `GET` | `/api/auth/me` | 현재 세션 사용자 정보 조회 | Member |
| | `PATCH` | `/api/auth/update` | 비밀번호 및 보안 질문/답변 변경 | Member |
| | `GET` | `/api/auth/find-account` | 계정 찾기용 보안 질문 조회 (`?id=`) | Public |
| | `POST` | `/api/auth/find-account` | 보안 답변 검증 및 비밀번호 재설정 | Public |
| **사용자 인터랙션** | `GET` | `/api/member/favorites` | 회원의 찜한 공고 ID 목록 조회 | Member |
| | `POST` | `/api/member/favorites` | 공고 찜 등록 (**숨김 상태 자동 원자적 삭제** - `@Transactional` 상호 배제) | Member |
| | `DELETE` | `/api/member/favorites` | 공고 찜 해제 | Member |
| | `GET` | `/api/member/hidden-anns` | 회원의 숨김 공고 ID 목록 조회 | Member |
| | `POST` | `/api/member/hidden-anns` | 공고 숨김 등록 (**찜 상태 자동 원자적 삭제** - `@Transactional` 상호 배제) | Member |
| | `DELETE` | `/api/member/hidden-anns/{id}` | 공고 숨김 해제 | Member |
| **북마크 (Bookmarks)** | `GET` | `/api/member/bookmark-folders` | 회원의 북마크 맞춤 폴더 목록 조회 | Member |
| | `POST` | `/api/member/bookmark-folders` | 북마크 폴더 생성 및 이름/색상 수정 | Member |
| | `DELETE` | `/api/member/bookmark-folders/{id}` | 북마크 폴더 삭제 (**하위 북마크 아이템 동반 Cascade 삭제**) | Member |
| | `GET` | `/api/member/bookmark-items` | 회원이 저장한 단지 북마크 목록 조회 | Member |
| | `POST` | `/api/member/bookmark-items` | 단지 북마크 저장 및 폴더 이동/메모 수정 | Member |
| | `DELETE` | `/api/member/bookmark-items/{id}` | 단지 북마크 삭제 | Member |

### 🔗 상세 API 및 아키텍처 문서 링크
* 📐 **[서비스 아키텍처 명세서 (ARCHITECTURE.md)](docs/dev/ARCHITECTURE.md)**: 3-Tier 시스템 아키텍처 다이어그램, Nginx 프록시 흐름도 및 23개 REST API 세부 Request/Response 스펙
* 📊 **[도메인 모델 명세서 (DOMAIN_MODEL.md)](docs/dev/DOMAIN_MODEL.md)**: ER 다이어그램 및 엔티티-테이블 간 1:1 매핑 스키마
* ⚖️ **[설계 의사결정 기록 (DECISION.md)](docs/dev/DECISION.md)**: Kotlin/Spring Boot 전환(ADR #11), Dual DB 분리(ADR #2), 상호 배제 트랜잭션(ADR #1), N+1 쿼리 최적화(ADR #5) 등 주요 ADR
* 🚨 **[트러블슈팅 및 장애 해결 기록 (TROUBLESHOOTING.md)](docs/dev/TROUBLESHOOTING.md)**: SQLite 파일 락(`SQLITE_BUSY`) 방어, 저사양(1GB RAM) 인스턴스 JVM 메모리 튜닝, Next.js 캐스케이딩 fetch 폭풍 차단 내역

---

## 5. 프로젝트 구조 (Project Structure)

### 📂 핵심 디렉터리 트리 및 역할 설명

```text
pleasehome/
├── backend/                        # 코어 백엔드 서버 (Kotlin + Spring Boot 4.x)
│   ├── src/main/kotlin/com/pleasehome/
│   │   ├── config/                 # Housing / Member 독립 Dual DataSource, Security, Cache 설정
│   │   ├── housing/                # 공고/단지/평형/사이트맵 도메인 (엔티티, JPA 리포지토리, 서비스, 컨트롤러)
│   │   └── member/                 # 회원/인증/찜/숨김/북마크 도메인 (@Transactional 상호 배제 로직)
│   ├── src/test/kotlin/            # Spring Boot REST API & 트랜잭션 통합 테스트 슈트
│   └── build.gradle.kts            # Gradle 빌드 스크립트 및 의존성 정의
│
├── web/                            # 웹 프론트엔드 대시보드 (Next.js 16 + React 19)
│   ├── src/app/                    # App Router 기반 페이지 (SSR/ISR 정적 최적화 및 메타데이터 SEO)
│   ├── src/components/             # 네이버 지도 SDK 연동 마커, 필터 바, 카드 목록, 북마크 DnD UI
│   ├── src/lib/api.ts              # Spring Boot REST API 백엔드 통신 클라이언트 모듈
│   ├── public/                     # 서비스 정적 자원 및 PWA Service Worker
│   └── package.json                # React 19, TailwindCSS v4, Vitest 의존성
│
├── db-pipeline/                    # 데이터 수집 및 정제 파이프라인 (Python 3.12)
│   ├── src/lh_notice/              # LH/SH/GH OpenAPI 수집 및 공고문 원본(PDF/Excel) 다운로더
│   ├── scripts/                    # 네이버 지오코딩(좌표 복구) 및 마이그레이션 유틸리티
│   ├── public_housing.db           # 검증 완료된 공공임대 공고/단지/평형 SQLite3 원장 DB (Read-Only)
│   └── user_data.db                # 실서버 독립 회원/인증/북마크 SQLite3 DB (Read-Write)
│
├── docs/                           # 프로젝트 공식 기술 및 설계 문서 (SSOT)
│   ├── dev/ARCHITECTURE.md         # 3-Tier 시스템 아키텍처 및 23개 REST API 상세 명세
│   ├── dev/DECISION.md             # 주요 기술 선택 및 아키텍처 의사결정 기록 (ADR)
│   ├── dev/TROUBLESHOOTING.md      # 동시성 락, N+1 쿼리, JVM 메모리 최적화 등 해결 기록
│   └── dev/DOMAIN_MODEL.md         # 데이터베이스 엔티티 스키마 및 도메인 다이어그램
│
├── command.sh                      # 로컬 실행, 테스트, 빌드, 지오코딩, 무중단 배포 통합 제어 스크립트
├── .env.example                    # 네이버 지도 Client ID 및 공공데이터 API 키 환경 변수 예시 템플릿
└── README.md                       # 프로젝트 포트폴리오 메인 문서
```

---

## 📜 라이선스 (License)

본 프로젝트는 [MIT License](LICENSE) 하에 배포 및 관리됩니다.
