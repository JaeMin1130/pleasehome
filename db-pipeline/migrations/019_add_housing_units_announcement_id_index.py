#!/usr/bin/env python3
"""
Migration 019: housing_units(announcement_id) 단독 인덱스 추가.

배경 (2026-10-15):
- 기존 복합 인덱스 `idx_units_lookup (complex_id, announcement_id)`는
  선두 컬럼이 `complex_id`로 되어 있어, announcement_id 단독 조회 쿼리 시
  인덱스를 타지 못하고 16k 행 전체를 Full Scan함.
- `idx_units_announcement_id (announcement_id)` 단독 인덱스를 추가하여
  공고별 유닛 조회 성능을 최적화함.

주의: 서버 DB는 deploy:db 배포 절차를 통해서만 갱신하며, 서버 DB에 직접 접속해 수정하지 않는다.

실행: python3 db-pipeline/migrations/019_add_housing_units_announcement_id_index.py          # dry-run
      python3 db-pipeline/migrations/019_add_housing_units_announcement_id_index.py --apply  # 백업 후 적용
"""
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "public_housing.db"


def main() -> None:
    apply = "--apply" in sys.argv

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    existing = [
        row[0]
        for row in cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='housing_units'"
        ).fetchall()
    ]

    index_name = "idx_units_announcement_id"
    if index_name in existing:
        print(f"✅ 이미 인덱스 '{index_name}'가 존재합니다.")
        conn.close()
        return

    print(f"🔍 대상 인덱스: {index_name} ON housing_units (announcement_id)")
    print(f"기존 인덱스 목록: {existing}")

    if not apply:
        print("\n[Dry-run 모드] 실제 변경은 적용되지 않았습니다.")
        print("적용하려면 --apply 옵션을 붙여 다시 실행하세요.")
        conn.close()
        return

    # 백업 생성
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BASE_DIR / f"public_housing.before_019_{ts}.db"
    print(f"\n📦 백업 생성 중: {backup_path.name}")
    conn.close()
    shutil.copy2(DB_PATH, backup_path)

    # 마이그레이션 실행
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(f"CREATE INDEX IF NOT EXISTS {index_name} ON housing_units (announcement_id)")
    conn.commit()

    # 검증
    created = [
        row[0]
        for row in cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='housing_units'"
        ).fetchall()
    ]
    assert index_name in created, f"{index_name} 생성 검증 실패!"
    conn.close()

    print(f"🎉 성공: '{index_name}' 인덱스가 성공적으로 추가되었습니다!")


if __name__ == "__main__":
    main()
