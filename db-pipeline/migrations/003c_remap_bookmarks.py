#!/usr/bin/env python3
"""
Migration 003c (보정): 003 실행 시 인덱스 생성 실패로 죽으면서 건너뛰어진
user_data.db의 member_bookmark_items.complex_id 리매핑을 마저 수행.

발견 경위: 마이그레이션 후 최종 검증(cross-db LEFT JOIN)에서 member_bookmark_items에
고아 참조(complex_id=3606, 이미 002 매핑에서 2456으로 병합 대상이었음)가 발견됨.
원인은 003_merge_complexes.py의 코드 순서상 CREATE UNIQUE INDEX가 user_data.db
리매핑 섹션보다 먼저 있었는데, 그 인덱스 생성이 예외를 던지며 스크립트가 죽어서
리매핑 섹션 자체가 한 번도 실행되지 못했기 때문. (003 소스는 이미 순서를 고쳤음.
003b는 002 매핑에 없던 잔여 5쌍만 리매핑했으므로, 원래 002 매핑 230건은 아직
안 된 상태였음.)

이 스크립트는 002_complex_merge_mapping.json 전체를 대상으로 리매핑을
(재실행해도 안전하게, idempotent) 수행한다.

실행: python3 db-pipeline/migrations/003c_remap_bookmarks.py
"""
import json
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
USER_DB = BASE_DIR / "user_data.db"
HOUSING_DB = BASE_DIR / "public_housing.db"
MAPPING_PATH = Path(__file__).resolve().parent / "002_complex_merge_mapping.json"


def backup(db_path: Path, tag: str) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.with_name(f"{db_path.stem}.before_{tag}_{ts}{db_path.suffix}")
    shutil.copy2(db_path, backup_path)
    print(f"[백업] {backup_path}")
    return backup_path


def main() -> None:
    mapping_raw: dict[str, int] = json.loads(MAPPING_PATH.read_text(encoding="utf-8"))
    mapping: dict[int, int] = {int(k): v for k, v in mapping_raw.items()}

    backup(USER_DB, "003c")

    conn = sqlite3.connect(USER_DB)
    cur = conn.cursor()
    remapped = 0
    conflicted_deleted = 0
    for old_id, canon_id in mapping.items():
        cur.execute(
            "DELETE FROM member_bookmark_items WHERE complex_id = ? AND member_id IN "
            "(SELECT member_id FROM member_bookmark_items WHERE complex_id = ?)",
            (old_id, canon_id),
        )
        conflicted_deleted += cur.rowcount
        cur.execute(
            "UPDATE member_bookmark_items SET complex_id = ? WHERE complex_id = ?",
            (canon_id, old_id),
        )
        remapped += cur.rowcount
    conn.commit()
    conn.close()
    print(f"[완료] member_bookmark_items {remapped}건 리매핑, 중복충돌 삭제 {conflicted_deleted}건")

    # 최종 검증: public_housing.db와 크로스 체크
    conn = sqlite3.connect(USER_DB)
    conn.execute(f"ATTACH DATABASE '{HOUSING_DB}' AS housing")
    cur = conn.cursor()
    cur.execute(
        """
        SELECT COUNT(*), SUM(CASE WHEN c.id IS NULL THEN 1 ELSE 0 END)
        FROM member_bookmark_items b LEFT JOIN housing.complexes c ON b.complex_id = c.id
        """
    )
    total, orphans = cur.fetchone()
    print(f"[검증] member_bookmark_items 총 {total}건, 고아 참조 {orphans or 0}건")
    conn.close()


if __name__ == "__main__":
    main()
