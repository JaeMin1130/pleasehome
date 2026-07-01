---
name: extract-data
description: 마크다운 공고문 원본(document.md)을 본체 에이전트가 직접 분석하여 complexes, units가 완비된 완성형 data.json과 features.json을 한 방에 생성하고, SQLite DB에 적재하는 파이프라인입니다.
---

# Skill: extract-data

이 스킬은 마크다운 공고문 원본으로부터 임대 정보(일정, 조건, 단지, 평형 가격)를 본체 에이전트(Antigravity)가 직접 분석하여 Complexes, Units가 모두 채워진 완제품 `data.json`과 `features.json`을 빌드하고, 검증 후 DB에 즉시 적재하기 위한 수행 가이드라인입니다.

---

## 1. 작동 원리 및 수행 지침 (Execution Guidelines)

### 1단계: 본체 에이전트(Antigravity)의 document.md 분석 및 data.json, features.json 직접 생성
* **동작**: 부모 에이전트는 공고문 원본인 `docs/md/{공고_폴더}/document.md` 파일을 직접 조회하여 완독합니다.
* **완제품 빌드**: 아래에 상세히 규정된 스키마 사양과 비즈니스 룰을 준수하여, 최종 완성형 `data.json` 및 `features.json`을 작성해 공고 폴더 내에 저장합니다.
  - **`announcement`**: title, institution, subscription_type, region 정보
  - **`schedules`**: 신청접수, 당첨자발표, 서류제출, 계약체결 등 표준화된 일정
  - **`complexes`**: 단지 정보 (주택이 존재하는 경우)
  - **`units`**: 공급 세대수 제약 및 다중 임대 조건(소득 구간별 차등, 순위별 차등 등)을 완벽히 계산 및 필터링하여 실제 공급 대상 평형 조건만을 목록으로 구성
  - **`details`**: 6대 표준 카테고리를 준수하여 상세 자격 요건을 마크다운으로 구성
  - **`limits`**: has_complexes 플래그가 False인 경우에 한해 한도 가이드를 채우고, True인 경우 빈 배열 `[]`로 구성

### 2단계: 룰 기반 실시간 정합성 물리 검증 및 적재 (부모 에이전트)
* **검증**: [critic_validator.py](file:///home/iru/app/pleasehome/backend/.agents/scripts/critic_validator.py)를 가동하여 생성된 완제품 `data.json`과 `features.json`을 매개변수로 주어 정합성을 검증합니다.
* **DB 적재 (SUCCESS)**: 검증을 통과(SUCCESS)하면 [insert_loader.py](file:///home/iru/app/pleasehome/backend/.agents/scripts/insert_loader.py)를 구동하여 SQLite DB에 적재를 완결합니다.
  ```bash
  python3 .agents/scripts/insert_loader.py docs/md/{공고_폴더}/data.json
  ```
* **안전 격리 적재 (FAIL)**: 파싱 실패 또는 3회 이상 검증 실패 시 격리 적재 처리를 수행합니다.

---

## 2. 최종 출력 JSON 포맷 명세 (Output JSON Specification)

### ① data.json 규격
부모 에이전트는 아래의 JSON 구조와 데이터 유형을 100% 무결하게 준수하여 `data.json`을 작성해야 합니다.

```json
{
  "announcement": {
    "title": "Clean announcement title (string)",
    "institution": "LH", // LH, SH, GH, iH, HUG, 민간 중 하나
    "subscription_type": "공공분양", // 공공분양, 매입임대, 영구임대, 국민임대, 행복주택, 장기전세, 민간분양 등
    "region": "경기도" // 17대 행정구역명 중 하나
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
  "limits": [
    {
      "limit_type": "string (e.g., 소득한도, 자산한도)",
      "description": "string (details of limit)",
      "notes": "string (optional)"
    }
  ],
  "complexes": [
    {
      "name": "단지명/블록명 (string)",
      "address": "지번/도로명 상세주소 (string)",
      "heating_type": "지역난방 or 개별난방 or 중앙난방 (string)",
      "has_elevator": "true or false or null (boolean)",
      "parking_info": "parking space details (string or null)",
      "complex_type": "아파트 or 연립주택 or 오피스텔 or 도시형생활주택 (string)"
    }
  ],
  "units": [
    {
      "complex_name": "연계될 단지명 (string, complexes의 name과 일치)",
      "room_number": "호실번호 (string, 특정 호수가 지정된 경우에만 기재, 예: 403호, 없을 시 null)",
      "room_count": "방 개수 (integer)",
      "room_type": "주택형/타입명 (string, 예: 59A, 59C-2)",
      "supply_type": "공급유형 (string, 예: 일반공급, 청년특별공급 등)",
      "exclusive_area": "전용면적 (float)",
      "contract_area": "계약면적 (float or null)",
      "target_group": "공급대상집단 (string, 예: 청년, 대학생, 신혼부부, 상관없음 등)",
      "income_group": "소득기준구간 (string, 소득 구간별 임대조건이 다를 때 적용, 없을 시 상관없음)",
      "supply_count": "공급세대수 (integer)",
      "reserve_count": "예비입주자 모집수 (integer)",
      "deposit": "보증금 or 분양가격 (integer, 단위: 원, 예: 267760000)",
      "monthly_rent": "월임대료 (integer, 단위: 원, 없을 시 0)",
      "max_deposit": "최대 전환 가능 보증금 (integer or null)",
      "min_deposit": "최소 전환 가능 보증금 (integer or null)",
      "max_monthly_rent": "최대 전환 시 월임대료 (integer or null)",
      "min_monthly_rent": "최소 전환 시 월임대료 (integer or null)",
      "attributes": "공공분양 잔여세대 공급 or 매입임대주택 공급 등 특징적인 설명 (string)"
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

### ② features.json 규격
검증기 가동에 필수적인 7대 기본 특성 플래그를 판단하여 아래 구조로 생성해 저장합니다.
```json
{
  "features": {
    "has_complexes": true, // 실물 단지가 존재하는지 여부 (예: '전세임대'는 물리 단지가 부재하므로 False)
    "is_distributed": false, // 상세 주택 내역이 본문이 아닌 외부 링크/첨부파일 등으로 분산되었는지 여부
    "is_income_linked": true, // 소득 분위별 임대조건 차등 조건 존재 여부
    "is_deposit_optional": false, // 기본형 외 보증금 비율 선택 옵션 제공 여부
    "is_reserve_only": false, // 신규 입주가 아닌 예비 입주자 모집 공고 여부
    "has_mutual_conversion": true, // 상호전환 가능 여부
    "has_unstandardized_address": false // 임시 지구 블록명 등 비정형 주소 사용 여부
  }
}
```

---

## 3. 세부 비즈니스 룰 및 제약 조건 (Business Constraints)

1. **시행기관 표준화**:
   - `announcement.institution`은 반드시 `"LH", "SH", "GH", "iH", "HUG", "민간"` 목록 중 하나로 통일합니다. (예: "서울주택도시공사" -> "SH", "한국토지주택공사" -> "LH")
2. **지역 표준화**:
   - `announcement.region`은 반드시 대한민국의 17대 광역지자체 표준명 중 하나로 정제합니다:
     `서울특별시, 부산광역시, 대구광역시, 인천광역시, 광주광역시, 대전광역시, 울산광역시, 세종특별자치시, 경기도, 강원도, 충청북도, 충청남도, 전북특별자치도, 전라남도, 경상북도, 경상남도, 제주특별자치도`
3. **날짜 포맷 정규화**:
   - schedules 배열의 `start_date` 및 `end_date`는 엄격히 `YYYY-MM-DD HH:MM:SS` 포맷으로 변환해야 합니다. 한국어 요일이나 점(`.`) 형태는 날짜 변환기 오류를 유발하므로 완전히 정규화하십시오.
4. **상세 요건 6대 카테고리 명칭 및 정수 순서 매핑**:
   - `details`의 `section_title`은 반드시 다음 6가지 규격 명칭 중 하나여야 하며, 명시된 순서대로 `sort_order`를 배정합니다:
     1) `'신청 자격 요건'` (sort_order: 1)
     2) `'소득 및 자산 기준'` (sort_order: 2)
     3) `'임대 조건 및 융자 혜택'` (sort_order: 3)
     4) `'선정 및 배점 기준'` (sort_order: 4)
     5) `'신청 방법 및 제출 서류'` (sort_order: 5)
     6) `'기관별 특화 및 유의사항'` (sort_order: 6)
   - 각 섹션에 해당하는 내용이 공고문 내에 없을 경우, 생략하지 않고 content를 `"해당 사항 없음"`으로 채우십시오.
5. **실제 공급 대상의 엄격한 유닛 필터링**:
   - 추가입주자모집(잔여세대 분양) 등 단 1호나 특정 호수만 대상으로 모집하는 경우, 층별 기본 분양가 예시표의 무효한 층 레코드를 전부 units에 추가해서는 안 됩니다. 
   - 반드시 실제 공급 대상이 명시된 호수(예: 1704동 403호, 4층 복층)의 전용면적과 정확한 4층 분양가(297,520천원 -> 297,520,000원) 1개 레코드만 `units` 배열에 단독으로 생성해야 합니다.
6. **대용량 및 다세대 주택 목록 처리 규약 (필수)**:
   - 공급 주택 및 세부 조건이 수십~수백 개 이상으로 방대하여 LLM이 `data.json`의 `complexes`와 `units` 배열을 완성형 JSON 텍스트로 직접 출력하기 불가능한 경우, `is_distributed` 플래그로 꼼수를 부려 데이터를 비운 채 적재하면 안 됩니다.
   - 단, 로컬 디렉토리 내에 주택 목록 자료(PDF, 엑셀, 마크다운 등)가 이미 존재하여 판독 가능한 상태라면 `is_distributed`는 `false`로 설정해야 합니다.
   - 이 경우, 마크다운 본문의 테이블 데이터를 정규식 또는 전용 파서 코드를 사용해 파싱하여 **전체 주택/단지 정보가 완비된 완성형 `data.json` 파일을 먼저 생성 및 덮어쓰기(Write)하여 물리적으로 영구 보존**해야 합니다. 이후 이를 `insert_loader.py`를 통해 데이터베이스에 최종 적재함으로써 물리 파일과 데이터베이스 간의 동기화 정합성(SSOT)을 100% 일치시킵니다. 데이터베이스에 직접 일괄 인서트하는 방식은 물리 정제 파일과의 동기화를 저해하고 추후 덮어쓰기 시 데이터 유실을 유발하므로 일절 금지합니다.
   - **중요**: 해당 1회성 커스텀 로더 파이썬 스크립트는 **`data.json` 파일 빌드, DB 적재 완료 및 사후 검증(audit_db.py 가동) 즉시 파일 시스템에서 완전히 삭제**하여 형상 관리를 오염시키지 않아야 합니다.
