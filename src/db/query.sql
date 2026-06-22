-- =====================================================================
-- 공공청약 데이터베이스(public_housing.db) 검증 및 조회용 SQL 쿼리 세트
-- =====================================================================

-- 1. 전체 청약 공고 목록 요약 검증
-- 각 공고의 ID, 공고명, 공급기관, 청약유형이 올바르게 적재되었는지 확인합니다.
SELECT 
    id, 
    title, 
    institution AS '기관', 
    subscription_type AS '청약유형',
    created_at AS '적재일시'
FROM announcements 
ORDER BY id ASC;


-- 2. 공고별 세부 접수 및 발표 일정 검증
-- 서류제출, 당첨자 발표 등 상세 일정이 올바른 날짜 범위로 파싱되었는지 확인합니다.
SELECT 
    a.id AS '공고ID',
    a.subscription_type AS '유형',
    s.schedule_type AS '일정구분',
    s.start_date AS '시작일',
    s.end_date AS '종료일',
    s.raw_text AS '원본텍스트'
FROM announcement_schedules s
JOIN announcements a ON s.announcement_id = a.id
ORDER BY a.id, s.id;


-- 3. 전세임대 지원 한도 정책 검증
-- 전세/든든전세 공고의 대상군별 최대 지원한도 및 이자율 조건이 누락 없이 저장되었는지 봅니다.
SELECT 
    a.id AS '공고ID',
    a.title AS '공고명',
    l.target_group AS '대상군',
    l.max_support_amount AS '지원한도액(원)',
    (l.max_support_amount / 100000000.0) || '억 원' AS '가독한도',
    l.interest_rate AS '이율(%)',
    l.deposit_limit AS '최대보증금한도(원)'
FROM announcement_limits l
JOIN announcements a ON l.announcement_id = a.id;


-- 4. 공고별 연동 단지 및 텍스트 주소 조회
-- 지도 마커 생성을 위한 단지명과 주소 정보가 정상 수집되었는지 확인합니다.
SELECT 
    a.id AS '공고ID',
    a.institution AS '기관',
    c.id AS '단지ID',
    c.name AS '단지명',
    c.address AS '텍스트주소',
    c.heating_type AS '난방방식',
    c.has_elevator AS '엘리베이터(0/1)'
FROM complexes c
JOIN announcements a ON c.announcement_id = a.id
ORDER BY a.id, c.id;


-- 5. 특정 단지의 평형별 공급 정보 및 임대료 조건 조회
-- 특정 단지(예: 마곡)에 해당하는 상세 평수 및 보증금/월세 매핑 정합성을 정밀 검증합니다.
SELECT 
    c.name AS '단지명',
    u.room_type AS '주택형',
    u.supply_type AS '공급구분',
    u.exclusive_area AS '전용면적(㎡)',
    u.target_group AS '공급대상',
    u.supply_count AS '모집호수',
    u.deposit AS '보증금(원)',
    u.monthly_rent AS '월세(원)',
    u.attributes AS '특이사항'
FROM housing_units u
JOIN complexes c ON u.complex_id = c.id
WHERE c.name LIKE '%마곡%'  -- 검증할 단지명 필터
ORDER BY u.exclusive_area ASC;

-- 6. 공고-단지-평형 원스톱 통합 관계 조인 검증
-- 최상위 공고부터 하위 모집 단위까지의 일대다 관계 부모-자식 연결 무결성을 한눈에 전수 검사합니다.
SELECT 
    a.id AS '공고ID',
    a.subscription_type AS '공고유형',
    c.name AS '단지명',
    u.room_type AS '주택형',
    u.supply_type AS '공급구분',
    u.exclusive_area AS '면적(㎡)',
    u.supply_count AS '공급호수',
    u.deposit AS '보증금(원)',
    u.monthly_rent AS '월세(원)'
FROM housing_units u
JOIN complexes c ON u.complex_id = c.id
JOIN announcements a ON u.announcement_id = a.id
ORDER BY a.id, c.id, u.exclusive_area;


-- =====================================================================
-- SQLite 메타데이터 (테이블 목록 및 스키마 구조) 조회용 쿼리
-- =====================================================================

-- 7. 데이터베이스 내 전체 테이블 목록 조회
SELECT *
FROM sqlite_master 
WHERE type='table' AND name NOT LIKE 'sqlite_%'
ORDER BY name;


-- 8. 특정 테이블의 상세 컬럼 스펙 조회 (pragma_table_info)
-- 'announcements', 'complexes', 'housing_units' 등 원하는 테이블명을 넣어 실행합니다.
SELECT 
    cid AS '컬럼ID',
    name AS '컬럼명',
    type AS '데이터타입',
    [notnull] AS 'NotNull여부(1:필수)',
    dflt_value AS '기본값',
    pk AS 'PK여부(1:PK)'
FROM pragma_table_info('announcements');  -- 조회할 테이블명 입력


-- 9. 특정 테이블이 생성된 원천 DDL 스키마문 조회
SELECT sql AS 'DDL_SQL' 
FROM sqlite_master 
WHERE type='table' AND name='announcements';  -- 조회할 테이블명 입력

