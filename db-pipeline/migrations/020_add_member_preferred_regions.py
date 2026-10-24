#!/usr/bin/env python3
"""
Migration 020: members.preferred_regions 컬럼 추가 (user_data.db).

배경 (2026-10-25):
- 회원가입·회원정보 수정에서 관심 공고 지역(LH 지역코드 CNP_CD, 복수 선택)을 받아
  공고 적재 대상 지역을 정하는 참고 자료로 쓴다.
- 값은 '11,41'처럼 쉼표로 이은 지역코드 문자열이며, 기존 회원은 빈 문자열('')로 둔다.

주의: user_data.db는 배포 시 덮어쓰지 않으므로 실서버에서도 이 스크립트를 따로 실행해야 한다.
      새 백엔드 JAR(Member.preferredRegions 매핑)보다 먼저 적용하지 않으면 회원 조회가 전부 실패한다.

실행: python3 db-pipeline/migrations/020_add_member_preferred_regions.py                 # dry-run
      python3 db-pipeline/migrations/020_add_member_preferred_regions.py --apply         # 백업 후 적용
      python3 db-pipeline/migrations/020_add_member_preferred_regions.py --apply --db /path/to/user_data.db
"""
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
COLUMN = "preferred_regions"


def columns(conn: sqlite3.Connection) -> list[str]:
    return [row[1] for row in conn.execute("PRAGMA table_info(members)").fetchall()]


def main() -> None:
    apply = "--apply" in sys.argv
    db_path = Path(sys.argv[sys.argv.index("--db") + 1]) if "--db" in sys.argv else BASE_DIR / "user_data.db"

    conn = sqlite3.connect(db_path)
    existing = columns(conn)
    if COLUMN in existing:
        print(f"✅ 이미 members.{COLUMN} 컬럼이 존재합니다. ({db_path})")
        conn.close()
        return

    member_count = conn.execute("SELECT COUNT(*) FROM members").fetchone()[0]
    print(f"🔍 대상: {db_path}")
    print(f"추가할 컬럼: members.{COLUMN} TEXT NOT NULL DEFAULT '' (기존 회원 {member_count}명은 빈 값)")

    if not apply:
        print("\n[Dry-run 모드] 실제 변경은 적용되지 않았습니다.")
        print("적용하려면 --apply 옵션을 붙여 다시 실행하세요.")
        conn.close()
        return

    # 백업 생성 (WAL 내용까지 반영된 일관된 사본을 위해 SQLite backup API 사용)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.with_name(f"user_data.before_020_{ts}.db")
    print(f"\n📦 백업 생성 중: {backup_path.name}")
    with sqlite3.connect(backup_path) as backup:
        conn.backup(backup)

    conn.execute(f"ALTER TABLE members ADD COLUMN {COLUMN} TEXT NOT NULL DEFAULT ''")
    conn.commit()

    # 검증
    assert COLUMN in columns(conn), f"members.{COLUMN} 추가 검증 실패!"
    empty = conn.execute(f"SELECT COUNT(*) FROM members WHERE {COLUMN} = ''").fetchone()[0]
    assert empty == member_count, f"기존 회원 빈 값 검증 실패: {empty}/{member_count}"
    conn.close()

    print(f"🎉 성공: members.{COLUMN} 컬럼 추가 완료 (기존 회원 {member_count}명 빈 값)")


if __name__ == "__main__":
    main()
