#!/usr/bin/env python3
import os
import sys
import json
import sqlite3
import re
import argparse

def clean_address(address):
    if not address:
        return address
    # '외' 뒤에 오는 세부 지구 정보나 필지 정보 전체를 안전하게 절삭
    # 예: "도내동 외 일원 고양창릉..." -> "도내동"
    address = re.sub(r'\s+외(?:\b|\s).*$', '', address.strip())
    # 끝에 남는 '일원' 이나 '일대' 정리
    address = re.sub(r'\s+(?:일원|일대)$', '', address)
    return address.strip()


def get_meta_from_folder(relative_doc_path, base_dir):
    """doc_path(LH_{PAN_ID}_{PAN_DT} 패턴)에서 PAN_ID를 추출하여
    해당 공고 폴더의 download_meta.json을 로드하여 반환합니다."""
    import re
    # doc_path에서 {기관명}_{PAN_ID}_{PAN_DT} 폴더명 추출
    match = re.search(r'(([A-Za-z가-힣]+)_(.+)_(\d{8}))', relative_doc_path.replace(os.sep, '/'))
    if not match:
        return {}
    folder_name = match.group(1)
    meta_path = os.path.join(base_dir, "docs", "pdf", folder_name, "download_meta.json")
    if not os.path.exists(meta_path):
        return {}
    try:
        with open(meta_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[경고] download_meta.json 로드 실패 ({folder_name}): {e}")
        return {}


def get_db_path(base_dir):
    # 환경변수 또는 backend 디렉토리를 통해 DB 경로 동적 결정 (누적 규칙 #3)
    env_path = os.getenv("PUBLIC_HOUSING_DB_PATH")
    if env_path:
        return os.path.abspath(os.path.expanduser(env_path))
    
    return os.path.join(base_dir, "public_housing.db")

def force_fail_log(db_path, doc_path, error_message, title=None, institution=None, subscription_type=None, region=None, ann_id=None):
    """
    공고 분석에 완전히 실패했을 때 최소 정보만 announcements 테이블에 생성하거나
    기존 ID를 매칭하여 data_load_logs에 FAIL 상태를 기록하고,
    원본 마크다운이 존재할 경우 details 테이블에 통째로 적재하여 '우아한 성능 저하 적재'를 완결합니다.
    """
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON;")
    cursor = conn.cursor()
    
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        # doc_path 상대 경로화
        if doc_path:
            if base_dir in doc_path:
                relative_doc_path = os.path.relpath(doc_path, base_dir)
            else:
                relative_doc_path = doc_path
        else:
            relative_doc_path = "unknown_path"

        # 1. announcement_id가 제공되지 않은 경우, 새로 만들기 위해 조회 및 리셋
        if not ann_id:
            cursor.execute(
                "SELECT id FROM announcements WHERE doc_path = ?", 
                (relative_doc_path,)
            )
            existing = cursor.fetchone()
            if existing:
                print(f"[강제 실패 로깅] 이전 공고 ID {existing[0]}의 기존 데이터를 초기화합니다.")
                cursor.execute("DELETE FROM announcements WHERE id = ?", (existing[0],))
            
            # API 메타데이터에서 필드 직접 회득
            api_meta = get_meta_from_folder(relative_doc_path, base_dir)
            
            final_title = api_meta.get("PAN_NM") or title or f"데이터 추출 실패 공고 ({os.path.basename(doc_path)})"
            final_inst = api_meta.get("_institution") or institution or "알수없음"
            final_sub_type = api_meta.get("AIS_TP_CD_NM") or subscription_type or "알수없음"
            final_region = api_meta.get("CNP_CD_NM") or region
            dtl_url = api_meta.get("DTL_URL", "")
            dtl_url_mob = api_meta.get("DTL_URL_MOB", "")
            
            cursor.execute(
                """
                INSERT INTO announcements (title, institution, subscription_type, region, doc_path, dtl_url, dtl_url_mob)
                VALUES (?, ?, ?, ?, ?, ?, ?);
                """,
                (final_title, final_inst, final_sub_type, final_region, relative_doc_path, dtl_url, dtl_url_mob)
            )
            ann_id = cursor.lastrowid
            
        # 2. 원본 마크다운 파일을 announcement_details에 통째로 우회 적재 (우아한 성능 저하)
        full_md_path = doc_path
        if full_md_path and not os.path.isabs(full_md_path):
            full_md_path = os.path.join(base_dir, full_md_path)
            
        if full_md_path and os.path.exists(full_md_path):
            try:
                with open(full_md_path, "r", encoding="utf-8") as f:
                    raw_content = f.read()
                
                # 기존 details 삭제 후 삽입
                cursor.execute("DELETE FROM announcement_details WHERE announcement_id = ?", (ann_id,))
                cursor.execute(
                    """
                    INSERT INTO announcement_details (announcement_id, section_title, section_content, sort_order)
                    VALUES (?, ?, ?, ?);
                    """,
                    (ann_id, "전체 공고문 원본(성능 저하 적재)", raw_content, 0)
                )
                print(f"[우아한 성능 저하 적재] 원본 마크다운 전체 내용 {len(raw_content)}자 세부조회 테이블에 임시 적재 완료.")
            except Exception as read_err:
                print(f"[경고] 원본 마크다운 파일 읽기/적재 중 에러: {read_err}")
                
        # 3. 실패 이력 로그 기록
        cursor.execute(
            """
            INSERT INTO data_load_logs (announcement_id, status, parsed_rows_count, error_message)
            VALUES (?, ?, ?, ?);
            """,
            (ann_id, "FAIL", 0, error_message)
        )
        
        conn.commit()
        print(f"[실패 기록 완료] 공고 ID: {ann_id} (상태: FAIL, 사유: {error_message})")
        return True, ann_id
        
    except Exception as e:
        conn.rollback()
        print(f"[실패 강제 로깅 실패] DB 롤백 실행됨: {e}", file=sys.stderr)
        return False, None
    finally:
        conn.close()

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
    db_path = get_db_path(base_dir)
    
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
            raise KeyError("announcement 객체에 'doc_path' phild(필드)가 없고, source_path로부터 유추할 수 없습니다.")
            
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
            
        # API 메타데이터를 우선 적용하여 announcements 테이블 적재
        api_meta = get_meta_from_folder(relative_doc_path, base_dir)
        
        cursor.execute(
            """
            INSERT INTO announcements (
                title, institution, subscription_type, region, doc_path, dtl_url, dtl_url_mob
            )
            VALUES (?, ?, ?, ?, ?, ?, ?);
            """,
            (
                api_meta.get("PAN_NM") or ann_info["title"],
                api_meta.get("_institution") or ann_info["institution"],
                api_meta.get("AIS_TP_CD_NM") or ann_info["subscription_type"],
                api_meta.get("CNP_CD_NM") or ann_info.get("region"),
                relative_doc_path,
                api_meta.get("DTL_URL") or "",
                api_meta.get("DTL_URL_MOB") or ""
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
                (ann_id, sched["schedule_type"], sched.get("start_date"), sched.get("end_date"), sched["raw_text"], sched.get("notes"))
            )
            
        # 5. announcement_limits 테이블 적재
        for lim in json_data.get("limits", []):
            cursor.execute(
                """
                INSERT INTO announcement_limits (announcement_id, target_group, max_support_amount, deposit_limit, tenant_share, interest_rate, max_monthly_rent, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (ann_id, lim.get("target_group"), lim.get("max_support_amount"), lim.get("deposit_limit"), lim.get("tenant_share"), lim.get("interest_rate"), lim.get("max_monthly_rent"), lim.get("notes"))
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
            
        # 7. complexes 및 housing_units 테이블 적재 (단지명 + 주소 복합 키 매핑 적용)
        complex_name_to_id = {}
        complex_key_to_id = {}
        for comp in json_data.get("complexes", []):
            cleaned_addr = clean_address(comp["address"])
            cursor.execute(
                """
                INSERT INTO complexes (announcement_id, name, address, heating_type, has_elevator, parking_info, complex_type)
                VALUES (?, ?, ?, ?, ?, ?, ?);
                """,
                (ann_id, comp["name"], cleaned_addr, comp.get("heating_type"), comp.get("has_elevator"), comp.get("parking_info"), comp.get("complex_type"))
            )
            inserted_id = cursor.lastrowid
            complex_name_to_id[comp["name"]] = inserted_id
            if comp["name"] and cleaned_addr:
                complex_key_to_id[(comp["name"], cleaned_addr)] = inserted_id
            
        units_count = 0
        for unit in json_data.get("units", []):
            comp_name = unit.get("complex_name")
            comp_addr = clean_address(unit.get("complex_address")) if unit.get("complex_address") else None
            
            comp_id = None
            if comp_name and comp_addr:
                comp_id = complex_key_to_id.get((comp_name, comp_addr))
            
            # 주소 매핑이 없거나 실패한 경우, 단지명 단독으로 Fallback 매핑
            if not comp_id and comp_name:
                comp_id = complex_name_to_id.get(comp_name)
            
            # 방어적 캐스팅 및 디폴팅 로직 적용
            def to_int(val, default=0):
                if val is None:
                    return default
                try:
                    return int(val)
                except ValueError:
                    # 숫자가 아닌 문자(쉼표, 원 등) 제거 후 재도전
                    clean_val = re.sub(r'[^\d-]', '', str(val))
                    return int(clean_val) if clean_val else default

            def to_float(val, default=None):
                if val is None:
                    return default
                try:
                    return float(val)
                except ValueError:
                    clean_val = re.sub(r'[^\d.-]', '', str(val))
                    return float(clean_val) if clean_val else default

            cursor.execute(
                """
                INSERT INTO housing_units (
                    announcement_id, complex_id, room_number, room_count, room_type, supply_type, 
                    exclusive_area, contract_area, target_group, income_group, 
                    supply_count, reserve_count, deposit, monthly_rent,
                    max_deposit, min_deposit, max_monthly_rent, min_monthly_rent, attributes
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    ann_id, comp_id, unit.get("room_number"), to_int(unit.get("room_count"), None), 
                    unit.get("room_type"), unit.get("supply_type"),
                    to_float(unit.get("exclusive_area")), to_float(unit.get("contract_area")), 
                    unit.get("target_group"), unit.get("income_group"),
                    to_int(unit.get("supply_count"), 0), to_int(unit.get("reserve_count"), 0), 
                    to_int(unit.get("deposit")), to_int(unit.get("monthly_rent"), 0),
                    to_int(unit.get("max_deposit"), None), to_int(unit.get("min_deposit"), None), 
                    to_int(unit.get("max_monthly_rent"), None), to_int(unit.get("min_monthly_rent"), None),
                    str(unit.get("attributes", ""))
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
        
        # 실패 격리 기록 남김
        if ann_id:
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

def main():
    parser = argparse.ArgumentParser(description="SQLite Public Housing DB Loader & Failure Isolator")
    
    # 실패 로깅 전용 옵션
    parser.add_argument("--status", choices=["SUCCESS", "FAIL"], help="강제 상태 기록 플래그")
    parser.add_argument("--error_message", help="실패 상태 기록 시 포함할 에러 스택 내용")
    parser.add_argument("--announcement_id", type=int, help="특정 공고 ID")
    parser.add_argument("--doc_path", help="실패 대상 마크다운 파일 경로")
    parser.add_argument("--title", help="실패 대상 공고명")
    parser.add_argument("--institution", help="실패 대상 시행 기관")
    parser.add_argument("--subscription_type", help="실패 대상 청약 구분")
    parser.add_argument("--region", help="실패 대상 지역")
    
    # 기존 모드 호환 인자
    parser.add_argument("source", nargs="?", help="JSON 데이터 파일 경로 또는 JSON 문자열")
    parser.add_argument("dest_json_path", nargs="?", help="데이터 복제본 물리 저장 파일 경로")

    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_path = get_db_path(base_dir)

    # 강제 실패 로깅 모드 기동 조건 판별
    if args.status == "FAIL" or args.error_message:
        if not args.doc_path and not args.announcement_id:
            print("[에러] 실패 강제 로깅 모드를 위해서는 --doc_path 또는 --announcement_id 중 최소 하나를 지정해야 합니다.", file=sys.stderr)
            sys.exit(1)
        
        success, final_id = force_fail_log(
            db_path=db_path,
            doc_path=args.doc_path,
            error_message=args.error_message or "알 수 없는 파싱/검증 에러 발생",
            title=args.title,
            institution=args.institution,
            subscription_type=args.subscription_type,
            region=args.region,
            ann_id=args.announcement_id
        )
        if not success:
            sys.exit(1)
        sys.exit(0)

    # 기존 일반 JSON 적재 모드 기동
    if not args.source:
        parser.print_help()
        sys.exit(1)
        
    source = args.source
    dest_path = args.dest_json_path
        
    source_file = None
    if os.path.exists(source):
        source_file = source
        with open(source, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        try:
            data = json.loads(source)
        except Exception as e:
            print(f"[에러] 입력 소스가 존재하지 않는 파일이며, 유효한 JSON 문자열도 아닙니다: {e}", file=sys.stderr)
            sys.exit(1)
        
    success, ann_id = load_json_to_db(data, dest_path, source_path=source_file)
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
