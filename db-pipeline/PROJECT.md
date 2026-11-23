# db-pipeline PROJECT.md

이 문서는 **PleaseHome 데이터 수집, 가공, 검증 및 SQLite DB 적재 파이프라인(`db-pipeline`)의 단일 진실 공급원(SSOT)**입니다.

---

## 1. 개요 및 파이프라인 철학

`db-pipeline`은 LH, SH, GH 등 공공기관의 비정형 임대주택 공고(PDF/Excel)와 공공데이터포털 OpenAPI를 수집하고, 1:1 전수 감사를 거쳐 무결한 SQLite DB(`public_housing.db`)로 적재하는 배치 및 검증 시스템입니다.

* **Deterministic First (정형 데이터 우선)**: LH OpenAPI 공급정보(`getLeaseNoticeSplInfo1`)를 최우선 바인딩하여 주택형, 호실, 전용면적, 공급금액을 기계적으로 확정합니다.
* **Stateful Row Parser**: 병합 셀이나 공백이 많은 PDF 표의 레이아웃을 직전 행의 유효값으로 안전하게 상속받아 파싱합니다.
* **하드 게이트(Hard Gate) 검증**: 6대 핵심 테이블 전 컬럼 1:1 대조 전수 검수 통과 증표인 `audit_passed.token`이 발급되지 않으면 DB 적재가 원천 차단됩니다.
* **병렬 추출/감사 및 직렬 적재 (누적 규칙 #10)**: 다건 공고 처리 시 추출(`extract-data`) 및 감사(`audit-data`) 서브에이전트는 공고별로 병렬 가동하되, DB 적재(`insert_loader.py`)는 파일 락 안전을 위해 직렬로 실행합니다.

---

## 2. 디렉토리 구조

```text
db-pipeline/
├── public_housing.db         # 최종 적재된 공고 SQLite3 데이터베이스 (SSOT)
├── user_data.db              # (참고용) 회원/북마크 로컬 스키마
├── docs/pdf/                 # 수집된 공고문 PDF/Excel 및 파이프라인 작업 디렉토리
│   └── {공고_폴더}/
│       ├── raw.pdf           # 원본 공고문 PDF
│       ├── download_meta.json# OpenAPI 공급정보 및 원천 메타데이터
│       ├── data.json         # 추출 완료된 정제 데이터
│       └── audit_passed.token# 독립 전수감사 100% 합격 증표
├── src/
│   ├── lh_notice/            # LH OpenAPI 수집 및 파일 다운로더 (api.py, main.py)
│   ├── sh_notice/            # SH 크롤러
│   └── gh_notice/            # GH 크롤러
├── migrations/               # SQLite 스키마 마이그레이션 스크립트
│   └── complex_redirect_map.json # 단지 ID 병합 301 리다이렉트 맵 (누적 규칙 #11)
└── tests/                    # 파이프라인 무결성 검증 테스트
```

---

## 3. 데이터베이스 스키마 (`public_housing.db`)

* **`announcements`**: 공고 기본 메타데이터 (ID, 기관, 제목, 공고일, 모집유형, 공고 URL 등)
* **`announcement_schedules`**: 청약 접수, 서류 제출, 당첨자 발표 등 생애주기 일정
* **`announcement_details`**: 7대 섹션 상세 정보 (신청자격, 소득/자산 기준 등 온디맨드 fetch 대상)
* **`complexes`**: 공급 단지 목록 및 지오코딩 위경도 좌표, 대표 주소
* **`housing_units`**: 단지별 주택형, 전용면적, 공급/예비 호수, 임대보증금 및 월임대료

---

## 4. 파이프라인 4단계 워크플로우

1. **0단계 (수집 및 판별)**:
   * `./command.sh notice:fetch`로 OpenAPI 및 공고문 다운로드.
   * `python3 .agents/scripts/detect_announcement_type.py`로 신규/정정/재공고 여부 및 기존 `announcements.id` 식별.
2. **1단계 (정밀 추출 - `extract-data`)**:
   * 서브에이전트가 `download_meta.json`의 OpenAPI 정형 데이터를 바탕으로 PDF 표를 정밀 분석하여 완제품 `data.json` 빌드.
3. **2단계 (독립 전수감사 - `audit-data`)**:
   * 독립된 감사 서브에이전트가 6대 테이블 전 컬럼을 원본과 1:1 대조.
   * 100% PASS 시 해당 공고 폴더에 `audit_passed.token` 발급.
4. **3단계 (직렬 적재 및 아카이빙)**:
   * 메인 에이전트가 `audit_passed.token` 물리 확인 후 `python3 .agents/scripts/insert_loader.py {공고폴더}/data.json` 단 1회 실행.
   * 적재 완료 즉시 해당 공고 폴더를 `!old/`로 아카이빙.

---

## 5. 실행 및 테스트 명령어

```bash
# LH 공고 수집 실행 (타임아웃 및 재시도 내장)
./command.sh notice:fetch

# 단일 공고 DB 적재 (토큰 게이트 통과 필수)
python3 .agents/scripts/insert_loader.py db-pipeline/docs/pdf/{공고_폴더}/data.json

# 파이프라인 테스트 실행
pytest db-pipeline/tests
```
