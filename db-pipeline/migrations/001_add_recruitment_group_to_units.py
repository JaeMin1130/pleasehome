#!/usr/bin/env python3
"""
Migration 001: recruitment_group_id를 complexes에서 housing_units로 이관.

배경 (docs/dev/DOMAIN_MODEL.md 1.2, 3.4 참고):
complexes.recruitment_group_id는 "단지 1개는 신청단위 1개에만 속한다"는
잘못된 가정 위에 있었음. 실제로는 한 단지가 여러 신청단위에 걸치는 경우
(예: "강일지구 강일리버파크 2", 공고 322 -> "강일지구"/"강일지구(서울리츠3호)"
두 신청단위에 동시 참여)가 있어서, 기존 파이프라인은 단지 행을 복제하는
편법으로 이를 우회해왔음. HousingUnit(공고+단지+조건의 교차점)에
recruitment_group_id를 옮기면 단지 복제 없이 양쪽 방향(N:1, 1:N)을 모두
표현할 수 있음.

이 마이그레이션은 순수 추가(컬럼 추가 + 값 복사)라 안전하고 되돌리기 쉬움
(컬럼 drop으로 롤백 가능). complexes.recruitment_group_id 컬럼 자체는
아직 삭제하지 않음 -- 002에서 단지 전역 중복제거가 끝난 뒤 별도 마이그레이션으로 제거.

실행: python3 db-pipeline/migrations/001_add_recruitment_group_to_units.py
"""
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "public_housing.db"


def backup(db_path: Path) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.with_name(f"{db_path.stem}.before_001_{ts}{db_path.suffix}")
    shutil.copy2(db_path, backup_path)
    print(f"[백업] {backup_path}")
    return backup_path


def main() -> None:
    if not DB_PATH.exists():
        print(f"[에러] DB 파일을 찾을 수 없습니다: {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    backup(DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(housing_units)")
    cols = {row[1] for row in cur.fetchall()}
    if "recruitment_group_id" in cols:
        print("[스킵] housing_units.recruitment_group_id 컬럼이 이미 존재합니다")
    else:
        cur.execute(
            """
            ALTER TABLE housing_units
            ADD COLUMN recruitment_group_id INTEGER
            REFERENCES announcement_recruitment_groups(id)
            """
        )
        conn.commit()
        print("[완료] housing_units.recruitment_group_id 컬럼 추가")

    cur.execute(
        """
        UPDATE housing_units
        SET recruitment_group_id = (
            SELECT c.recruitment_group_id
            FROM complexes c
            WHERE c.id = housing_units.complex_id
        )
        WHERE recruitment_group_id IS NULL
          AND complex_id IS NOT NULL
        """
    )
    updated = cur.rowcount
    conn.commit()
    print(f"[완료] {updated}개 housing_units 행에 recruitment_group_id 값을 채웠습니다")

    cur.execute(
        "SELECT COUNT(*) FROM housing_units WHERE recruitment_group_id IS NULL"
    )
    remaining_null = cur.fetchone()[0]
    print(
        f"[검증] recruitment_group_id가 여전히 NULL인 행: {remaining_null}개 "
        "(complex_id가 NULL이거나, 해당 단지에 recruitment_group_id가 없던 경우)"
    )

    cur.execute("CREATE INDEX IF NOT EXISTS idx_units_recruitment_group ON housing_units(recruitment_group_id)")
    conn.commit()
    print("[완료] idx_units_recruitment_group 인덱스 생성")

    conn.close()


if __name__ == "__main__":
    main()
