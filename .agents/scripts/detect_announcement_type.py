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
            # 기존 단지 목록 조회. complexes.announcement_id("최초 발견 공고" 메타)뿐 아니라
            # housing_units 경유 실제 참조도 같이 봐야 함 -- 단지는 전역 엔티티라 이 공고가
            # 실제로 쓰는 단지의 "최초 발견"이 다른 공고일 수 있음(docs/dev/DOMAIN_MODEL.md 3.3).
            cur.execute(
                """
                SELECT DISTINCT c.id, c.name, c.address FROM complexes c
                WHERE c.announcement_id = ?
                UNION
                SELECT DISTINCT c.id, c.name, c.address FROM complexes c
                JOIN housing_units u ON u.complex_id = c.id
                WHERE u.announcement_id = ?
                """,
                (row[0], row[0]),
            )
            for c_row in cur.fetchall():
                existing_complexes.append({
                    "id": c_row[0],
                    "name": c_row[1],
                    "address": c_row[2]
                })

        conn.close()

    # 5. 최종 작업 유형(Action Type) 결정
    #
    # 주의: 아래 title_match_warning은 "이 title 검색이 진짜 동일 공고 계보를 찾았다"는
    # 보장이 전혀 아니다. LH는 "OO지역 국민임대주택 예비입주자 모집"류 제목을 매달
    # 재사용하는 정례모집이 있어(그때그때 공가 있는 단지 풀이 완전히 다름), 이 경우
    # title만 같을 뿐 실제로는 무관한 별개 회차인데도 여기서 "찾아진다". (실측 사례:
    # 2026-09-20, "원주시지역 국민임대주택 예비입주자 모집" — 기존 id=120은 이미
    # 서류제출까지 끝난 지난 회차였고, 이번 정정공고 폴더의 단지 3개 중 2개는 기존
    # DB의 단지 4개와 전혀 무관했음. id=120 재사용 시 무관한 데이터가 덮어써질 뻔함.)
    if existing_record:
        action_type = "TYPE_B_UPDATE_EXISTING"
        title_match_warning = (
            "이 판정은 title 완전/공백무시 일치만으로 나온 것이며, 진짜 동일 공고 계보라는 "
            "보장이 아님. api_meta.json에 정정사유(CRC 계열 필드)가 있는지, 그리고 무엇보다 "
            "existing_complexes의 address와 이번 공고문에 실제로 나열된 단지 주소를 반드시 "
            "직접 대조할 것. 겹치는 단지가 하나도 없거나 기존 공고의 신청접수~당첨자발표 "
            "일정이 이번 문서의 일정과 완전히 동떨어져 있으면, id를 재사용하지 말고 감사로 "
            "넘기기 전에 메인 에이전트에게 먼저 보고하여 사람 판단을 받을 것."
        )
    else:
        action_type = "TYPE_A_NEW_ANNOUNCEMENT"
        title_match_warning = None

    result = {
        "raw_title": raw_title,
        "clean_title": clean_title,
        "is_amendment": is_amendment,
        "action_type": action_type,
        "title_match_warning": title_match_warning,
        "existing_announcement": existing_record,
        "existing_complexes": existing_complexes
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
