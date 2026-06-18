#!/usr/bin/env python3
import os
import sys
import json
import sqlite3
import re

def clean_address(address):
    if not address:
        return address
    # '외' 뒤에 오는 세부 지구 정보나 필지 정보 전체를 안전하게 절삭
    # 예: "도내동 외 일원 고양창릉..." -> "도내동"
    address = re.sub(r'\s+외(?:\b|\s).*$', '', address.strip())
    # 끝에 남는 '일원' 이나 '일대' 정리
    address = re.sub(r'\s+(?:일원|일대)$', '', address)
    return address.strip()

def load_json_to_db(json_data, dest_json_path=None, source_path=None):
    """
    JSON 구조 데이터를 받아 파일로 저장(옵션)하고 public_housing.db에 트랜잭션 적재합니다.
    """
    # 1. JSON 파일 물리 저장 (절충안 반영)
    if dest_json_path:
        os.makedirs(os.path.dirname(dest_json_path), exist_ok=True)
        with open(dest_json_path, "w", encoding="utf-8") as f:
            json.dump(json_data, f, ensure_ascii=False, indent=2)
        print(f"[파일 저장 완료] {dest_json_path}")

    # 2. SQLite DB 경로 동적 결정 (절대 경로 하드코딩 방지 - 누적 규칙 #3)
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_path = os.path.join(base_dir, "public_housing.db")
    
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON;")
    cursor = conn.cursor()
    
    ann_id = None
    try:
        ann_info = json_data["announcement"]
        
        # doc_path가 누락되었을 때 source_path 기준으로 자동 완성
        raw_doc_path = ann_info.get("doc_path")
        if not raw_doc_path and source_path and os.path.exists(source_path):
            raw_doc_path = os.path.join(os.path.dirname(os.path.abspath(source_path)), "document.md")
            
        if not raw_doc_path:
            raise KeyError("announcement 객체에 'doc_path' 필드가 없고, source_path로부터 유추할 수 없습니다.")
            
        if base_dir in raw_doc_path:
            relative_doc_path = os.path.relpath(raw_doc_path, base_dir)
        else:
            relative_doc_path = raw_doc_path
            
        # 3. announcements 테이블 적재 (기존 중복 데이터 존재 시 트랜잭션 롤백용 삭제)
        cursor.execute(
            "SELECT id FROM announcements WHERE doc_path = ?", 
            (relative_doc_path,)
        )
        existing = cursor.fetchone()
        if existing:
            print(f"[기존 데이터 발견] 이전 공고 ID {existing[0]}의 데이터를 삭제하고 재적재합니다.")
            cursor.execute("DELETE FROM announcements WHERE id = ?", (existing[0],))
            
        cursor.execute(
            """
            INSERT INTO announcements (
                title, institution, subscription_type, doc_path
            )
            VALUES (?, ?, ?, ?);
            """,
            (
                ann_info["title"],
                ann_info["institution"],
                ann_info["subscription_type"],
                relative_doc_path
            )
        )
        ann_id = cursor.lastrowid
        
        # 4. announcement_schedules 테이블 적재
        for sched in json_data.get("schedules", []):
            cursor.execute(
                """
                INSERT INTO announcement_schedules (announcement_id, schedule_type, start_date, end_date, raw_text, notes)
                VALUES (?, ?, ?, ?, ?, ?);
                """,
                (ann_id, sched["schedule_type"], sched["start_date"], sched["end_date"], sched["raw_text"], sched["notes"])
            )
            
        # 5. announcement_limits 테이블 적재
        for lim in json_data.get("limits", []):
            cursor.execute(
                """
                INSERT INTO announcement_limits (announcement_id, target_group, max_support_amount, deposit_limit, tenant_share, interest_rate, max_monthly_rent, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (ann_id, lim["target_group"], lim["max_support_amount"], lim["deposit_limit"], lim["tenant_share"], lim["interest_rate"], lim["max_monthly_rent"], lim["notes"])
            )
            
        # 6. announcement_details 테이블 적재
        for det in json_data.get("details", []):
            cursor.execute(
                """
                INSERT INTO announcement_details (announcement_id, section_title, section_content, sort_order)
                VALUES (?, ?, ?, ?);
                """,
                (ann_id, det["section_title"], det["section_content"], det["sort_order"])
            )
            
        # 7. complexes 및 housing_units 테이블 적재 (단지명 매핑 포함)
        complex_name_to_id = {}
        for comp in json_data.get("complexes", []):
            cleaned_addr = clean_address(comp["address"])
            cursor.execute(
                """
                INSERT INTO complexes (announcement_id, name, address, heating_type, has_elevator, parking_info)
                VALUES (?, ?, ?, ?, ?, ?);
                """,
                (ann_id, comp["name"], cleaned_addr, comp["heating_type"], comp["has_elevator"], comp["parking_info"])
            )
            complex_name_to_id[comp["name"]] = cursor.lastrowid
            
        units_count = 0
        for unit in json_data.get("units", []):
            comp_id = complex_name_to_id.get(unit["complex_name"])
            cursor.execute(
                """
                INSERT INTO housing_units (
                    announcement_id, complex_id, room_number, room_count, supply_type, 
                    exclusive_area, contract_area, target_group, income_group, 
                    supply_count, reserve_count, deposit, monthly_rent,
                    max_deposit, min_deposit, max_monthly_rent, min_monthly_rent, attributes
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    ann_id, comp_id, unit["room_number"], unit["room_count"], unit["supply_type"],
                    unit["exclusive_area"], unit["contract_area"], unit["target_group"], unit["income_group"],
                    unit["supply_count"], unit["reserve_count"], unit["deposit"], unit["monthly_rent"],
                    unit.get("max_deposit"), unit.get("min_deposit"), unit.get("max_monthly_rent"), unit.get("min_monthly_rent"),
                    unit["attributes"]
                )
            )
            units_count += 1
            
        # 8. data_load_logs 성공 로그 기록
        cursor.execute(
            """
            INSERT INTO data_load_logs (announcement_id, status, parsed_rows_count, error_message)
            VALUES (?, ?, ?, ?);
            """,
            (ann_id, "SUCCESS", units_count, None)
        )
        
        conn.commit()
        print(f"[적재 성공] 공고 ID: {ann_id} (등록된 주택 평형: {units_count}개)")
        return True, ann_id
        
    except Exception as e:
        conn.rollback()
        print(f"[적재 오류] 롤백이 실행되었습니다: {e}", file=sys.stderr)
        # 실패 로깅 시도 (ann_id가 있을 경우만 연동)
        try:
            cursor.execute(
                """
                INSERT INTO data_load_logs (announcement_id, status, parsed_rows_count, error_message)
                VALUES (?, ?, ?, ?);
                """,
                (ann_id, "FAIL", 0, str(e))
            )
            conn.commit()
        except:
            pass
        return False, None
    finally:
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: ./insert_loader.py <JSON_STRING_OR_FILE> [DEST_JSON_PATH]")
        sys.exit(1)
        
    source = sys.argv[1]
    dest_path = sys.argv[2] if len(sys.argv) >= 3 else None
        
    # 소스가 파일 경로인지 아니면 JSON 문자열인지 판별
    source_file = None
    if os.path.exists(source):
        source_file = source
        with open(source, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = json.loads(source)
        
    load_json_to_db(data, dest_path, source_path=source_file)
