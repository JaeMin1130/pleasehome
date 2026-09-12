#!/usr/bin/env python3
import os
import sys
import json
import sqlite3
import re
import argparse

def get_clean_title(raw_title):
    """
    공고명에서 대괄호, 소괄호, 특수괄호 및 정정/재공고/변경 키워드, 끝자리 날짜 표기를 제거하여 순수 공고명을 반환합니다.
    """
    title = raw_title.strip()
    
    # 1. 괄호로 둘러싸인 정정, 재공고, 변경 관련 키워드 제거 (위치 무관)
    # 예: [정정공고], (정정), 【변경공고】, [재공고-1차] 등
    bracket_pattern = r'[\[\(\{【<]\s*(?:정정공고|정정|재공고|변경공고|변경|취소공고|수정공고)(?:[\s\-_]*\d+차)?\s*[\]\)\}】>]'
    title = re.sub(bracket_pattern, '', title)
    
    # 2. 괄호 없이 시작하는 정정 접두사 제거
    title = re.sub(r'^(?:정정공고|정정|재공고|변경공고)\s*[-:]?\s*', '', title)
    
    # 3. 끝자리에 붙은 날짜 패턴 제거 (예: ('25.02.10), 2025.03.05, ('25.02.15 정정) 등)
    date_pattern = r'[\(\[]\s*\'?\d{2,4}[\.\-/]\d{1,2}[\.\-/]\d{1,2}(?:\s*정정)?\s*[\)\]]\s*$'
    title = re.sub(date_pattern, '', title)
    
    # 4. 연속 공백 정리
    title = re.sub(r'\s+', ' ', title).strip()
    return title

def is_amendment_title(raw_title):
    """
    제목에 대괄호/소괄호/특수괄호 불문 정정, 재공고, 변경 키워드가 포함되어 있는지 판별합니다.
    """
    strict_pattern = r'([\[\(\{【<]\s*(?:정정공고|정정|재공고|변경공고|변경|수정공고).*[\]\)\}】>]|^(?:정정공고|정정|재공고|변경공고))'
    return bool(re.search(strict_pattern, raw_title))

def main():
    parser = argparse.ArgumentParser(description="Notice Type & Existing Announcement Detector")
    parser.add_argument("target_dir", help="Target notice directory containing api_meta.json or download_meta.json")
    parser.add_argument("--db", default=None, help="Path to public_housing.db (optional)")
    args = parser.parse_args()

    target_dir = os.path.abspath(args.target_dir)
    if not os.path.isdir(target_dir):
        print(json.dumps({"error": f"Directory not found: {target_dir}"}, ensure_ascii=False))
        sys.exit(1)

    # 1. 메타데이터에서 제목(PAN_NM 또는 title) 추출
    raw_title = ""
    api_meta_path = os.path.join(target_dir, "api_meta.json")
    download_meta_path = os.path.join(target_dir, "download_meta.json")

    if os.path.exists(api_meta_path):
        try:
            with open(api_meta_path, "r", encoding="utf-8") as f:
                d = json.load(f)
                raw_title = d.get("title") or d.get("pan_nm") or d.get("PAN_NM") or ""
                if not raw_title and "api_metadata" in d:
                    raw_title = d["api_metadata"].get("PAN_NM", "")
        except:
            pass

    if not raw_title and os.path.exists(download_meta_path):
        try:
            with open(download_meta_path, "r", encoding="utf-8") as f:
                d = json.load(f)
                raw_title = d.get("PAN_NM") or d.get("title") or ""
        except:
            pass

    # 2. 마크다운에서 제목 보완 (메타데이터에 없을 경우)
    if not raw_title:
        doc_path = os.path.join(target_dir, "document.md")
        if os.path.exists(doc_path):
            with open(doc_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("# "):
                        raw_title = line[2:].strip()
                        break

    if not raw_title:
        print(json.dumps({"error": "Failed to determine notice title"}, ensure_ascii=False))
        sys.exit(1)

    # 3. 정정공고 여부 판별 및 Clean Title 생성
    is_amendment = is_amendment_title(raw_title)
    clean_title = get_clean_title(raw_title)

    # 4. DB 경로 결정
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_path = args.db or os.getenv("PUBLIC_HOUSING_DB_PATH") or os.path.join(base_dir, "db-pipeline", "public_housing.db")

    existing_record = None
    existing_complexes = []

    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # 1차: Clean Title 완전 일치 검색
        cur.execute("SELECT id, title, institution, subscription_type, region, doc_path FROM announcements WHERE title = ?", (clean_title,))
        row = cur.fetchone()

        # 2차: 띄어쓰기 무시 일치 검색
        if not row:
            no_space_clean = clean_title.replace(" ", "")
            cur.execute("SELECT id, title, institution, subscription_type, region, doc_path FROM announcements WHERE REPLACE(title, ' ', '') = ?", (no_space_clean,))
            row = cur.fetchone()

        if row:
            existing_record = {
                "id": row[0],
                "title": row[1],
                "institution": row[2],
                "subscription_type": row[3],
                "region": row[4],
                "doc_path": row[5]
            }
            # 기존 단지 ID 목록 조회
            cur.execute("SELECT id, name, address FROM complexes WHERE announcement_id = ?", (row[0],))
            for c_row in cur.fetchall():
                existing_complexes.append({
                    "id": c_row[0],
                    "name": c_row[1],
                    "address": c_row[2]
                })

        conn.close()

    # 5. 최종 작업 유형(Action Type) 결정
    if existing_record:
        action_type = "TYPE_B_UPDATE_EXISTING"
    else:
        action_type = "TYPE_A_NEW_ANNOUNCEMENT"

    result = {
        "raw_title": raw_title,
        "clean_title": clean_title,
        "is_amendment": is_amendment,
        "action_type": action_type,
        "existing_announcement": existing_record,
        "existing_complexes": existing_complexes
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
