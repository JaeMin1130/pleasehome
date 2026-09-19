#!/usr/bin/env python3
"""
Migration 005: housing_units.target_group(압축 문자열) -> housing_unit_target_tags(다대다).

배경 (docs/dev/DOMAIN_MODEL.md 1.3, 3.4, 3.5):
target_group은 "신혼부부, 예비신혼부부, 한부모가족, 유자녀혼인가구, 신생아가구"처럼
여러 자격을 한 문자열에 압축한 값이 많아(101종), 단일 enum이 아니라 다대다 태그로
분해해야 함. 또한 "일반공급"/"일반" 같은 배정방식 값이 잘못 섞여 들어간 사례가
확인되어(강일리버파크), 그런 경우는 태그로 만들지 않고 allocation_method 보정에 사용.

*** 안전 원칙: housing_units.target_group 컬럼은 삭제하지 않는다 (004와 동일 이유). ***

실행: python3 db-pipeline/migrations/005_target_group_to_tags.py
"""
import re
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
HOUSING_DB = BASE_DIR / "public_housing.db"

NON_TAG_VALUES = {"상관없음", "일반", "일반공급", "우선공급", "특별공급", "해당없음", "", None}
PAREN_RE = re.compile(r"\([^)]*\)")
SPLIT_RE = re.compile(r"[,·/、]|\s+및\s+|\s+또는\s+")


def split_tags(raw: str) -> list[str]:
    if not raw:
        return []
    stripped = PAREN_RE.sub("", raw)
    parts = [p.strip() for p in SPLIT_RE.split(stripped)]
    return [p for p in parts if p and p not in NON_TAG_VALUES]


def backup(db_path: Path, tag: str) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.with_name(f"{db_path.stem}.before_{tag}_{ts}{db_path.suffix}")
    shutil.copy2(db_path, backup_path)
    print(f"[백업] {backup_path}")
    return backup_path


def main() -> None:
    backup(HOUSING_DB, "005")
    conn = sqlite3.connect(HOUSING_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS housing_unit_target_tags (
            housing_unit_id INTEGER NOT NULL,
            tag TEXT NOT NULL,
            PRIMARY KEY (housing_unit_id, tag),
            FOREIGN KEY (housing_unit_id) REFERENCES housing_units(id) ON DELETE CASCADE
        )
        """
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_target_tags_tag ON housing_unit_target_tags(tag)"
    )
    conn.commit()
    print("[완료] housing_unit_target_tags 테이블 생성")

    rows = cur.execute(
        "SELECT id, target_group, allocation_method FROM housing_units WHERE target_group IS NOT NULL"
    ).fetchall()

    tag_rows = []
    method_fix = []
    for r in rows:
        tags = split_tags(r["target_group"])
        for t in tags:
            tag_rows.append((r["id"], t))
        if r["allocation_method"] is None:
            for m in ("특별공급", "우선공급", "일반공급"):
                if m in (r["target_group"] or ""):
                    method_fix.append((m, r["id"]))
                    break

    cur.executemany(
        "INSERT OR IGNORE INTO housing_unit_target_tags (housing_unit_id, tag) VALUES (?, ?)",
        tag_rows,
    )
    conn.commit()
    print(f"[완료] 태그 {len(tag_rows)}건 삽입 (대상 유닛 {len(rows)}개 중)")

    if method_fix:
        cur.executemany(
            "UPDATE housing_units SET allocation_method = ? WHERE id = ?", method_fix
        )
        conn.commit()
        print(f"[보정] target_group에 배정방식이 섞여있던 {len(method_fix)}건 allocation_method 채움")

    cur.execute("SELECT COUNT(DISTINCT tag) FROM housing_unit_target_tags")
    print(f"[검증] 고유 태그 종류: {cur.fetchone()[0]}개")
    cur.execute(
        "SELECT tag, COUNT(*) c FROM housing_unit_target_tags GROUP BY tag ORDER BY c DESC LIMIT 15"
    )
    print("[검증] 상위 15개 태그:")
    for tag, c in cur.fetchall():
        print(f"  {tag}: {c}")

    conn.close()


if __name__ == "__main__":
    main()
