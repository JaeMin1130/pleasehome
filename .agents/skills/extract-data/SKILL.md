---
name: extract-data
description: 공고문 원본(document.md)을 분석하여 complexes, units가 완비된 완성형 data.json 생성 및 신규 적재를 수행하거나, 기적재 공고의 정정공고 발생 시 변경 사항을 안전하게 부분 업데이트(Patch)하는 통합 데이터 추출/패치 파이프라인입니다.
---

# Skill: extract-data (통합 공고 데이터 추출 및 정정 패치 파이프라인)

이 스킬은 공고문 원본으로부터 임대 정보(일정, 조건, 단지, 평형 가격)를 정밀 분석하여 Complexes, Units가 모두 채워진 완제품 `data.json`을 빌드하고 검증 후 DB에 신규 적재하거나, 기존에 이미 적재된 공고의 정정공고 발생 시 변경된 사항만을 안전하게 부분 업데이트(Patch)하기 위한 통합 수행 가이드라인입니다.

---

## 1. 작동 원리 및 단계별 수행 지침

### 0단계: 공고 사전 분류 및 신규/정정/패치 분기 판별 (Pre-classification & Routing)

* **동작**: 새로 적재할 대상 공고 디렉토리를 순회하며 `api_meta.json` 또는 폴더명을 읽고 다음 정보를 추출합니다.
  - 대상 공고의 고유 ID인 `pan_id`
  - 정정공고 여부를 가리기 위해 제목(`title`)에서 `[정정]`, `[정정공고]`, `(정정)` 등의 모든 접두사 노이즈를 제거한 **순수 제목 (Clean Title)**
* **DB 대조 및 라우팅 분기**:
  - SQLite DB([public_housing.db](file:///home/iru/app/pleasehome/db-pipeline/public_housing.db))의 `announcements` 테이블에서 기존 적재된 공고들의 `pan_id`(또는 `dtl_url`, `doc_path` 내 식별자) 및 **Clean Title**로 교차 대조를 수행합니다.
  
  ```mermaid
  graph TD
      A[공고 폴더 분석 및 Clean Title 추출] --> B{DB에 원공고 기적재 여부 대조}
      B -->|원공고가 DB에 이미 존재함| C[워크플로우 B: 정정공고 부분 패치 Patch-Correction]
      B -->|DB에 없음 신규 공고 / 미적재 정정공고| D[워크플로우 A: 완성형 data.json 신규 전체 추출 Extract-Data]
      B -->|원공고와 정정공고가 동시 수집됨| E[최신 정정공고 기준으로 단일 1회 워크플로우 A 수행]
  ```

  1. **[분기 A] 기적재 공고의 정정공고 (원공고가 이미 DB에 존재하는 경우)**:
     - 데이터를 전량 삭제 후 재적재하지 않고, **[워크플로우 B: 기적재 공고 정정 부분 업데이트(Patch)]**로 진입합니다.
  2. **[분기 B] 신규 공고 또는 원공고 미적재 정정공고 (DB에 원공고가 없는 경우)**:
     - 정정공고라 할지라도 DB에 과거 원공고가 없다면 변경 사항만 패치할 수 없으므로, 정정된 최신 본문 전체를 기준으로 **[워크플로우 A: 신규 공고 전체 추출 및 일괄 적재]**로 진입합니다.
  3. **[분기 C] 원공고와 정정공고가 이번 배치에 동시에 수집된 경우**:
     - 원공고를 먼저 넣고 다시 패치하는 비효율과 중복 적재를 방지하기 위해, **최종 정정공고를 기준으로 1회만 [워크플로우 A]를 수행**하여 최신 상태로 단일 적재합니다.

---

### [워크플로우 A] 신규 공고 전체 추출 및 일괄 적재 (Full Extraction & Ingestion)

#### 1단계: 원본 분석 및 data.json 빌드
* **동작**: 공고문 원본인 `db-pipeline/docs/md/{공고_폴더}/document.md` 파일을 직접 조회하여 완독합니다.
  - **서브에이전트 위임 허용 (컨텍스트 격리)**: 대용량 공고 처리 시 부모 에이전트의 컨텍스트 누적 및 토큰 낭비를 방지하기 위해, 부모 에이전트의 프롬프트 통제 하에 독립된 서브에이전트(self 등)를 실행하여 `data.json` 생성을 위임할 수 있습니다. 서브에이전트는 DB 적재 스크립트(`insert_loader.py`)를 실행하지 않고, 오직 지정된 공고 폴더 내에 완성형 `data.json`을 올바르게 빌드하는 작업까지만 전담합니다.
  - **개별 독립 실행**: 한 세션에 대량의 공고를 몰아서 처리하지 않고, 개별 폴더 단위로 독립된 세션에서 작업을 완결합니다.
  - **하이브리드 추출 및 다단계 분할(Chain) 추출 전략**:
    - **대용량/복잡 공고** 이 방대하거나 유닛 표가 10줄을 초과하는 경우): 환각을 방지하기 위해 3단계 분할 추출을 진행합니다.
       1. **Step 1**: 메타/일정 정보 추출 (`announcement`, `schedules`) $\rightarrow$ `temp_meta.json`
       2. **Step 2**: 단지/유닛 정보 추출 (`complexes`, `units`, 필요 시 파이썬 파싱 코드 실행) $\rightarrow$ `temp_units.json`
       3. **Step 3**: 상세 조건 서술글 추출 (`details` 6대 카테고리) $\rightarrow$ `temp_details.json`
       4. **Step 4 (병합)**: `python3 .agents/scripts/validate_schema.py db-pipeline/docs/md/{공고_폴더} --merge`
     - **일반 공고**: 완제품 `data.json`을 다이렉트로 원스톱 추출합니다.

#### 2단계: Pydantic 기반 스키마 검증 및 자가 치유(Self-Correction)
* **스키마 검증**: 부모 에이전트는 [validate_schema.py](file:///home/iru/app/pleasehome/.agents/scripts/validate_schema.py)를 실행하여 데이터 유효성을 철저히 검사합니다.
  - 기관명/지역명 정규화, 날짜 포맷 표준화, 상호전환 미지원 시 기본값 복사 등은 스크립트가 자동 후처리(Soft Correction)합니다.
* **자가 치유 피드백 루프**: 필수 필드 누락 등 검증 에러 발생 시, 스크립트의 에러 메시지를 바탕으로 해당 부분만 집중 보정(최대 3회 재시도)합니다.

#### 3단계: 1:1 시맨틱 교차 대조 및 총 공급세대수 감사 (부모 에이전트 전담)
* **총 모집호수 합계 대조 (Total Household Audit)**: 공고문 원본 서두의 총 공급호수(공가 입주자 + 예비 입주자)와 추출된 유닛 데이터의 세대수 합계(`sum(supply_count + reserve_count)`)가 1:1로 100% 일치하는지 전수 수치 대조를 필수 수행합니다.
* **유닛 및 단지 1:1 매핑 감사**: 생성된 `data.json`의 모든 단지(Complexes)와 유닛(Units), 임대조건(보증금/월세), 일정, 자격기준이 원본 `document.md` 본문 정보와 100% 일치하는지 전수 감사(Full-Audit)합니다.

#### 4단계: SQLite DB 일괄 적재
* 검증이 완료되면 부모 에이전트가 직접 [insert_loader.py](file:///home/iru/app/pleasehome/.agents/scripts/insert_loader.py)를 실행하여 `public_housing.db`에 최종 적재 및 좌표 Geocoding을 완료합니다.
  ```bash
  python3 .agents/scripts/insert_loader.py db-pipeline/docs/md/{공고_폴더}/data.json
  ```

---

### [워크플로우 B] 기적재 공고 정정 부분 업데이트 (Patch-Correction Pipeline)

#### 1단계: 메타데이터를 통한 정정사유 분석
* 정정공고 폴더 내의 `api_meta.json` 또는 `download_meta.json`을 열어 LH가 고지한 **정정 사유 텍스트**를 식별합니다.
  - 주로 `dsEtcInfo` 배열 내의 `PAN_DTL_CTS` 또는 `CRC_RSN` 필드에 기재되어 있습니다.
* 정정 사항의 성격(예: 임대조건 변경, 신청 일정 연기, 소득 기준 수정, 추가 옵션 유의사항 등)에 따라 업데이트해야 할 대상 테이블(`announcement_details`, `announcement_schedules`, `units` 등)을 식별합니다.

#### 2단계: 정정공고 본문 분석 및 텍스트 발췌
* 정정공고의 `document.md` 파일에서 정정 사유 관련 키워드를 추적하여, 새롭게 변경되거나 추가된 **원본 텍스트 본문(표, 일정, 설명글 등)**을 정확하게 발췌합니다.

#### 3단계: 업데이트 계획 선보고 및 사용자 승인 획득 (Critical)
* DB를 실제로 갱신하기 전에, 수정이 필요한 대상 테이블, 컬럼, 그리고 반영할 구체적인 정정 텍스트 내용을 요약하여 **사용자에게 먼저 보고하고 최종 실행 승인**을 요청합니다.
* 사용자의 명시적인 승인 지시가 떨어지기 전에는 절대로 실제 데이터베이스 데이터를 갱신(UPDATE/INSERT)하지 않습니다.

#### 4단계: DB 덮어쓰기 업데이트 집행 및 사후 검증
* 사용자 승인 후, 파라미터 바인딩을 적용한 SQL 쿼리 또는 일회성 파이썬 패치 스크립트를 작성하여 데이터베이스를 업데이트합니다.
  - `announcements` 테이블: `title`(접두사를 제거한 Clean Title), `dtl_url`/`dtl_url_mob`(정정공고 URL), `doc_path`(정정공고 최신 마크다운 경로)를 갱신합니다.
  - `announcements.attributes` 컬럼: 정정이력 메타데이터를 JSON 문자열 형태로 누적 기록합니다.
    ```json
    {"correction_count": 1, "corrections": [{"pan_id": "0000061155", "date": "20260814", "reason": "임대조건 및 일정 변경"}]}
    ```
  - 해당 하위 테이블(`announcement_details`, `announcement_schedules`, `units` 등)의 해당 컬럼을 발췌한 최신 데이터로 안전하게 갱신(UPDATE)합니다.
* 업데이트 적용 후 즉시 `SELECT` 쿼리를 실행하여 데이터 정합성을 육안으로 확인합니다.
* **중요**: DB 패치를 위해 작성한 일회성 파이썬 스크립트는 **작업 완료 및 사후 검증 즉시 파일 시스템에서 완전 삭제**합니다.

---

## 2. 최종 출력 JSON 포맷 명세 (Output JSON Specification)

부모 에이전트 및 서브에이전트는 아래의 JSON 구조와 데이터 유형을 100% 무결하게 준수하여 `data.json`을 작성해야 합니다.

```json
{
  "announcement": {
    "title": "Clean announcement title (string, [정정공고] 등 접두사 노이즈 완전 제거)",
    "institution": "LH", // LH, SH, GH, iH, HUG, 민간 중 하나
    "subscription_type": "공공분양", // 공공분양, 매입임대, 영구임대, 국민임대, 행복주택, 장기전세, 민간분양 등
    "region": "경기도", // 17대 행정구역명 중 하나
    "dtl_url": "https://apply.lh.or.kr/... (string or null)", // PC 상세페이지 URL
    "dtl_url_mob": "https://m.apply.lh.or.kr/... (string or null)" // 모바일 상세페이지 URL
  },
  "schedules": [
    {
      "schedule_type": "신청접수 or 서류제출대상자발표 or 서류제출 or 당첨자발표 or 계약체결",
      "raw_text": "Original schedule text snippet",
      "start_date": "YYYY-MM-DD HH:MM:SS (or null)",
      "end_date": "YYYY-MM-DD HH:MM:SS (or null)",
      "notes": "Details or notes"
    }
  ],
  "recruitment_groups": [
    {
      "name": "모집단위/주택군명 (string, 예: 26-6 계양구(뷰온) 또는 단일단지명)",
      "region": "소재 지역 (string or null)",
      "supply_count": "주택군 총 공급호수 (integer)",
      "reserve_count": "주택군 총 모집 예비자수 (integer)",
      "notes": "비고 or null (string)"
    }
  ],
  "complexes": [
    {
      "name": "단지명/블록명 (string)",
      "address": "지번/도로명 상세주소 (string)",
      "recruitment_group": "소속 모집단위(주택군)명 (string, recruitment_groups의 name과 일치 -> DB 적재 시 recruitment_group_id FK로 자동 변환)",
      "heating_type": "지역난방 or 개별난방 or 중앙난방 (string)",
      "has_elevator": "true or false or null (boolean)",
      "parking_info": "parking space details (string or null)",
      "complex_type": "아파트 or 연립주택 or 오피스텔 or 도시형생활주택 (string)"
    }
  ],
  "units": [
    {
      "complex_name": "연계될 단지명 (string, complexes의 name과 일치)",
      "complex_address": "연계될 단지의 주소 (string, complexes의 address와 일치)",
      "room_number": "호실번호 (string, 특정 호수가 지정된 경우에만 기재, 없을 시 null)",
      "room_count": "방 개수 (integer)",
      "room_type": "주택형/타입명 (string, 예: 59A, 59C-2)",
      "supply_type": "공급유형 (string, 예: 일반공급, 청년특별공급 등)",
      "exclusive_area": "전용면적 (float)",
      "contract_area": "계약면적 (float or null)",
      "target_group": "공급대상집단 (string, 예: 청년, 대학생, 신혼부부, 상관없음 등)",
      "income_group": "소득기준구간 (string, 소득 구간별 임대조건이 다를 때 적용, 없을 시 상관없음)",
      "supply_count": "공급세대수 (integer)",
      "reserve_count": "예비입주자 모집수 (integer)",
      "deposit": "보증금 or 분양가격 (integer, 단위: 원)",
      "monthly_rent": "월임대료 (integer, 단위: 원, 없을 시 0)",
      "max_deposit": "최대 전환 가능 보증금 (integer or null)",
      "min_deposit": "최소 전환 가능 보증금 (integer or null)",
      "max_monthly_rent": "최대 전환 시 월임대료 (integer or null)",
      "min_monthly_rent": "최소 전환 시 월임대료 (integer or null)",
      "attributes": "공공분양 잔여세대 공급 or 매입임대주택 공급 등 설명 (string)"
    }
  ],
  "details": [
    {
      "section_title": "Section title (6대 카테고리 중 하나)",
      "section_content": "상세 가이드를 수록한 Markdown (string)",
      "sort_order": "정수 (1 to 6)"
    }
  ]
}
```

---

## 3. 세부 비즈니스 룰 및 제약 조건 (Business Constraints)

1. **시행기관 표준화**:
   * `announcement.institution`은 반드시 `"LH", "SH", "GH", "iH", "HUG", "민간"` 중 하나로 정규화합니다.
2. **지역 표준화**:
   * `announcement.region`은 대한민국 17대 광역지자체 표준명(`서울특별시, 부산광역시, 대구광역시, 인천광역시, 광주광역시, 대전광역시, 울산광역시, 세종특별자치시, 경기도, 강원도, 충청북도, 충청남도, 전북특별자치도, 전라남도, 경상북도, 경상남도, 제주특별자치도`) 중 하나로 정제합니다.
3. **날짜 포맷 정규화**:
   * `schedules[].start_date` 및 `end_date`는 엄격히 `YYYY-MM-DD HH:MM:SS` 포맷으로 변환합니다.
4. **실제 공급 대상의 엄격한 유닛 필터링**:
   * 추가입주자모집(잔여세대 분양) 등 단 1호나 특정 호수만 대상으로 모집하는 경우, 층별 기본 분양가 예시표를 전부 넣지 않고 실제 공급 대상 호수 레코드 1건만 단독 생성합니다.
5. **대용량 및 다세대 주택 목록 처리 규약**:
   * 물리적으로 서로 다른 주소에 위치한 건물은 반드시 **독립된 단지(complex)로 분리**합니다. 시·군 단위 그룹핑은 절대 금지합니다.
6. **주택형(room_type) 및 단지 유형(complex_type) 엄격 분리**:
   * `units[].room_type`에는 오직 평형 및 타입명(예: `'59A'`, `'29형'`)만 기재하고, `'아파트'`, `'오피스텔'`, `'다세대주택'` 등은 상위 `complexes[].complex_type`에 배정합니다.
7. **상호전환 한도 동적 계산 및 비대칭 전환 대응**:
   * 증액만 가능할 경우: `max_deposit`, `min_monthly_rent`를 계산하고, 미지원되는 `min_deposit`, `max_monthly_rent`에는 기본값(`deposit`, `monthly_rent`) 대입.
   * 감액만 가능할 경우: `min_deposit`, `max_monthly_rent`를 계산하고, 미지원되는 `max_deposit`, `min_monthly_rent`에는 기본값 대입.
   * 전환 불가/미기재 시: 4개 필드 모두 기본값(`deposit`, `monthly_rent`)을 그대로 대입.
8. **상태 보존형 마크다운 표 파싱 규약 (Stateful Row Parser Protocol)**:
   * 마크다운 표에서 병합되거나 생략된 공백 셀(`| |`)은 절대로 건너뛰지(continue) 않고, 직전 행(Context)의 유효한 값(자치구, 지구명, 단지명, 평형, 보증금, 임대료, 전용면적 등)을 상태 변수에 기억하여 자동 상속받아 채워야 합니다.
   * `주거약자`, `우선공급`, `다자녀` 등 하위 공급구분 행의 평형/금액 칸이 비어 있더라도 직전 일반공급 행의 임대조건을 그대로 상속하여 전수 추출해야 합니다.
9. **총 공급규모(공가+예비자) 1:1 전수 교차 검증 엄수 ([누적 규칙 #7])**:
   * **아파트 및 단일 청약단위 공고**: 공고문 서두의 총 모집인원과 추출된 `units` 세대수 합계(`sum(supply_count + reserve_count)`)가 단 1세대라도 불일치하면 적재를 즉시 차단합니다.
   * **매입임대 및 다중 주택군 공고**:
     1. 실물 공급호수: `공고문 총 공급호수 == sum(recruitment_groups.supply_count) == sum(units.supply_count)`
     2. 예비자 모집인원: `공고문 총 예비자수 == sum(recruitment_groups.reserve_count)`
     * 위 1:1 전수 교차 검증을 통과하기 전에는 절대로 DB에 적재해서는 안 됩니다.
10. **공급 대상(`target_group`) 및 공급 유형(`supply_type`) 표준 정규화**:
    * `target_group`에는 자의적인 수식어(예: `"일반서민"`)를 붙이지 않고, 표준 규격 명칭(`"청년"`, `"신혼부부"`, `"다자녀"`, `"고령자"`, `"주거약자"`, `"일반"`, `"상관없음"`)으로 엄격 정규화합니다.
    * 공가 입주자(즉시 입주)는 `supply_count`, 예비 입주자(대기자)는 `reserve_count`로 명확히 분리하여 기록합니다.
11. **마크다운 텍스트 표준화 및 수식/엔티티 사용 금지**:
    * 대시보드 마크다운 렌더러 호환을 위해 `$\rightarrow$`, `$\ge$` 등 LaTeX 수식 문법 사용을 전면 금지하며, 반드시 유니코드 표준 기호(`→`, `≥`, `≤`, `~`)를 사용합니다.
    * `<br>`, `&gt;`, `&lt;` 등의 HTML 엔티티 대신 표준 마크다운 개행 및 문자를 사용합니다.
12. **지구 단위 통합 청약 건의 단지 분할/복제 금지**:
    * 공고문에서 지구/단지 묶음 단위로 통합 청약(전산 추첨 배정)하는 건은 개별 아파트 단지로 임의 분할하거나 유닛을 복제하지 않고, `지구명 (단지묶음명)` 기준의 단일 대표 단지로만 등록합니다. (예: `은평1지구 (상림마을 6-1~8-3단지)`)
13. **매입임대 낱개 호실(room_number) 1호/0호 정규화 및 예비자 분리 원칙**:
    * 호실 번호(`room_number`)가 존재하는 물리적 개별 방은 **무조건 `supply_count = 1, reserve_count = 0`**으로 기록합니다.
    * "이 방은 예비자를 뽑는 방이다"라며 `supply_count: 0, reserve_count: 1`을 넣는 안티패턴을 엄격히 금지합니다.
    * 주택군 전체의 예비자 규모(예: 176명)는 개별 방에 쪼개 넣지 않고, 오직 상위 `recruitment_groups[].reserve_count`에만 기록합니다.
14. **단지-주택군 간 외래키(FK) 정규화 연계 규약**:
    * `data.json`의 `complexes[].recruitment_group` 텍스트 명칭은 적재기([insert_loader.py](file:///home/iru/app/pleasehome/.agents/scripts/insert_loader.py))가 실행될 때 DB의 `announcement_recruitment_groups.id` 정수형 PK를 찾아 **`complexes.recruitment_group_id` 외래키(FK)**로 100% 자동 변환하여 영속화합니다.
    * 따라서 `complexes`의 모든 단지는 반드시 자신이 속한 `recruitment_groups`의 `name`과 정확히 일치하는 값을 `"recruitment_group"` 필드에 명시해야 합니다.

---

## 4. 상세 요건(details) 6대 표준 카테고리 및 상세화 필수 수록 규격

`details`는 사용자가 공고문 원본(PDF)을 다시 열어보지 않고도 웹 대시보드 화면만으로 청약의 모든 자격·소득·배점·서류를 완벽히 파악할 수 있도록 **풍부하고 완성도 높은 프리미엄 마크다운 문서**로 작성해야 합니다. **단순 3~4줄의 요약이나 하드코딩 템플릿 사용을 엄격히 금지**하며, 공고문 본문의 세부 수치와 표를 전수 발췌하여 수록해야 합니다.

1. **`'신청 자격 요건'`** (`sort_order: 1`):
   * **기본 요건**: 공고일 기준 거주지역, 성년자 여부, 무주택세대구성원 범위 및 판정 기준.
   * **공급 유형별 세부 자격**: 일반공급뿐 아니라 **주거약자(고령자, 장애인, 국가유공자 등 7대 자격 요건), 신혼부부, 다자녀, 청년 등 공고에 포함된 모든 세부 대상군 자격 기준 전수 명시**.
   * **주택 특화 시설**: 주거약자 편의시설(단차제거, 미닫이문, 스위치 하향, 저층 배정 등) 상세 기재.
   * **신청 제한**: 1세대 1주택 신청 원칙 및 중복신청 무효 규정.

2. **`'소득 및 자산 기준'`** (`sort_order: 2`):
   * **가구원수별 월평균소득 원화 금액표**: 1인부터 6인 이상 가구까지 50%, 70%, 100%, 120% 등 공고에 명시된 **정확한 원화 수치(소득표)를 마크다운 표로 100% 수록 필수**.
   * **출생자녀 가산 요건**: 2023.3.28 이후 출생자녀가 있는 경우 가구원수별 완화 소득표(+10%p, +20%p) 상세 표 수록.
   * **총자산 및 자동차가액 기준**: 합산 대상 자산 및 차감 부채 목록, 개별 자동차 최고가액 산정 방식 및 친환경차 보조금 차감 기준.

3. **`'임대 조건 및 융자 혜택'`** (`sort_order: 3`):
   * **임대 기간 및 거주 한도**: 최초 계약기간 및 2년 단위 재계약 최장 거주기간 (예: 10년, 20년, 30년).
   * **보증금-월세 상호전환 공식/이율**: 증액 시 전환이율(예: 6.7%) 및 최대 한도(60%), 감액 시 전환이율(예: 2.5%) 및 신청 시기.
   * **재계약 및 퇴거 기준**: 소득 초과 비율별 임대료 할증률 표(100%~120%) 및 퇴거 기준.

4. **`'선정 및 배점 기준'`** (`sort_order: 4`):
   * **입주자 선정 순위**: 평형별(50㎡ 미만 vs 이상) 소득순위, 거주지 순위(해당구/연접구), 청약통장 납입회차 순위 단계별 명시.
   * **공식 배점 기준표(가점표) 전수 수록**: 일반공급 가점표(나이, 부양가족, 거주기간, 노부모부양, 미성년자녀, 청약납입횟수, 중소기업/건설근로자 등) 및 **주거약자용 배점표를 마크다운 표로 전수 수록 필수**.
   * **감점 기준 및 동점자 처리 원칙**: 최근 계약 사실에 따른 감점(-3, -5점) 및 다자녀 우선/전산추첨 원칙.

5. **`'신청 방법 및 제출 서류'`** (`sort_order: 5`):
   * **청약 접수 방법**: 인터넷/모바일 청약 URL 및 방문 청약 대상/장소/일정.
   * **공통 구비 서류 목록**: 공고일 이후 발급분 기준, 주민등록번호 13자리 표기 필수 등 발급 주의사항.
   * **자격별 추가 증명서류**: 장애인증명서, 유공자확인원, 수급자/차상위증명서, 임신진단서 등.
   * **서류 제출 기한 및 등기우편 주소**.

6. **`'기관별 특화 및 유의사항'`** (`sort_order: 6`):
   * **매입임대/다중 주택군 특화 규격 필수 수록**:
     - **[주택군별 공급호수 및 모집 예비자수 전수 인원표]**: 공고문 원본의 주택군별 공급호수와 예비자 인원을 마크다운 표로 100% 빠짐없이 수록.
     - **[통합 순번 및 동호 지정 계약 룰 안내]**: 주택군별 통합 순번 발표, 주택 열람 기간, 순번에 따른 희망 주택 지정 계약 체결 방식 상세 명시.
   * **공가 vs 예비입주자 공급 특성**: 즉시 입주 vs 순차 입주, 예비입주자 자격 유효기간(6개월~1년 등), 타 공공임대 당첨 시 기존 예비자 순번 소멸 규정.
   * **단지별/지구별 특이사항**: 타 지자체 행정구역 소재 단지 전입 의무, 지구단위 통합청약 무작위 전산배정 유의사항.
   * **불법 전대/양도 처벌 규정**: 계약 해지, 강제 퇴거 및 3년 이하 징역 또는 3천만원 이하 벌금형 명시.

---

## 5. 적재 및 패치 완료 후 종합 보고 규약

작업 완료 후 다음 특이사항 및 비즈니스 제약사항을 종합 정리하여 보고합니다:
- **프로세스 진행 중 특이사항**: 파싱 장애 해결 내역, 데이터 정합성 보정 이력, 대용량 분할 처리 내역, 정정 패치 적용 내역.
- **공고 본문의 비즈니스적/물리적 제약사항**: 입주자격 완화 여부, 특정 계층 자격 제한, 모듈러 공법/주차타워 등 물리적 여건, 주변 생활환경 유의사항, 난방/에너지원, 현장 접수 등 특이 청약 절차.