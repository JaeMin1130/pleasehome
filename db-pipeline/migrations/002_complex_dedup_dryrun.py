#!/usr/bin/env python3
"""
Migration 002 (DRY RUN ONLY): complexes 전역 중복 단지 탐지 및 병합안 산출.

배경 (docs/dev/DOMAIN_MODEL.md 1.2, 3.3, 6장 참고):
complexes.announcement_id NOT NULL 때문에 같은 물리적 건물이 공고마다
(때로는 한 공고 안 신청단위마다) 별도 행으로 중복 적재되어 왔음
(실측 사례: "코아루 센트럴시티" 3개 공고에 3개 행, "강일리버파크 2" 한 공고
안에서도 2개 행).

매칭 기준: 이름(name)이 아니라 좌표(latitude/longitude) 우선.
- 실측 검증: "코아루 센트럴시티" 3개 중복 행과 "강일리버파크 2" 2개 중복 행
  모두 좌표가 완전히 동일했음(지오코딩이 주소 표기 차이를 이미 흡수함).
- "대준블루온", "주안희망타운"처럼 이름은 같지만 실제로는 다른 건물인
  케이스는 좌표가 다르므로 이 방식에서는 자동으로 별개 그룹으로 남음
  (이름만으로 매칭했다면 오병합됐을 사례).
- 좌표가 없거나 is_imprecise=1인 행은 정규화된 주소 문자열로 폴백 매칭.

이 스크립트는 어떠한 UPDATE/DELETE도 실행하지 않습니다. 결과는:
1. 콘솔에 그룹별 요약 출력
2. db-pipeline/migrations/002_complex_merge_mapping.json 에 {old_id: canonical_id} 저장
   (다음 단계 스크립트가 이 파일을 읽어 실제 병합을 수행함)

실행: python3 db-pipeline/migrations/002_complex_dedup_dryrun.py
"""
import json
import re
import sqlite3
from collections import defaultdict
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "public_housing.db"
MAPPING_OUT = Path(__file__).resolve().parent / "002_complex_merge_mapping.json"

COORD_PRECISION = 5  # 소수점 5자리 ~= 약 1m 오차, 건물 단위 구분에 충분


def normalize_address(address: str, name: str) -> str:
    """좌표가 없는 소수 케이스를 위한 폴백 정규화."""
    if not address:
        return ""
    addr = address.strip()
    if name and addr.endswith(name):
        addr = addr[: -len(name)].strip()
    addr = re.sub(r"\s+", " ", addr)
    return addr


def group_key(row: dict):
    if row["latitude"] is not None and row["longitude"] is not None and row["is_imprecise"] == 0:
        return (
            "geo",
            row["name"],
            round(row["latitude"], COORD_PRECISION),
            round(row["longitude"], COORD_PRECISION),
        )
    return ("addr", row["name"], normalize_address(row["address"], row["name"]))


def choose_canonical(rows: list) -> dict:
    """대표 행 선정: 좌표 정확(is_imprecise=0) 우선, 그중 가장 작은 id."""
    precise = [r for r in rows if r["is_imprecise"] == 0]
    pool = precise if precise else rows
    return min(pool, key=lambda r: r["id"])


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, address, latitude, longitude, is_imprecise, announcement_id FROM complexes"
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()

    print(f"[정보] 전체 complexes 행 수: {len(rows)}")

    groups = defaultdict(list)
    for row in rows:
        groups[group_key(row)].append(row)

    dup_groups = {k: v for k, v in groups.items() if len(v) > 1}
    print(f"[정보] 좌표/주소 기준 그룹 수: {len(groups)}, 중복(2개 이상) 그룹 수: {len(dup_groups)}")

    mapping: dict[int, int] = {}
    total_dup_rows = 0
    geo_based = 0
    addr_based = 0

    for key, group_rows in sorted(dup_groups.items(), key=lambda kv: -len(kv[1])):
        canonical = choose_canonical(group_rows)
        others = [r for r in group_rows if r["id"] != canonical["id"]]
        total_dup_rows += len(others)
        if key[0] == "geo":
            geo_based += 1
        else:
            addr_based += 1
        for r in others:
            mapping[r["id"]] = canonical["id"]

    print(f"[정보] 병합 대상 행 수(삭제될 행): {total_dup_rows}개")
    print(f"[정보] 좌표 기준 매칭 그룹: {geo_based}개, 주소 폴백 매칭 그룹: {addr_based}개")
    print()
    print("=== 상위 15개 병합 그룹 미리보기 ===")
    for key, group_rows in sorted(dup_groups.items(), key=lambda kv: -len(kv[1]))[:15]:
        canonical = choose_canonical(group_rows)
        ids = [r["id"] for r in group_rows]
        anns = sorted({r["announcement_id"] for r in group_rows})
        print(
            f"- {group_rows[0]['name']!r} | 매칭방식={key[0]} | id={ids} "
            f"-> 대표={canonical['id']} | 걸친 공고={anns}"
        )

    MAPPING_OUT.write_text(
        json.dumps(mapping, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    print()
    print(f"[완료] 병합 매핑 {len(mapping)}건을 {MAPPING_OUT} 에 저장했습니다 (dry-run, DB 변경 없음)")
    print("[다음 단계] 이 매핑 파일을 검토한 후 003 스크립트로 실제 병합을 진행하세요.")


if __name__ == "__main__":
    main()
