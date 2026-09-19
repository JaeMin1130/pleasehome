#!/usr/bin/env python3
"""
Migration 003: 002에서 찾은 중복 단지(complexes)를 실제로 병합.

배경 (docs/dev/DOMAIN_MODEL.md 3.3, 6장 / 002 dry-run 결과 참고):
002_complex_dedup_dryrun.py가 좌표 기준으로 193개 중복 그룹(230개 삭제 대상 행)을
찾았음. 이번 스크립트는 그 매핑을 실제로 적용한다:
  1. 속성 충돌(heating_type/has_elevator/parking_info/complex_type) 해소
  2. housing_units.complex_id, user_data.db의 member_bookmark_items.complex_id 리매핑
  3. 중복 complexes 행 삭제
  4. normalized_address 컬럼 추가 + UNIQUE(name, normalized_address) 인덱스로 재발 방지

속성 충돌 해소 정책 (113건 실측 분류 결과 기반):
  - heating_type: 공백/이표기(개별난방 vs 개별 난방 vs 개별가스난방 등)는 정규화 버킷으로
    묶어서 자동 해결. 버킷이 다르면(지역난방 vs 개별난방) 진짜 충돌 -> 아래 정책.
  - parking_info: 더 상세한(긴) 서술을 채택 (정보 손실이 적은 쪽).
  - complex_type:
      * 검증된 패턴 우선 적용: 원문(document.md)이 로컬에 남아있는 공고(244, 315)를
        실제로 대조한 결과, "연립주택 vs 다세대주택" 충돌은 둘 다 틀렸고 원문 표의
        진짜 사업유형은 "매입다가구"(-> 표준값 "다가구주택")였음이 확인됨. 이 특정
        패턴(비-NULL 값 집합이 {"연립주택","다세대주택"}의 부분집합)은 "다가구주택"으로
        교정.
      * 그 외 complex_type 충돌 및 원문 대조 불가능한 나머지 충돌
        (heating_type 진짜충돌, has_elevator 0/1)은 다수결로 결정하고,
        동률이면 대표(canonical) 행의 값을 채택 -- "더 그럴듯한 값" 휴리스틱.
  - has_elevator: 다수결. 동률/전부 NULL이면 대표 행 값 유지(NULL 가능).

모든 자동 해결 내역은 db-pipeline/migrations/003_resolution_report.json 에 기록되어
사후 검증 가능함.

주의: 이 마이그레이션은 파괴적(DELETE)입니다. 실행 전 public_housing.db와
user_data.db를 모두 백업합니다.

실행: python3 db-pipeline/migrations/003_merge_complexes.py
"""
import json
import re
import shutil
import sqlite3
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
HOUSING_DB = BASE_DIR / "public_housing.db"
USER_DB = BASE_DIR / "user_data.db"
MAPPING_PATH = Path(__file__).resolve().parent / "002_complex_merge_mapping.json"
REPORT_PATH = Path(__file__).resolve().parent / "003_resolution_report.json"

CONFLICT_FIELDS = ["heating_type", "has_elevator", "parking_info", "complex_type"]

# 원문(document.md) 대조로 검증된 교정: 연립주택/다세대주택 충돌은 실제로 "매입다가구"
# (표준값: 다가구주택)였음 (공고 244, 315 원문 직접 대조로 확인됨)
VERIFIED_COMPLEX_TYPE_FIX = {
    "trigger_values": {"연립주택", "다세대주택"},
    "corrected_value": "다가구주택",
}


def backup(db_path: Path, tag: str) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.with_name(f"{db_path.stem}.before_{tag}_{ts}{db_path.suffix}")
    shutil.copy2(db_path, backup_path)
    print(f"[백업] {backup_path}")
    return backup_path


def normalize_heating_bucket(value: str) -> str:
    v = re.sub(r"\s+", "", value)
    if "개별" in v:
        return "개별난방"
    if "지역" in v:
        return "지역난방"
    if "중앙" in v:
        return "중앙난방"
    return v


def normalize_address(address: str, name: str) -> str:
    if not address:
        return ""
    addr = address.strip()
    if name and addr.endswith(name):
        addr = addr[: -len(name)].strip()
    return re.sub(r"\s+", " ", addr)


def resolve_field(field: str, rows: list, canonical_id: int) -> tuple[str | None, str]:
    """반환: (해결된 값, 해결 방식 라벨)"""
    non_null = [r[field] for r in rows if r[field] is not None]
    if not non_null:
        return None, "all_null"

    distinct = set(non_null)
    if len(distinct) == 1:
        return non_null[0], "no_conflict"

    if field == "heating_type":
        buckets = {normalize_heating_bucket(v) for v in distinct}
        if len(buckets) == 1:
            # 같은 버킷이면 가장 짧은(가장 표준적인) 표기를 채택
            return min(distinct, key=len), "heating_bucket_normalized"
        # 진짜 다른 난방 방식 충돌 -> 다수결
        counts = Counter(non_null)
        top = counts.most_common()
        if len(top) > 1 and top[0][1] == top[1][1]:
            canon_val = next((r[field] for r in rows if r["id"] == canonical_id and r[field]), top[0][0])
            return canon_val, "real_conflict_tiebreak_canonical"
        return top[0][0], "real_conflict_majority_vote"

    if field == "parking_info":
        return max(distinct, key=len), "prefer_more_detailed"

    if field == "complex_type":
        if distinct <= VERIFIED_COMPLEX_TYPE_FIX["trigger_values"]:
            return VERIFIED_COMPLEX_TYPE_FIX["corrected_value"], "source_verified_fix(매입다가구->다가구주택)"
        counts = Counter(non_null)
        top = counts.most_common()
        if len(top) > 1 and top[0][1] == top[1][1]:
            canon_val = next((r[field] for r in rows if r["id"] == canonical_id and r[field]), top[0][0])
            return canon_val, "unresolved_conflict_tiebreak_canonical(원문 재대조 필요)"
        return top[0][0], "unresolved_conflict_majority_vote(원문 재대조 필요)"

    if field == "has_elevator":
        counts = Counter(non_null)
        top = counts.most_common()
        if len(top) > 1 and top[0][1] == top[1][1]:
            canon_val = next((r[field] for r in rows if r["id"] == canonical_id and r[field] is not None), top[0][0])
            return canon_val, "tiebreak_canonical(원문 재대조 필요)"
        return top[0][0], "majority_vote"

    return non_null[0], "fallback_first"


def main() -> None:
    if not MAPPING_PATH.exists():
        raise SystemExit(f"[에러] {MAPPING_PATH} 가 없습니다. 002 스크립트를 먼저 실행하세요.")

    mapping_raw: dict[str, int] = json.loads(MAPPING_PATH.read_text(encoding="utf-8"))
    mapping: dict[int, int] = {int(k): v for k, v in mapping_raw.items()}
    if not mapping:
        print("[정보] 병합할 항목이 없습니다.")
        return

    backup(HOUSING_DB, "003")
    backup(USER_DB, "003")

    groups: dict[int, set[int]] = defaultdict(set)
    for old_id, canon_id in mapping.items():
        groups[canon_id].add(old_id)
        groups[canon_id].add(canon_id)

    conn = sqlite3.connect(HOUSING_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(complexes)")
    existing_cols = {r[1] for r in cur.fetchall()}
    if "normalized_address" not in existing_cols:
        cur.execute("ALTER TABLE complexes ADD COLUMN normalized_address TEXT")
        conn.commit()
        print("[완료] complexes.normalized_address 컬럼 추가")

    report = []

    for canon_id, ids in groups.items():
        rows = [
            dict(r)
            for r in cur.execute(
                f"SELECT * FROM complexes WHERE id IN ({','.join(map(str, ids))})"
            ).fetchall()
        ]
        resolved = {}
        for field in CONFLICT_FIELDS:
            value, method = resolve_field(field, rows, canon_id)
            resolved[field] = value
            if method not in ("no_conflict", "all_null"):
                report.append(
                    {
                        "canonical_id": canon_id,
                        "name": rows[0]["name"],
                        "field": field,
                        "resolved_value": value,
                        "method": method,
                        "source_values": [
                            {"id": r["id"], "announcement_id": r["announcement_id"], "value": r[field]}
                            for r in rows
                        ],
                    }
                )

        canonical_row = next(r for r in rows if r["id"] == canon_id)
        norm_addr = normalize_address(canonical_row["address"], canonical_row["name"])

        cur.execute(
            """
            UPDATE complexes
            SET heating_type = ?, has_elevator = ?, parking_info = ?, complex_type = ?,
                normalized_address = ?
            WHERE id = ?
            """,
            (
                resolved["heating_type"],
                resolved["has_elevator"],
                resolved["parking_info"],
                resolved["complex_type"],
                norm_addr,
                canon_id,
            ),
        )

        old_ids = ids - {canon_id}
        if old_ids:
            cur.execute(
                f"""
                UPDATE housing_units SET complex_id = ?
                WHERE complex_id IN ({','.join(map(str, old_ids))})
                """,
                (canon_id,),
            )
            cur.execute(
                f"DELETE FROM complexes WHERE id IN ({','.join(map(str, old_ids))})"
            )

    conn.commit()

    # 리포트는 뒤에서 실패할 수 있는 작업(인덱스 생성 등)보다 먼저 저장한다.
    # (실제로 최초 실행 시 인덱스 생성이 잔여 중복으로 실패하면서 리포트가
    #  통째로 유실된 적이 있었음 -- 003b_merge_remaining_by_address.py 참고)
    REPORT_PATH.write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    verified_fix = sum(1 for r in report if "source_verified_fix" in r["method"])
    unresolved = sum(1 for r in report if "원문 재대조 필요" in r["method"])
    print(f"[완료] 해결 리포트 {len(report)}건 저장: {REPORT_PATH}")
    print(f"  - 원문 검증 교정 적용: {verified_fix}건")
    print(f"  - 자동 해결(정규화/다수결/상세우선): {len(report) - verified_fix - unresolved}건")
    print(f"  - 원문 재대조 필요(추후 확인 권장): {unresolved}건")

    # 병합에 관여하지 않은 나머지 complexes도 normalized_address 채워넣기
    remaining = cur.execute(
        "SELECT id, name, address FROM complexes WHERE normalized_address IS NULL"
    ).fetchall()
    for r in remaining:
        cur.execute(
            "UPDATE complexes SET normalized_address = ? WHERE id = ?",
            (normalize_address(r["address"], r["name"]), r["id"]),
        )
    conn.commit()
    print(f"[완료] 나머지 {len(remaining)}개 단지에도 normalized_address 채움")

    total_deleted = sum(len(ids) - 1 for ids in groups.values())
    print(f"[완료] complexes {total_deleted}개 행 병합/삭제")
    print(
        "[다음 단계] 002의 좌표 매칭이 놓친 잔여 중복이 있을 수 있으므로 "
        "003b_merge_remaining_by_address.py를 이어서 실행하세요 "
        "(UNIQUE 인덱스 생성은 그 스크립트에서 최종 수행됩니다)."
    )

    conn.close()

    # --- user_data.db: member_bookmark_items.complex_id 리매핑 ---
    uconn = sqlite3.connect(USER_DB)
    ucur = uconn.cursor()
    remapped = 0
    conflicted_deleted = 0
    for old_id, canon_id in mapping.items():
        # 이미 canonical_id로 북마크한 회원이 있으면 old_id 행은 그냥 삭제(중복 방지)
        ucur.execute(
            "DELETE FROM member_bookmark_items WHERE complex_id = ? AND member_id IN "
            "(SELECT member_id FROM member_bookmark_items WHERE complex_id = ?)",
            (old_id, canon_id),
        )
        conflicted_deleted += ucur.rowcount
        ucur.execute(
            "UPDATE member_bookmark_items SET complex_id = ? WHERE complex_id = ?",
            (canon_id, old_id),
        )
        remapped += ucur.rowcount
    uconn.commit()
    uconn.close()
    print(
        f"[완료] user_data.db: member_bookmark_items {remapped}건 리매핑, "
        f"{conflicted_deleted}건은 이미 canonical_id로 북마크되어 있어 중복 삭제"
    )


if __name__ == "__main__":
    main()
