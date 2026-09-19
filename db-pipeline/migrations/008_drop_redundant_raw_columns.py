#!/usr/bin/env python3
"""
Migration 008: 004에서 실수로 만든 중복 컬럼 정리.

배경: 004(supply_type/income_group 분해)에서 supply_type_raw/income_group_raw/
priority_rank_raw/rent_price_tier_raw를 "원문 보존용"으로 추가했으나, 실제로는:
- supply_type_raw == supply_type (완전 동일값, 이미 원본 컬럼이 원문 그 자체였음)
- income_group_raw == income_group (마찬가지)
- priority_rank_raw는 사실 priority_rank 값 자체를 복사한 것(진짜 원문 아님)
- rent_price_tier_raw는 income_group 전체 문자열을 또 복사한 것

즉 4개 다 기존 컬럼의 중복 저장일 뿐 새로운 정보가 없음. insert_loader.py 개정판과
백엔드 엔티티 모두 이 4개 컬럼을 참조하지 않도록 이미 작성되어 있어 안전하게 제거 가능.

(참고: supply_type/income_group/target_group 원본 컬럼 자체는 여기서 지우지 않음 --
백엔드가 여전히 표시용으로 읽고 있음, docs/dev/DOMAIN_MODEL.md 9장 참고)

실행: python3 db-pipeline/migrations/008_drop_redundant_raw_columns.py
"""
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "public_housing.db"
REDUNDANT_COLUMNS = ["supply_type_raw", "income_group_raw", "priority_rank_raw", "rent_price_tier_raw"]


def backup(db_path: Path) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.with_name(f"{db_path.stem}.before_008_{ts}{db_path.suffix}")
    shutil.copy2(db_path, backup_path)
    print(f"[백업] {backup_path}")
    return backup_path


def main() -> None:
    backup(DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(housing_units)")
    existing = {r[1] for r in cur.fetchall()}

    for col in REDUNDANT_COLUMNS:
        if col in existing:
            cur.execute(f"ALTER TABLE housing_units DROP COLUMN {col}")
            print(f"[완료] {col} 컬럼 삭제")
        else:
            print(f"[스킵] {col} 컬럼 없음")
    conn.commit()
    conn.close()


if __name__ == "__main__":
    main()
