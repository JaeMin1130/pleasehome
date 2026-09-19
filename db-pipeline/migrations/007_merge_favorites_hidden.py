#!/usr/bin/env python3
"""
Migration 007 (user_data.db): member_favorites + member_hidden_anns
-> announcement_interests(member_id, announcement_id, status, updated_at) 통합.

배경 (docs/dev/DOMAIN_MODEL.md 2.3): 찜/숨김이 별개 테이블이라 상호배타가 DB가 아닌
@Transactional 로직에만 의존함. status 컬럼 하나로 통합하면 UNIQUE(member_id,
announcement_id) 제약만으로 배타성이 보장됨.

*** 안전 원칙: 기존 member_favorites/member_hidden_anns 테이블은 삭제하지 않는다. ***
Kotlin 백엔드(MemberInteractionService, MemberFavorite/MemberHiddenAnn 엔티티)가
아직 이 테이블들을 그대로 쓰고 있으므로, 새 테이블을 나란히 만들어 채우기만 하고
기존 테이블 제거는 백엔드 코드 전환 후 별도 마이그레이션으로 진행.

실행: python3 db-pipeline/migrations/007_merge_favorites_hidden.py
"""
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
USER_DB = BASE_DIR / "user_data.db"


def backup(db_path: Path, tag: str) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.with_name(f"{db_path.stem}.before_{tag}_{ts}{db_path.suffix}")
    shutil.copy2(db_path, backup_path)
    print(f"[백업] {backup_path}")
    return backup_path


def main() -> None:
    backup(USER_DB, "007")
    conn = sqlite3.connect(USER_DB)
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS announcement_interests (
            member_id       TEXT NOT NULL,
            announcement_id INTEGER NOT NULL,
            status          TEXT NOT NULL CHECK (status IN ('FAVORITE', 'HIDDEN')),
            updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (member_id, announcement_id)
        )
        """
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_interests_member ON announcement_interests(member_id)"
    )
    conn.commit()
    print("[완료] announcement_interests 테이블 생성")

    cur.execute(
        """
        INSERT OR IGNORE INTO announcement_interests (member_id, announcement_id, status, updated_at)
        SELECT id.member_id, id.announcement_id, 'FAVORITE', COALESCE(id.favorited_at, CURRENT_TIMESTAMP)
        FROM member_favorites id
        """
    )
    fav_inserted = cur.rowcount
    conn.commit()
    print(f"[완료] member_favorites {fav_inserted}건 -> announcement_interests(FAVORITE) 이관")

    # 찜/숨김이 동시에 있었다면(원래는 상호배타라 없어야 하지만 방어적으로) HIDDEN을 나중에 넣어
    # INSERT OR IGNORE가 기존 FAVORITE 행을 덮어쓰지 않게 하고, 대신 REPLACE로 최종 상태를 명시한다.
    cur.execute(
        """
        SELECT member_id, announcement_id, hidden_at FROM member_hidden_anns
        """
    )
    hidden_rows = cur.fetchall()
    overwritten_favorite = 0
    for member_id, announcement_id, hidden_at in hidden_rows:
        cur.execute(
            "SELECT status FROM announcement_interests WHERE member_id=? AND announcement_id=?",
            (member_id, announcement_id),
        )
        existing = cur.fetchone()
        if existing and existing[0] == "FAVORITE":
            overwritten_favorite += 1
        cur.execute(
            """
            INSERT INTO announcement_interests (member_id, announcement_id, status, updated_at)
            VALUES (?, ?, 'HIDDEN', ?)
            ON CONFLICT(member_id, announcement_id) DO UPDATE SET status='HIDDEN', updated_at=excluded.updated_at
            """,
            (member_id, announcement_id, hidden_at or datetime.now().isoformat()),
        )
    conn.commit()
    print(f"[완료] member_hidden_anns {len(hidden_rows)}건 -> announcement_interests(HIDDEN) 이관")
    if overwritten_favorite:
        print(
            f"[경고] 원본에서 찜/숨김이 동시에 존재하던 {overwritten_favorite}건 발견 "
            "(원래 상호배타여야 하는데 데이터에 남아있던 예외) -- HIDDEN으로 최종 확정함"
        )

    cur.execute("SELECT status, COUNT(*) FROM announcement_interests GROUP BY status")
    for status, c in cur.fetchall():
        print(f"[검증] {status}: {c}건")

    conn.close()


if __name__ == "__main__":
    main()
