# Changelog

이 프로젝트의 모든 중요한 변경 사항은 이 파일에 기록됩니다.
본 프로젝트는 [Conventional Commits](https://www.conventionalcommits.org/) 규약과 [유의적 버전(Semantic Versioning)](https://semver.org/lang/ko/) 규칙을 준수합니다.

---

## [1.1.0] - 2026-06-24
### ⚡ WAS 단독 프로젝트 전환 및 경량화 (CLI 분리)

로컬 데이터 수집/가공 파이프라인(Python 환경 및 의존성)을 외부 CLI로 완전히 분리하고, Next.js WAS 구동에 필요한 핵심 자산만 남기는 경량화 작업을 완결했습니다.

#### 🗑️ 제거된 항목 (Removed)
* **파이썬 가상환경**: `venv/` 디렉토리 제거
* **수집/가공 스크립트 5종**: `.agents/scripts/` 디렉토리 하위의 수집 적재 파이프라인 소스 일체 삭제
* **파서 에이전트 설정**: `.agents/agents/` 디렉토리 하위의 마크다운 SQL 파서 AI 에이전트 설정 제거
* **수집 에이전트 스킬 2종**: `.agents/skills/` 디렉토리 내 `convert-pdf/` 및 `extract-data/` 에이전트 스킬 제거
* **원본 및 중간 산출물 물리 데이터**: `docs/pdf/` (원본 공고 PDF) 및 `docs/md/` (변환 마크다운/JSON) 디렉토리 제거
* **DB 초기화 스크립트**: 외부 완성형 DB 스왑 방식으로 전환됨에 따라 `src/db/db_init.py` 삭제
* **에러 이미지 보관소**: 수집 단계 이슈 스크린샷 이미지 저장소인 `errors/` 디렉토리 삭제

#### 📝 문서 및 설정 수정 (Changed)
* **README.md / PROJECT.md**: 아키텍처 다이어그램 및 개요에서 Local CLI 파트 제거, Python/Java 의존성 가이드라인 삭제 및 구조 최적화
* **AGENTS.md**: 수집 가공 및 비정규 파일 생성 관련 에이전트 규칙(누적 규칙 #23, #27) 완전 제거
* **DEPLOYMENT.md**: 로컬 CLI 빌드/구동 단계를 삭제하고, 외부에서 빌드 완료된 `public_housing.db` 스왑(scp) 배포 방식으로 문서화
* **.gitignore**: 삭제된 Python 가상환경 및 데이터 디렉토리 관련 무시 규칙 정리 및 슬림화

---

## [1.0.0] - 2026-06-23
### 🚀 첫 번째 정식 릴리즈 (PleaseHome v1.0.0)

맞춤형 임대주택 공급 대시보드 서비스 **PleaseHome (플리즈홈)**의 최초 정식 버전입니다. (이하 수집/가공 파이프라인 기능은 v1.1.0에서 외부 CLI로 이관/분리되었습니다.)

#### ✨ 주요 기능 (Added)
* **공고 PDF to Markdown 파이프라인 (이후 CLI 이관)**: LH, SH, GH 등 공공기관의 복잡하고 비정형화된 공고문 PDF를 마크다운 표준으로 변환하는 통합 스크립트 구축 (`convert_pdf_to_md.py`)
* **정밀 전처리 및 검증 (이후 CLI 이관)**: 공고의 7대 핵심 플래그 분석(`pre_processor.py`) 및 데이터 정합성 검증 엔진(`critic_validator.py`) 탑재
* **SQLite 이중 로깅 적재 (이후 CLI 이관)**: 검증 완료된 JSON 데이터를 DB에 적재하며, 실패 시 원본 마크다운을 격리 보존하는 우아한 성능 저하 우회 적재 구현 (`insert_loader.py`)
* **Naver Maps 지도 시각화**: 공급 단지들의 정확한 위/경도 좌표 매핑 및 지오코딩 폴백 지원 (`Map.tsx`)
* **다차원 맞춤 필터링**: 공고 기관별, 공급 대상별(청년, 신혼부부 등), 보증금/임대료 범위 기반 맞춤 탐색 사이드바 구현 (`Sidebar.tsx`)
* **평형별 상세 비교 패널**: 단지 클릭 시 우측에서 슬라이딩하며 등장하여 보증금-월세 상호 전환 임대 조건을 실시간 비교하는 패널 구현 (`DetailPanel.tsx`)

#### 📦 배포 및 인프라 (Deployment)
* **NCP Micro VM 지원**: 1GB RAM 환경에서의 빌드 OOM을 방지하기 위해 가상 메모리(Swap 2GB) 설정 구축
* **rsync/scp 이중 보안 격리 배포**: 데이터베이스(`.db*`)와 접속 비밀키(`.pem`) 서버 유출을 차단하며 소스만 고속 빌드 전송하는 실무 프로세스 수립
* **PM2 무중단 백그라운드 구동**: `pm2 start` 및 `pm2 reload public-housing`을 통한 무중단 롤링 업데이트 체계 구축
* **Nginx 리버스 프록시 및 SSL 설정**: API 과도 호출 차단을 위한 IP당 Rate Limit 잠금 및 HTTPS 암호화 가이드 수립

#### 📄 문서화 (Documentation)
* **실무형 서버 배포 가이드**: 최초 root 임시 비밀번호 복호화부터 `iru` 관리자 위임 계정 생성까지 다루는 가이드 작성 (`docs/dev/DEPLOYMENT.md`)
* **개발자 표준 README/PROJECT 명세**: Shields.io 기술 배지, 3단 UI 레이아웃 명세서, 전역 디자인 토큰 및 에이전트 소통 SSOT 규격 완결
