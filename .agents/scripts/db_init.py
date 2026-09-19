#!/usr/bin/env python3
import os
import sqlite3

def init_db():
    # src/db/db_init.py 기준 3단계 상위가 프로젝트 루트입니다. (절대 경로 하드코딩 방지 - 누적 규칙 #3)
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # 환경변수 또는 db-pipeline 디렉토리를 통해 DB 경로 동적 결정 (누적 규칙 #3)
    env_path = os.getenv("PUBLIC_HOUSING_DB_PATH")
    if env_path:
        db_path = os.path.abspath(os.path.expanduser(env_path))
    else:
        db_path = os.path.join(base_dir, "db-pipeline", "public_housing.db")
    
    print(f"데이터베이스 생성 대상 경로: {db_path}")
    
    # 디렉토리가 없으면 생성 (안전을 위한 처리)
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 외래 키 제약 조건 활성화
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    ddl_queries = [
        """
        -- [1] announcements: 공고 기본 정보 테이블
        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT, -- 공고 ID (고유 식별자)
            title VARCHAR(255) NOT NULL,          -- 공고 제목 (예: '2026년 1차 행복주택 입주자 모집공고')
            institution VARCHAR(50) NOT NULL,     -- 시행 기관 (예: 'LH', 'SH', 'HUG')
            subscription_type VARCHAR(50) NOT NULL, -- 청약 유형 (예: '행복주택', '장기전세', '전세임대')
            region VARCHAR(50),                   -- 대표 행정 구역명 (17개 고정 지역명)
            doc_path VARCHAR(255) NOT NULL,       -- 변환된 마크다운 및 리소스가 위치한 폴더 상대 경로
            attributes TEXT,                      -- 비정형 추가 공고 공통 속성
            dtl_url TEXT,                         -- PC 버전 공고상세 URL
            dtl_url_mob TEXT,                     -- 모바일 버전 공고상세 URL
            source_key VARCHAR(100),               -- 안정 비즈니스 키 "{institution}:{PAN_ID}" (docs/dev/DOMAIN_MODEL.md 3.1, 기관별 채번 방식이 전역 유일을 보장 못해 NULL 허용)
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 레코드 생성 일시
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- 레코드 최종 수정 일시
        );
        """,
        """
        -- [2] announcement_schedules: 공고 청약 일정 테이블
        CREATE TABLE IF NOT EXISTS announcement_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT, -- 일정 ID (고유 식별자)
            announcement_id INTEGER NOT NULL,     -- 소속 공고 ID (announcements.id 외래키)
            schedule_type VARCHAR(50) NOT NULL,   -- 일정 구분 (예: '청약신청접수', '서류심사대상자발표', '당첨자발표', '계약체결')
            start_date DATETIME,                  -- 일정 시작 일시
            end_date DATETIME,                    -- 일정 종료 일시
            raw_text VARCHAR(255),                -- 가공 전 원본 텍스트 일정 정보
            notes TEXT,                           -- 일정 관련 비고 및 예외사항 설명
            FOREIGN KEY (announcement_id) REFERENCES announcements (id) ON DELETE CASCADE
        );
        """,
        """
        -- [3] announcement_details: 공고 세부 안내 요약 테이블 (아코디언 노출용)
        CREATE TABLE IF NOT EXISTS announcement_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT, -- 상세 내용 ID (고유 식별자)
            announcement_id INTEGER NOT NULL,     -- 소속 공고 ID (announcements.id 외래키)
            section_title VARCHAR(100) NOT NULL,  -- 섹션 제목 (예: '신청자격', '소득 및 자산 기준', '신청서류')
            section_content TEXT NOT NULL,        -- 해당 섹션의 마크다운 상세 텍스트 내용
            sort_order INTEGER DEFAULT 0,         -- 메뉴 출력 및 정렬 순서 번호
            FOREIGN KEY (announcement_id) REFERENCES announcements (id) ON DELETE CASCADE
        );
        """,
        """
        -- [3-1] announcement_recruitment_groups: 신청단위(모집단위) 테이블
        -- 주의: 이 테이블은 이전까지 db_init.py에서 누락되어 있었음(스키마 드리프트) --
        -- insert_loader.py는 처음부터 이 테이블에 의존해왔고, 실제 운영 DB엔 존재했으나
        -- db_init.py로 새 환경을 만들면 여기서 즉시 깨졌음. 실제 운영 스키마 기준으로 반영함.
        CREATE TABLE IF NOT EXISTS announcement_recruitment_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT, -- 신청단위 ID (고유 식별자)
            announcement_id INTEGER NOT NULL,     -- 소속 공고 ID (announcements.id 외래키)
            name TEXT NOT NULL,                   -- 신청단위(모집단위) 명칭
            region TEXT,                          -- 신청단위 소속 지역
            supply_count INTEGER NOT NULL DEFAULT 0, -- 이 신청단위의 총 공급호수
            reserve_count INTEGER NOT NULL DEFAULT 0, -- 이 신청단위의 총 예비자 모집인원
            notes TEXT,                           -- 비고
            FOREIGN KEY (announcement_id) REFERENCES announcements (id) ON DELETE CASCADE
        );
        """,
        """
        -- [4] complexes: 단지(건물) 정보 테이블 -- 전역 엔티티 (docs/dev/DOMAIN_MODEL.md 3.3).
        -- 여러 공고/신청단위에 걸쳐 재사용되며, 어느 공고에도 "소유"되지 않음.
        CREATE TABLE IF NOT EXISTS complexes (
            id INTEGER PRIMARY KEY AUTOINCREMENT, -- 단지 ID (고유 식별자)
            announcement_id INTEGER,              -- 최초 발견 공고 참고용 메타 (소유 관계 아님, announcements.id)
            name VARCHAR(150) NOT NULL,           -- 단지/건물명 (예: '정릉 하늘마루', '개포라프레앙')
            address VARCHAR(255) NOT NULL,        -- 주택 지번/도로명 주소 (클라이언트 단에서 Geocoding에 사용)
            normalized_address VARCHAR(255),      -- 전역 중복 매칭용 정규화 주소 (단지명 접미사/공백 제거)
            heating_type VARCHAR(50),             -- 난방 방식 (예: '개별난방', '지역난방', '중앙난방')
            has_elevator BOOLEAN,                 -- 승강기(엘리베이터) 설치 여부 (1: 설치, 0: 미설치)
            parking_info VARCHAR(100),            -- 주차 구획 수 및 가능 여부 정보
            complex_type VARCHAR(50),             -- 단지 유형 (예: '아파트', '오피스텔', '다가구주택')
            attributes TEXT,                      -- 비정형 추가 단지 속성
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 레코드 생성 일시
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 레코드 최종 수정 일시
            latitude REAL,                                  -- 단지의 위도 좌표
            longitude REAL,                                 -- 단지의 경도 좌표
            is_imprecise INTEGER DEFAULT 0,                 -- 위치 좌표 부정확성 여부 플래그 (1: 부정확, 0: 정확)
            -- CASCADE 아님: 단지는 전역이라 다른 공고의 housing_units가 계속 참조할 수 있음
            FOREIGN KEY (announcement_id) REFERENCES announcements (id) ON DELETE SET NULL
        );
        """,
        """
        -- [5] housing_units: 단지별/평형별 세부 주택 공급 조건 및 가격 테이블
        CREATE TABLE IF NOT EXISTS housing_units (
            id INTEGER PRIMARY KEY AUTOINCREMENT, -- 모집 조건 ID (고유 식별자)
            announcement_id INTEGER NOT NULL,     -- 소속 공고 ID (announcements.id 외래키)
            complex_id INTEGER,                   -- 소속 단지 ID (complexes.id 외래키, 단지가 없을 시 NULL)
            recruitment_group_id INTEGER,         -- 소속 신청단위 ID (announcement_recruitment_groups.id, docs/dev/DOMAIN_MODEL.md 3.4 -- 단지가 아니라 여기서 관리, 한 단지가 여러 신청단위에 걸칠 수 있음)
            room_number VARCHAR(50),              -- 동/호수 정보 (특정 호실 공급 시 기록)
            room_count INTEGER,                   -- 방 개수
            room_type VARCHAR(100),               -- 주택형 (예: '39형', '59형')
            supply_type VARCHAR(100),             -- 공급 구분 원문 (예: '우선공급', '일반공급', '특별공급') -- 하위호환 표시용, 아래 분해 컬럼이 정규화된 값
            exclusive_area REAL NOT NULL,         -- 전용면적 (제곱미터 단위, REAL)
            contract_area REAL,                   -- 계약면적 (제곱미터 단위, REAL)
            target_group VARCHAR(100),            -- 세부 공급 대상군 원문 (예: '대학생', '청년', '신혼부부', '고령자') -- 압축형 문자열일 수 있음, housing_unit_target_tags 참고
            income_group VARCHAR(50),             -- 소득/순위/임대조건 원문 (예: '50% 이하', '1순위 (시중시세 30%)') -- 아래 분해 컬럼이 정규화된 값
            housing_product_type VARCHAR(50),     -- 주택상품유형 (행복주택/국민임대/매입임대/든든전세/장기전세/영구임대/공공분양 등, supply_type에서 분해)
            allocation_method VARCHAR(20),        -- 배정방식 (일반공급/우선공급/특별공급, supply_type에서 분해)
            priority_rank VARCHAR(20),            -- 입주순위 (1순위~4순위, 가군/나군 매핑 포함, income_group에서 분해)
            rent_price_tier INTEGER,              -- 임대조건 시중시세 대비 % (예: 30, 40, income_group에서 분해)
            income_threshold_pct INTEGER,         -- 실제 소득기준 % (income_group에서 분해)
            income_threshold_condition VARCHAR(100), -- 소득기준의 조건축 (예: 건설형/매입형, 홑벌이/맞벌이 -- 공고마다 축이 다름)
            sale_price REAL,                      -- 분양가 (nullable, 공공분양/분양전환 전용, 그 외엔 NULL)
            supply_count INTEGER DEFAULT 0,       -- 공급 예정 모집 호수
            reserve_count INTEGER DEFAULT 0,      -- 예비 입주자 모집 호수
            deposit BIGINT NOT NULL,              -- 기본 임대 보증금 (원 단위)
            monthly_rent BIGINT DEFAULT 0,        -- 기본 월 임대료 (원 단위, 전세형인 경우 0)
            max_deposit BIGINT,                   -- 최대 전환 가능 임대보증금 (원 단위)
            min_deposit BIGINT,                   -- 최소 전환 가능 임대보증금 (원 단위)
            max_monthly_rent BIGINT,              -- 보증금 감액 시 최대 월 임대료 (원 단위)
            min_monthly_rent BIGINT,              -- 보증금 증액 시 최소 월 임대료 (원 단위)
            attributes TEXT,                      -- 기타 세부 주택 특이사항 속성 (JSON 또는 텍스트)
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 레코드 생성 일시
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 레코드 최종 수정 일시
            FOREIGN KEY (announcement_id) REFERENCES announcements (id) ON DELETE CASCADE,
            FOREIGN KEY (complex_id) REFERENCES complexes (id) ON DELETE CASCADE,
            FOREIGN KEY (recruitment_group_id) REFERENCES announcement_recruitment_groups (id) ON DELETE SET NULL
        );
        """,
        """
        -- [5-1] housing_unit_target_tags: 자격 태그 다대다 테이블 (docs/dev/DOMAIN_MODEL.md 3.5)
        -- target_group의 압축 문자열("신혼부부, 예비신혼부부, 한부모가족" 등)을 분해한 개별 태그
        CREATE TABLE IF NOT EXISTS housing_unit_target_tags (
            housing_unit_id INTEGER NOT NULL, -- housing_units.id 외래키
            tag VARCHAR(50) NOT NULL,         -- 자격 태그 (예: 청년/신혼부부/신생아가구/한부모가족/다자녀/고령자/주거약자)
            PRIMARY KEY (housing_unit_id, tag),
            FOREIGN KEY (housing_unit_id) REFERENCES housing_units (id) ON DELETE CASCADE
        );
        """,
        """
        -- [6] data_load_logs: 데이터 적재 이력 로그 테이블
        CREATE TABLE IF NOT EXISTS data_load_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, -- 로그 ID (고유 식별자)
            announcement_id INTEGER,              -- 적재 대상 공고 ID
            status VARCHAR(20) NOT NULL,          -- 적재 상태 (예: 'SUCCESS', 'FAIL')
            parsed_rows_count INTEGER DEFAULT 0,  -- 적재 완료한 평형별(housing_units) 레코드 수
            error_message TEXT,                   -- 적재 실패 시 에러 메시지
            loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 적재 실행 시점 일시
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_schedules_announcement ON announcement_schedules (announcement_id);",
        "CREATE INDEX IF NOT EXISTS idx_details_announcement ON announcement_details (announcement_id);",
        "CREATE INDEX IF NOT EXISTS idx_complexes_announcement ON complexes (announcement_id);",
        "CREATE INDEX IF NOT EXISTS idx_recruitment_groups_ann_id ON announcement_recruitment_groups (announcement_id);",
        "CREATE INDEX IF NOT EXISTS idx_units_lookup ON housing_units (complex_id, announcement_id);",
        "CREATE INDEX IF NOT EXISTS idx_units_recruitment_group ON housing_units (recruitment_group_id);",
        "CREATE INDEX IF NOT EXISTS idx_target_tags_tag ON housing_unit_target_tags (tag);",
        # 전역 단지 중복 방지 (docs/dev/DOMAIN_MODEL.md 3.3) -- 새 환경에서도 처음부터 강제됨
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_complexes_name_normaddr ON complexes (name, normalized_address);",
        # source_key는 기관 채번 방식이 전역 유일을 보장 못하는 사례가 있어(예: SH) NULL은 허용, 값이 있을 때만 유일성 강제
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_announcements_source_key ON announcements (source_key) WHERE source_key IS NOT NULL;"
    ]
    
    print("테이블 및 인덱스 생성을 시작합니다...")
    for index, query in enumerate(ddl_queries, 1):
        try:
            cursor.execute(query)
        except Exception as e:
            print(f"오류 발생 (쿼리 #{index}): {e}")
            conn.rollback()
            conn.close()
            return
            
    conn.commit()
    conn.close()
    print("데이터베이스 및 모든 테이블/인덱스 생성이 완성되었습니다!")

if __name__ == "__main__":
    init_db()
