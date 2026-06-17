# Public Housing PDF Parser & Dashboard

공공분양 및 임대주택 입주자 모집공고 PDF 문서를 마크다운으로 깔끔하게 변환하고, 구조화된 데이터를 추출하여 SQLite 데이터베이스에 적재한 뒤, Next.js 기반의 프리미엄 대시보드와 지도를 통해 한눈에 시각화해 주는 웹 애플리케이션 서비스입니다.

---

## 🚀 주요 기능 (Key Features)

1. **PDF to Markdown 자동 변환**
   * 한글과컴퓨터의 `opendataloader-pdf` 엔진을 활용하여, 표와 텍스트 서식이 포함된 PDF 공고문을 고품질 마크다운 및 이미지 리소스로 자동 변환합니다.
2. **에이전트 기반 데이터 추출 및 DB 적재**
   * 복잡한 공고 내용(접수 일정, 자격 요건, 단지 정보, 평형별 세부 조건 등)을 AI 에이전트가 정밀 분석하여 JSON 데이터로 추출하고, 관계형 SQLite DB(`public_housing.db`)에 누수 없이 적재합니다.
3. **프리미엄 대시보드 및 지도 시각화**
   * Next.js App Router와 Slate-Teal 다크 테마 바닐라 CSS를 기반으로 구축되었습니다.
   * Leaflet 지도를 통한 공급 단지 위치 매핑 및 지오코딩 폴백 지원.
   * 아코디언 형태의 모집 자격 요건 조회 및 공급 조건 슬라이딩 패널 제공.

---

## 🛠️ 개발 환경 및 요구사항 (Prerequisites)

* **Python:** 3.10 이상 (가상 환경 `venv` 연동)
* **Java:** JDK 11 이상 (PDF 분석 엔진 구동 필수)
* **Node.js:** v24.16.0 이상 (npm 11.13.0)
* **Database:** SQLite 3

---

## 📂 폴더 구조 요약 (Directory Structure)

```text
project03/
├── .agents/                # AI 에이전트 설정, 스크립트 및 스킬 정의
├── docs/
│   ├── pdf/                # 원본 PDF 저장소
│   └── md/                 # 변환된 Markdown 및 이미지 리소스 저장소
├── src/
│   ├── app/                # Next.js App Router (대시보드 페이지 및 API)
│   ├── components/         # 지도, 사이드바, 상세 패널 등 UI 컴포넌트
│   ├── db/                 # SQLite 테이블 초기화 스크립트
│   └── parser/             # JSON 데이터 파싱 및 관계형 DB 적재/검증 스크립트
├── public_housing.db       # 최종 적재 완료된 SQLite 데이터베이스
├── package.json            # Node.js 종속성 및 스크립트
└── tsconfig.json           # TypeScript 환경 설정
```

---

## 💻 시작 가이드 (Quick Start)

### 1. Python 가상 환경 활성화 및 패키지 설치
```bash
# 가상 환경 활성화 (Linux/macOS)
source venv/bin/activate

# 패키지 설치
pip install opendataloader-pdf
```

### 2. Node.js 패키지 설치 및 개발 서버 구동
```bash
# 종속성 라이브러리 설치
npm install

# Next.js 로컬 개발 서버 실행
npm run dev
```
브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하여 대시보드를 확인할 수 있습니다.

---

## 📄 라이센스 (License)

본 프로젝트는 **[MIT License](file:///home/iru/project03/LICENSE)** 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참고해 주세요.
