#!/usr/bin/env python3
"""
Migration 006: announcements.source_key 추가+백필, housing_units.sale_price 추가.

source_key는 "{institution}:{PAN_ID}" 형태의 안정 비즈니스 키 (docs/dev/DOMAIN_MODEL.md
3.1). doc_path 폴더명(예: LH_2015122300020750_20260917)에서 PAN_ID를 파싱해 백필한다.
원본 폴더가 이미 정리되어 없는 경우가 많으므로(263개 공고 실사 중 상당수가 !old로
이동/삭제됨) doc_path 폴더명 파싱만으로 시도하고, 실패한 행은 NULL로 남긴다
(UNIQUE 제약은 NULL을 여러 개 허용하므로 안전함).

sale_price는 분양형(공공분양/분양전환) 전용 nullable 컬럼 (3.4, 3.6).

실행: python3 db-pipeline/migrations/006_add_source_key_and_sale_price.py
"""
import re
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
HOUSING_DB = BASE_DIR / "public_housing.db"

FOLDER_RE = re.compile(r"([A-Za-z]+)_([0-9A-Za-z]+)_\d{8}")


def backup(db_path: Path, tag: str) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.with_name(f"{db_path.stem}.before_{tag}_{ts}{db_path.suffix}")
    shutil.copy2(db_path, backup_path)
    print(f"[백업] {backup_path}")
    return backup_path


def extract_source_key(doc_path: str | None, institution: str | None) -> str | None:
    if not doc_path:
        return None
    m = FOLDER_RE.search(doc_path.replace("\\", "/"))
    if not m:
        return None
    inst = institution or m.group(1)
    pan_id = m.group(2)
    return f"{inst}:{pan_id}"


def main() -> None:
    backup(HOUSING_DB, "006")
    conn = sqlite3.connect(HOUSING_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(announcements)")
    ann_cols = {r[1] for r in cur.fetchall()}
    if "source_key" not in ann_cols:
        cur.execute("ALTER TABLE announcements ADD COLUMN source_key TEXT")
        conn.commit()
        print("[완료] announcements.source_key 컬럼 추가")

    rows = cur.execute("SELECT id, doc_path, institution FROM announcements").fetchall()
    filled = 0
    for r in rows:
        key = extract_source_key(r["doc_path"], r["institution"])
        if key:
            cur.execute("UPDATE announcements SET source_key = ? WHERE id = ?", (key, r["id"]))
            filled += 1
    conn.commit()
    print(f"[완료] source_key 백필: {filled}/{len(rows)}건 (나머지는 원본 폴더명 정보 소실로 NULL 유지)")

    dup = cur.execute(
        "SELECT source_key, COUNT(*) c FROM announcements WHERE source_key IS NOT NULL "
        "GROUP BY source_key HAVING c > 1"
    ).fetchall()
    if dup:
        print(f"[경고] source_key 중복 {len(dup)}건 발견 -- UNIQUE 인덱스 생성 보류, 확인 필요:")
        for d in dup[:10]:
            print(f"  {d[0]}: {d[1]}건")
    else:
        cur.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_announcements_source_key "
            "ON announcements(source_key) WHERE source_key IS NOT NULL"
        )
        conn.commit()
        print("[완료] UNIQUE(source_key) 부분 인덱스 생성 (NULL 제외)")

    cur.execute("PRAGMA table_info(housing_units)")
    hu_cols = {r[1] for r in cur.fetchall()}
    if "sale_price" not in hu_cols:
        cur.execute("ALTER TABLE housing_units ADD COLUMN sale_price REAL")
        conn.commit()
        print("[완료] housing_units.sale_price 컬럼 추가 (분양형 전용, nullable)")
    else:
        print("[스킵] housing_units.sale_price 이미 존재")

    conn.close()


if __name__ == "__main__":
    main()
