---
name: extract-data
description: 마크다운 공고문 문서들을 정밀 슬라이싱하여 서브에이전트로 JSON 정제 데이터를 추출/저장하고, 공통 적재 스크립트를 통해 SQLite DB에 적재 및 이중 로깅을 완결하는 자동화 스킬입니다.
---

# Skill: extract-data

이 스킬은 마크다운 공고문 문서로부터 임대 정보(일정, 조건, 단지, 평형 가격)를 자원 효율적으로 추출하여 정제하고, DB 적재 및 이중 로깅을 자동화하기 위한 에이전트 전용 가이드라인입니다.

---

## 1. 작동 원리 및 수행 지침 (Execution Guidelines)

### 0단계: 7대 특성 감지 및 용도별 파일 전처리 분할 (부모 에이전트)
* **목적**: 대형 주택 목록 상세 테이블로 인한 LLM의 구조 해석 실패 및 토큰 한계 에러 원천 방지.
* **실행 방식**: 부모 에이전트는 [pre_processor.py](file:///home/iru/app/pleasehome/backend/.agents/scripts/pre_processor.py)를 실행하여 7대 기본 특성 플래그를 감지합니다. 이와 동시에, 주택 목록 상세 테이블 영역만 데이터 행을 싹 지워내고 헤더 행만 남긴 LLM 비정형 요약용 소스 `document_llm_source.md` 파일과, 전체 테이블이 평탄화되어 보존된 `document_parser_source.md` 파일을 생성합니다.

### 1단계: 모듈식 프롬프트 조립 및 비정형 뼈대 추출 (서브에이전트)
* **공식 설정 조회 의무**: 부모 에이전트는 서브에이전트(`markdown_sql_parser_v4`)를 가동(`define_subagent`)하기 전, 반드시 프로젝트 내 공식 에이전트 설정 파일인 [.agents/agent/markdown_sql_parser/agent.json](file:///home/iru/app/pleasehome/backend/.agents/agent/markdown_sql_parser/agent.json)을 물리 도구(`view_file`)로 먼저 조회하여 읽어야 합니다.
* **동작 및 호출**: 서브에이전트는 테이블 헤더만 남은 초경량 `document_llm_source.md`를 입력받아 비정형 뼈대 데이터(일정, 공고 정보, 요건)와 함께, 헤더의 컬럼 인덱스 번호를 담은 `table_map` 지도를 생성하여 `data.json`으로 저장합니다. (complexes와 units는 빈 배열 `[]` 상태)

### 2단계: 파이썬 파서의 동적 Complexes 및 Units 병합 (부모 에이전트)
* **동작**: 부모 에이전트는 [hybrid_parser.py](file:///home/iru/app/pleasehome/backend/.agents/scripts/hybrid_parser.py)를 실행하여 공고 폴더 경로를 넘겨줍니다.
* **이중 테이블 맵 조인(Join) 알고리즘**:
  - 공급대상 테이블과 가격조건 테이블이 분리된 공고(예: LH 공공분양 등)의 경우, 서브에이전트로부터 공급 표용 지도(`supply_table_map`)와 가격 표용 지도(`price_table_map`)를 각각 전달받습니다.
  - 파서는 주택 타입(room_type)을 조인 키(Join Key)로 삼아 공급대상 표의 면적/호실 데이터와 가격 표의 금액 데이터를 수학적으로 매치하여 결합(Join) 유닛을 완성합니다.
  - 이와 동시에 마크다운 파싱 시 테이블 시작 부분이나 데이터 행 사이에 출현하는 `<br>` 노이즈를 걷어내는 **라인 정규화 가드** 및 헤더 단어 조우 시 `in_table`을 강제 초기화해주는 **헤더 강제 리셋 트리거**를 가동하여 표 누락 현상을 원천 방어합니다.
  - 병합 완료 후 임시 사용된 `table_map` 객체를 JSON에서 소거(pop)하여 최종 `data.json`으로 덮어씁니다.

### 3단계: 룰 기반 실시간 정합성 물리 검증 및 적재 (부모 에이전트)
* **검증**: [critic_validator.py](file:///home/iru/app/pleasehome/backend/.agents/scripts/critic_validator.py)를 가동하여 병합된 `data.json`의 관계형 외래키 정합성 및 수학적 한도 논리를 룰 기반으로 검증합니다.
* **정상 적재 (SUCCESS)**: 검증 통과 시 [insert_loader.py](file:///home/iru/app/pleasehome/backend/.agents/scripts/insert_loader.py)를 단일 경로 아규먼트로 구동하여 SQLite DB에 적재를 완결합니다.
  ```bash
  python3 .agents/scripts/insert_loader.py docs/md/{기관명}_{PAN_ID}_{PAN_DT}/data.json
  ```
* **안전 격리 적재 (FAIL)**: 파싱 실패 또는 3회 이상 검증 실패 후 복구가 불가능할 때 `insert_loader.py`를 실패 로깅 모드로 돌려 원본 텍스트만 통째로 격리 적재합니다.
  ```bash
  python3 .agents/scripts/insert_loader.py --doc_path docs/md/{기관명}_{PAN_ID}_{PAN_DT}/document.md --status FAIL --error_message "구체적 검증 에러 내용"
  ```

### 4단계: 사후 요약 브리핑 및 자동 루프 반복
* **결과 보고**: 적재가 끝난 직후 **"N번째 공고 적재 완료: (공고 ID, 등록 평형 수, 일정 수)"** 결과를 채팅창에 사후 요약 브리핑하고, 중간 사용자 컨펌 없이 9개 공고 전체를 완료할 때까지 루프를 순차적/자동으로 반복 수행합니다.

---

## 2. 데이터 파싱 및 수집 세부 규약 (Data Parsing & Extraction Rules)

* 데이터 수집, 7-Feature Logic 및 추출 대응 규칙, 대표 지역 표준화, 청약 유형 표준 사전, 단지 유형(complex_type) 추출 및 DB 기본값 규칙 등의 물리적 개발/파싱 규약은 단일 진실 공급원(SSOT)인 [PROJECT.md](file:///home/iru/app/pleasehome/backend/PROJECT.md)의 **'6. 데이터 파싱 및 수집 세부 규약'** 섹션에 완전히 이관되어 통합 관리됩니다.
* 본 스킬을 사용할 때는 반드시 해당 문서의 사양을 엄격히 숙지한 후 준수하여 작업을 수행하십시오.
