#!/usr/bin/env python3
"""
Migration 003b: 002의 좌표 기준 매칭이 놓친 나머지 중복 단지를 (name, normalized_address)
텍스트 기준으로 2차 병합.

배경: 003 실행 후 UNIQUE(name, normalized_address) 인덱스 생성이 실패함 -- 5쌍이
여전히 중복이었음. 원인 확인 결과:
  1. 신규 단지 일부가 is_imprecise=0인데 위경도가 아직 NULL(지오코딩 전) -> 002의
     좌표 그룹 매칭에서 짝을 찾지 못함
  2. "파크원"(2453,3600)처럼 좌표가 소수점 5자리에서 미세하게 갈리는 케이스가 존재

이 스크립트는 002/003이 이미 실행된 뒤, 남은 (name, normalized_address) 완전 일치
중복을 한 번 더 정리하는 후속 보정 패스다. 이후 002를 다시 돌릴 필요는 없으며,
이 스크립트는 UNIQUE 인덱스 생성 직전에 상시 실행해도 안전하다(멱등).

실행: python3 db-pipeline/migrations/003b_merge_remaining_by_address.py
"""
import shutil
import sqlite3
from collections import defaultdict
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
HOUSING_DB = BASE_DIR / "public_housing.db"
USER_DB = BASE_DIR / "user_data.db"


def backup(db_path: Path, tag: str) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.with_name(f"{db_path.stem}.before_{tag}_{ts}{db_path.suffix}")
    shutil.copy2(db_path, backup_path)
    print(f"[백업] {backup_path}")
    return backup_path


def main() -> None:
    conn = sqlite3.connect(HOUSING_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        """
        SELECT name, normalized_address, COUNT(*) as cnt, GROUP_CONCAT(id) as ids
        FROM complexes
        GROUP BY name, normalized_address
        HAVING cnt > 1
        """
    )
    dup_groups = cur.fetchall()

    if not dup_groups:
        print("[정보] 남은 (name, normalized_address) 중복이 없습니다. 바로 인덱스 생성으로 진행합니다.")
    else:
        backup(HOUSING_DB, "003b")
        backup(USER_DB, "003b")
        print(f"[정보] 잔여 중복 그룹 {len(dup_groups)}개 발견")

        pairs = []
        for g in dup_groups:
            ids = sorted(int(x) for x in g["ids"].split(","))
            canonical = ids[0]
            for old_id in ids[1:]:
                pairs.append((canonical, old_id))
            print(f"- {g['name']!r} ids={ids} -> 대표={canonical}")

        for canon_id, old_id in pairs:
            cur.execute(
                "UPDATE housing_units SET complex_id=? WHERE complex_id=?",
                (canon_id, old_id),
            )
            cur.execute("DELETE FROM complexes WHERE id=?", (old_id,))
        conn.commit()
        print(f"[완료] {len(pairs)}건 병합")

        uconn = sqlite3.connect(USER_DB)
        ucur = uconn.cursor()
        remapped = 0
        for canon_id, old_id in pairs:
            ucur.execute(
                "DELETE FROM member_bookmark_items WHERE complex_id=? AND member_id IN "
                "(SELECT member_id FROM member_bookmark_items WHERE complex_id=?)",
                (old_id, canon_id),
            )
            ucur.execute(
                "UPDATE member_bookmark_items SET complex_id=? WHERE complex_id=?",
                (canon_id, old_id),
            )
            remapped += ucur.rowcount
        uconn.commit()
        uconn.close()
        print(f"[완료] user_data.db 북마크 {remapped}건 리매핑")

    cur.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_complexes_name_normaddr ON complexes(name, normalized_address)"
    )
    conn.commit()
    print("[완료] UNIQUE(name, normalized_address) 인덱스 생성")
    conn.close()


if __name__ == "__main__":
    main()
