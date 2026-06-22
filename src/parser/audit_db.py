#!/usr/bin/env python3
import os
import sqlite3
import json

def audit_database():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_path = os.path.join(base_dir, "public_housing.db")
    
    if not os.path.exists(db_path):
        print(f"데이터베이스 파일이 존재하지 않습니다: {db_path}")
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
        cursor.execute(f"SELECT COUNT(*) FROM {tbl};")
        count = cursor.fetchone()[0]
        print(f"  - {tbl:25s} : {count} rows")
        
    # 2. 적재된 공고 메타데이터 요약
    print("\n[2] 적재된 공고 목록 요약:")
    cursor.execute("SELECT id, institution, subscription_type, title FROM announcements;")
    for row in cursor.fetchall():
        print(f"  - ID {row[0]} | {row[1]:3s} | {row[2]:10s} | {row[3][:30]}")
        
    # 3. 전세임대 재정 한도 데이터 감사 (원 단위 확인)
    print("\n[3] 전세임대 지원 한도 데이터 감사 (announcement_limits):")
    cursor.execute("SELECT target_group, max_support_amount, deposit_limit, tenant_share FROM announcement_limits;")
    limits = cursor.fetchall()
    if limits:
        for lim in limits:
            print(f"  - 대상: {lim[0]}")
            print(f"    * 최대지원금액: {lim[1]:,} 원 (정밀도 검증)")
            print(f"    * 보증금한도액: {lim[2]:,} 원")
            print(f"    * 입주자부담금: {lim[3]:,} 원")
    else:
        print("  - 데이터 없음")
        
    # 4. 단지별 임대 조건 (임대료 수치) 무작위 샘플링 검증 (원 단위 정합성)
    print("\n[4] 주택 가격 정합성 샘플링 (housing_units - 상위 5개):")
    cursor.execute(
        """
        SELECT c.name, h.room_type, h.supply_type, h.target_group, h.income_group, h.deposit, h.monthly_rent
        FROM housing_units h
        JOIN complexes c ON h.complex_id = c.id
        LIMIT 5;
        """
    )
    for sample in cursor.fetchall():
        print(f"  - 단지: {sample[0]} | 주택형: {sample[1]} | 공급구분: {sample[2]} | 대상: {sample[3]} ({sample[4]})")
        print(f"    * 보증금 : {sample[5]:,} 원")
        print(f"    * 월 임대료: {sample[6]:,} 원")
        
    # 5. 로드 로그 감사
    print("\n[5] 최근 10개 데이터 적재 결과 로그 (data_load_logs):")
    cursor.execute("SELECT id, announcement_id, status, parsed_rows_count, error_message, loaded_at FROM data_load_logs ORDER BY id DESC LIMIT 10;")
    for log in cursor.fetchall():
        err = f" | Error: {log[4]}" if log[4] else ""
        print(f"  - Log #{log[0]} | 공고 ID: {log[1]} | 상태: {log[2]} | 행수: {log[3]}{err} | {log[5]}")
        
    conn.close()
    print("==================================================")

if __name__ == "__main__":
    audit_database()
