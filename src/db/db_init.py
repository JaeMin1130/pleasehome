#!/usr/bin/env python3
import os
import sqlite3

def init_db():
    # src/db/db_init.py 기준 3단계 상위가 프로젝트 루트입니다. (절대 경로 하드코딩 방지 - 누적 규칙 #3)
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_path = os.path.join(base_dir, "public_housing.db")
    
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
            doc_path VARCHAR(255) NOT NULL,       -- 변환된 마크다운 및 리소스가 위치한 폴더 상대 경로
            deposit_increase_rate REAL,           -- 보증금 증액 전환이율 (연 %)
            deposit_decrease_rate REAL,           -- 보증금 감액 전환이율 (연 %)
            deposit_increase_limit_rate REAL,     -- 월세 대비 보증금 최대 증액 한도 비율 (%)
            deposit_decrease_limit_rate REAL,     -- 기본 보증금 대비 최대 감액 한도 비율 (%)
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
        -- [4] announcement_limits: 전세임대 지원 한도액 및 조건 테이블
        CREATE TABLE IF NOT EXISTS announcement_limits (
            id INTEGER PRIMARY KEY AUTOINCREMENT, -- 지원조건 ID (고유 식별자)
            announcement_id INTEGER NOT NULL,     -- 소속 공고 ID (announcements.id 외래키)
            target_group VARCHAR(100),            -- 지원 대상군 (예: '청년', '신혼부부', '다자녀가구')
            max_support_amount BIGINT,            -- 최대 지원금액 (융자 보증금 한도액, 원 단위)
            deposit_limit BIGINT,                 -- 대상 주택의 최대 임차보증금 한도 (원 단위)
            tenant_share BIGINT,                  -- 입주자 본인 기본 부담 보증금 (원 단위)
            interest_rate REAL,                   -- 지원금에 대한 기본 연 이자율 (퍼센트 단위)
            max_monthly_rent BIGINT,              -- 혼합형 주택 공급 시 최대 허용 월 임대료 (원 단위)
            notes TEXT,                           -- 한도 조건 관련 비고 및 유의사항
            FOREIGN KEY (announcement_id) REFERENCES announcements (id) ON DELETE CASCADE
        );
        """,
        """
        -- [5] complexes: 모집 주택 단지 정보 테이블
        CREATE TABLE IF NOT EXISTS complexes (
            id INTEGER PRIMARY KEY AUTOINCREMENT, -- 단지 ID (고유 식별자)
            announcement_id INTEGER NOT NULL,     -- 소속 공고 ID (announcements.id 외래키)
            name VARCHAR(150) NOT NULL,           -- 단지/건물명 (예: '정릉 하늘마루', '개포라프레앙')
            address VARCHAR(255) NOT NULL,        -- 주택 지번/도로명 주소 (클라이언트 단에서 Geocoding에 사용)
            heating_type VARCHAR(50),             -- 난방 방식 (예: '개별난방', '지역난방', '중앙난방')
            has_elevator BOOLEAN,                 -- 승강기(엘리베이터) 설치 여부 (1: 설치, 0: 미설치)
            parking_info VARCHAR(100),            -- 주차 구획 수 및 가능 여부 정보
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 레코드 생성 일시
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 레코드 최종 수정 일시
            FOREIGN KEY (announcement_id) REFERENCES announcements (id) ON DELETE CASCADE
        );
        """,
        """
        -- [6] housing_units: 단지별/평형별 세부 주택 공급 조건 및 가격 테이블
        CREATE TABLE IF NOT EXISTS housing_units (
            id INTEGER PRIMARY KEY AUTOINCREMENT, -- 모집 조건 ID (고유 식별자)
            announcement_id INTEGER NOT NULL,     -- 소속 공고 ID (announcements.id 외래키)
            complex_id INTEGER,                   -- 소속 단지 ID (complexes.id 외래키, 단지가 없을 시 NULL)
            room_number VARCHAR(50),              -- 동/호수 정보 (특정 호실 공급 시 기록)
            room_count INTEGER,                   -- 방 개수
            supply_type VARCHAR(100),             -- 공급 구분 (예: '우선공급', '일반공급', '재공급')
            exclusive_area REAL NOT NULL,         -- 전용면적 (제곱미터 단위, REAL)
            contract_area REAL,                   -- 계약면적 (제곱미터 단위, REAL)
            target_group VARCHAR(100),            -- 세부 공급 대상군 (예: '대학생', '청년', '신혼부부', '고령자')
            income_group VARCHAR(50),             -- 소득 순위 조건 (예: '50% 이하', '70% 이하', '100% 이하')
            supply_count INTEGER DEFAULT 0,       -- 공급 예정 모집 호수
            reserve_count INTEGER DEFAULT 0,      -- 예비 입주자 모집 호수
            deposit BIGINT NOT NULL,              -- 기본 임대 보증금 (원 단위)
            monthly_rent BIGINT DEFAULT 0,        -- 기본 월 임대료 (원 단위, 전세형인 경우 0)
            attributes TEXT,                      -- 기타 세부 주택 특이사항 속성 (JSON 또는 텍스트)
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 레코드 생성 일시
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 레코드 최종 수정 일시
            FOREIGN KEY (announcement_id) REFERENCES announcements (id) ON DELETE CASCADE,
            FOREIGN KEY (complex_id) REFERENCES complexes (id) ON DELETE CASCADE
        );
        """,
        """
        -- [7] data_load_logs: 데이터 적재 이력 로그 테이블
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
        "CREATE INDEX IF NOT EXISTS idx_limits_announcement ON announcement_limits (announcement_id);",
        "CREATE INDEX IF NOT EXISTS idx_complexes_announcement ON complexes (announcement_id);",
        "CREATE INDEX IF NOT EXISTS idx_units_lookup ON housing_units (complex_id, announcement_id);"
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
