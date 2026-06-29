#!/usr/bin/env python3
import os
import sqlite3
import json
import sys

def audit_database():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # 환경변수 또는 backend 디렉토리를 통해 DB 경로 동적 결정 (누적 규칙 #3)
    env_path = os.getenv("PUBLIC_HOUSING_DB_PATH")
    if env_path:
        db_path = os.path.abspath(os.path.expanduser(env_path))
    else:
        db_path = os.path.join(base_dir, "public_housing.db")
            
    md_dir = os.path.join(base_dir, "docs", "md")
    
    if not os.path.exists(db_path):
        print(f"[에러] 데이터베이스 파일이 존재하지 않습니다: {db_path}", file=sys.stderr)
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("==================================================")
    print("      PUBLIC HOUSING DATABASE AUDIT REPORT        ")
    print("==================================================")
    
    # 1. 테이블별 Row 수 확인
    tables = ["announcements", "announcement_schedules", "announcement_details", "announcement_limits", "complexes", "housing_units", "data_load_logs"]
    print("[1] 테이블별 데이터 건수:")
    for tbl in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {tbl};")
            count = cursor.fetchone()[0]
            print(f"  - {tbl:25s} : {count} rows")
        except sqlite3.OperationalError as e:
            print(f"  - {tbl:25s} : [조회 에러] {e}")
        
    # 2. 적재된 공고 메타데이터 요약
    print("\n[2] 적재된 공고 목록 요약:")
    cursor.execute("SELECT id, institution, subscription_type, region, title FROM announcements;")
    announcements = cursor.fetchall()
    for row in announcements:
        region_str = row[3] if row[3] else "미분류"
        print(f"  - ID {row[0]:>3d} | {row[1]:3s} | {row[2]:12s} | {region_str:8s} | {row[4][:35]}")
        
    # 3. 참조 무결성 및 무결성 제약 사후 검증 (Post-load Data Quality Checks)
    print("\n[3] 참조 무결성 및 품질 검증:")
    integrity_errors = []
    
    # housing_units -> complexes 외래키 관계 검증
    cursor.execute(
        """
        SELECT h.id, h.complex_id 
        FROM housing_units h 
        LEFT JOIN complexes c ON h.complex_id = c.id 
        WHERE h.complex_id IS NOT NULL AND c.id IS NULL;
        """
    )
    invalid_complex_refs = cursor.fetchall()
    if invalid_complex_refs:
        for err in invalid_complex_refs:
            integrity_errors.append(f"housing_units[ID:{err[0]}]이 잘못된 complex_id({err[1]})를 참조하고 있습니다.")
            
    # housing_units -> announcements 외래키 관계 검증
    cursor.execute(
        """
        SELECT h.id, h.announcement_id 
        FROM housing_units h 
        LEFT JOIN announcements a ON h.announcement_id = a.id 
        WHERE a.id IS NULL;
        """
    )
    invalid_ann_refs = cursor.fetchall()
    for err in invalid_ann_refs:
        integrity_errors.append(f"housing_units[ID:{err[0]}]의 announcement_id({err[1]})가 announcements 테이블에 존재하지 않습니다.")

    # 임대료/보증금 이상치 검증 (음수 데이터 필터링)
    cursor.execute("SELECT id, deposit, monthly_rent FROM housing_units WHERE deposit < 0 OR monthly_rent < 0;")
    negative_prices = cursor.fetchall()
    for err in negative_prices:
        integrity_errors.append(f"housing_units[ID:{err[0]}]에 음수 가격 정보가 포함되어 있습니다. (보증금: {err[1]}, 월세: {err[2]})")

    # 면적 이상치 검증 (0 이하)
    cursor.execute("SELECT id, exclusive_area FROM housing_units WHERE exclusive_area <= 0;")
    invalid_areas = cursor.fetchall()
    for err in invalid_areas:
        integrity_errors.append(f"housing_units[ID:{err[0]}]의 전용면적({err[1]})이 0 이하로 유효하지 않습니다.")

    # 대표 지역(region) 누락 및 17대 지자체명 위반 검증
    valid_regions = [
        "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", 
        "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원도", 
        "충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도", 
        "경상남도", "제주특별자치도"
    ]
    cursor.execute("SELECT id, title, region FROM announcements;")
    for row in cursor.fetchall():
        ann_id, ann_title, reg = row
        if not reg:
            integrity_errors.append(f"announcements[ID:{ann_id}] 공고에 대표 지역(region) 정보가 누락(NULL)되어 있습니다.")
        elif reg not in valid_regions:
            integrity_errors.append(f"announcements[ID:{ann_id}] 공고의 지역명 '{reg}'은 17대 표준 지역명에 부합하지 않습니다.")

    # 출력 결과
    if integrity_errors:
        print("  [경보] 무결성 및 품질 정합성 오류가 검출되었습니다:")
        for err in integrity_errors:
            print(f"  - {err}")
    else:
        print("  - 데이터 정합성 및 무결성 검증 통과 (이상 현상 없음)")

    # 4. 누락 공고 검출 경보 (Orphaned directories checking)
    print("\n[4] 물리 폴더 대조 및 누락 공고 검출 감사:")
    if os.path.exists(md_dir):
        # md 폴더 하위의 공고 디렉토리 목록 조회
        folders = [f for f in os.listdir(md_dir) if os.path.isdir(os.path.join(md_dir, f))]
        
        # announcements 에 적재된 doc_path 목록 획득
        cursor.execute("SELECT doc_path FROM announcements;")
        loaded_paths = [row[0] for row in cursor.fetchall()]
        
        # relative_doc_path에서 폴더 이름만 추출
        # 예: "docs/md/sh_youth_2026/document.md" -> "sh_youth_2026"
        loaded_folders = set()
        for path in loaded_paths:
            parts = path.replace("\\", "/").split("/")
            if len(parts) >= 3 and parts[0] == "docs" and parts[1] == "md":
                loaded_folders.add(parts[2])
            else:
                # 폴더명을 직접 포함하고 있는지 유추 시도
                for f in folders:
                    if f in path:
                        loaded_folders.add(f)
        
        missing_folders = []
        for folder in folders:
            if folder not in loaded_folders:
                # data_load_logs 테이블에 해당 공고의 적재 시도가 있었는지 최종 로그 상태 확인
                cursor.execute(
                    """
                    SELECT status, error_message, loaded_at 
                    FROM data_load_logs l
                    JOIN announcements a ON l.announcement_id = a.id
                    WHERE a.doc_path LIKE ?
                    ORDER BY l.id DESC LIMIT 1;
                    """,
                    (f"%{folder}%",)
                )
                log_status = cursor.fetchone()
                
                if log_status:
                    missing_folders.append(f"[{folder}] - 최종 적재 시도 실패 상태 (로그상태: {log_status[0]}, 사유: {log_status[1]})")
                else:
                    missing_folders.append(f"[{folder}] - 데이터베이스에 적재 이력 없음 (미처리 상태)")
                    
        if missing_folders:
            print("  [경보] 데이터베이스 적재가 누락되었거나 실패한 상태로 방치된 폴더가 검출되었습니다:")
            for m in missing_folders:
                print(f"  - {m}")
        else:
            print("  - 모든 물리 공고 폴더가 정상적으로 데이터베이스에 적재 완료되었습니다.")
    else:
        print("  - [경고] docs/md 디렉토리가 없어 물리 디렉토리 대조를 건너뜁니다.")

    # 5. 최근 적재 결과 로그 요약 (data_load_logs)
    print("\n[5] 최근 5개 데이터 적재 결과 로그 (data_load_logs):")
    cursor.execute(
        """
        SELECT l.id, a.title, l.status, l.parsed_rows_count, l.error_message, l.loaded_at 
        FROM data_load_logs l
        LEFT JOIN announcements a ON l.announcement_id = a.id 
        ORDER BY l.id DESC LIMIT 5;
        """
    )
    for log in cursor.fetchall():
        ann_title = log[1][:25] if log[1] else "알수없는 공고"
        err = f" | 에러: {log[4]}" if log[4] else ""
        print(f"  - Log #{log[0]} | {ann_title:25s} | 상태: {log[2]} | 행수: {log[3]}{err} | {log[5]}")
        
    conn.close()
    print("==================================================")

if __name__ == "__main__":
    audit_database()
