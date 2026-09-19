#!/usr/bin/env python3
"""
Migration 004: housing_units.supply_type / income_group 컬럼 분해.

배경 (docs/dev/DOMAIN_MODEL.md 1.3, 3.4, 5장 동의어 사전):
supply_type(86종)과 income_group(96종)은 각각 여러 개념(주택상품유형/배정방식/
순위/임대조건 시세비율/소득기준)이 한 문자열에 뭉쳐 있었음. 실사(공고 244, 315
원문 직접 대조)로 확인된 규칙에 따라 아래 컬럼으로 분해한다.

*** 안전 원칙: 기존 컬럼(supply_type, income_group)은 삭제하지 않는다. ***
Kotlin 백엔드(HousingUnit 엔티티, HousingService)가 아직 이 컬럼을 그대로
읽고 있으므로, 지금 지우면 서비스가 깨진다. 새 컬럼을 나란히 추가만 하고,
기존 컬럼 제거는 백엔드 코드가 새 컬럼을 쓰도록 바뀐 뒤 별도 마이그레이션으로 진행.

신규 컬럼:
  housing_product_type, allocation_method, supply_type_raw
  priority_rank, priority_rank_raw, rent_price_tier, rent_price_tier_raw,
  income_threshold_pct, income_threshold_condition, income_group_raw

실행: python3 db-pipeline/migrations/004_decompose_supply_type_income_group.py
"""
import re
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
HOUSING_DB = BASE_DIR / "public_housing.db"

# 5.6 housing_product_type 동의어 -- 긴/구체적인 것부터 매칭
HOUSING_PRODUCT_TYPES = [
    "통합공공임대", "공공분양", "분양전환", "매입임대", "든든전세",
    "장기전세", "국민임대", "영구임대", "행복주택", "재개발임대",
    "집주인임대", "기존주택",
]

ALLOCATION_METHODS = ["특별공급", "우선공급", "일반공급", "특별", "우선", "일반"]
ALLOCATION_NORMALIZE = {"특별": "특별공급", "우선": "우선공급", "일반": "일반공급"}


def backup(db_path: Path, tag: str) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.with_name(f"{db_path.stem}.before_{tag}_{ts}{db_path.suffix}")
    shutil.copy2(db_path, backup_path)
    print(f"[백업] {backup_path}")
    return backup_path


def parse_supply_type(raw: str | None, announcement_product_fallback: str | None):
    if not raw:
        return None, None
    product = next((p for p in HOUSING_PRODUCT_TYPES if p in raw), None)
    if product is None:
        product = announcement_product_fallback
    method = next((m for m in ALLOCATION_METHODS if m in raw), None)
    method = ALLOCATION_NORMALIZE.get(method, method)
    return product, method


PRIORITY_DIGIT_RE = re.compile(r"(\d(?:\s*[·,~]\s*\d)*)\s*순위")
RENT_TIER_RE = re.compile(r"시중\s*시세\s*(\d+)\s*%")
THRESHOLD_RE = re.compile(r"(\d{2,3})\s*%\s*(이하|초과)\s*(?:\(([^)]+)\))?")


def parse_income_group(raw: str | None):
    """반환: (priority_rank, rent_price_tier, income_threshold_pct, income_threshold_condition)"""
    if not raw:
        return None, None, None, None

    if "가군" in raw:
        priority_rank = "1순위급"
    elif "나군" in raw:
        priority_rank = "2순위급"
    else:
        m = PRIORITY_DIGIT_RE.search(raw)
        priority_rank = (re.sub(r"\s+", "", m.group(1)) + "순위") if m else None

    m = RENT_TIER_RE.search(raw)
    rent_price_tier = int(m.group(1)) if m else None

    m = THRESHOLD_RE.search(raw)
    if m:
        income_threshold_pct = int(m.group(1))
        income_threshold_condition = m.group(3)
    else:
        income_threshold_pct = None
        income_threshold_condition = None

    return priority_rank, rent_price_tier, income_threshold_pct, income_threshold_condition


def main() -> None:
    backup(HOUSING_DB, "004")
    conn = sqlite3.connect(HOUSING_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(housing_units)")
    existing = {r[1] for r in cur.fetchall()}
    new_cols = [
        ("housing_product_type", "TEXT"),
        ("allocation_method", "TEXT"),
        ("supply_type_raw", "TEXT"),
        ("priority_rank", "TEXT"),
        ("priority_rank_raw", "TEXT"),
        ("rent_price_tier", "INTEGER"),
        ("rent_price_tier_raw", "TEXT"),
        ("income_threshold_pct", "INTEGER"),
        ("income_threshold_condition", "TEXT"),
        ("income_group_raw", "TEXT"),
    ]
    for col, coltype in new_cols:
        if col not in existing:
            cur.execute(f"ALTER TABLE housing_units ADD COLUMN {col} {coltype}")
    conn.commit()
    print(f"[완료] housing_units에 신규 컬럼 {len(new_cols)}개 추가")

    ann_product = {
        r["id"]: r["subscription_type"]
        for r in cur.execute("SELECT id, subscription_type FROM announcements")
    }

    rows = cur.execute(
        "SELECT id, announcement_id, supply_type, income_group, target_group FROM housing_units"
    ).fetchall()

    updates = []
    for r in rows:
        product, method = parse_supply_type(r["supply_type"], ann_product.get(r["announcement_id"]))
        priority_rank, rent_tier, income_pct, income_cond = parse_income_group(r["income_group"])

        # target_group에 배정방식(일반공급 등)이 잘못 들어간 경우(강일리버파크 사례) 보정
        if method is None and r["target_group"]:
            for m in ["특별공급", "우선공급", "일반공급"]:
                if m in r["target_group"]:
                    method = m
                    break

        updates.append(
            (
                product, method, r["supply_type"],
                priority_rank, priority_rank, rent_tier, r["income_group"],
                income_pct, income_cond, r["income_group"],
                r["id"],
            )
        )

    cur.executemany(
        """
        UPDATE housing_units
        SET housing_product_type = ?, allocation_method = ?, supply_type_raw = ?,
            priority_rank = ?, priority_rank_raw = ?, rent_price_tier = ?, rent_price_tier_raw = ?,
            income_threshold_pct = ?, income_threshold_condition = ?, income_group_raw = ?
        WHERE id = ?
        """,
        updates,
    )
    conn.commit()
    print(f"[완료] {len(updates)}개 housing_units 행 분해 완료")

    # 검증 요약
    cur.execute("SELECT COUNT(*) FROM housing_units WHERE housing_product_type IS NULL")
    print(f"[검증] housing_product_type NULL(폴백도 실패): {cur.fetchone()[0]}건")
    cur.execute("SELECT COUNT(*) FROM housing_units WHERE allocation_method IS NULL")
    print(f"[검증] allocation_method NULL: {cur.fetchone()[0]}건")
    cur.execute("SELECT COUNT(*) FROM housing_units WHERE rent_price_tier IS NOT NULL")
    print(f"[검증] rent_price_tier 추출됨: {cur.fetchone()[0]}건")
    cur.execute("SELECT COUNT(*) FROM housing_units WHERE income_threshold_pct IS NOT NULL")
    print(f"[검증] income_threshold_pct 추출됨: {cur.fetchone()[0]}건")

    conn.close()


if __name__ == "__main__":
    main()
