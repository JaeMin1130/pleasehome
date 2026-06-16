import json
import os

# 파일 경로 보장
output_dir = "/home/iru/project03/doc/md/2026_1차_통합공공임대"
os.makedirs(output_dir, exist_ok=True)
output_file = os.path.join(output_dir, "data.json")

# complexes & units
units = []

# 평형 기본 데이터 정의
# (supply_type, exclusive_area, contract_area, target_group, supply_count, prices_list)
# prices_list: [(구간번호, 보증금, 월세)]
types_info = [
    ("51A", 51.83, 115.14, "일반", 221, [
        ("1구간", 38107000, 294870),
        ("2구간", 43551000, 337000),
        ("3구간", 54439000, 421250),
        ("4구간", 70770000, 547630),
        ("5구간", 87102000, 674000),
        ("6구간", 97990000, 758250),
    ]),
    ("51A(주거약자용)", 51.83, 115.14, "주거약자", 38, [
        ("1구간", 38107000, 294870),
        ("2구간", 43551000, 337000),
        ("3구간", 54439000, 421250),
        ("4구간", 70770000, 547630),
        ("5구간", 87102000, 674000),
        ("6구간", 97990000, 758250),
    ]),
    ("51B", 51.94, 116.17, "일반", 21, [
        ("1구간", 38231000, 295830),
        ("2구간", 43692000, 338090),
        ("3구간", 54615000, 422620),
        ("4구간", 71000000, 549400),
        ("5구간", 87385000, 676190),
        ("6구간", 98308000, 760710),
    ]),
    ("51B(주거약자용)", 51.94, 116.17, "주거약자", 8, [
        ("1구간", 38231000, 295830),
        ("2구간", 43692000, 338090),
        ("3구간", 54615000, 422620),
        ("4구간", 71000000, 549400),
        ("5구간", 87385000, 676190),
        ("6구간", 98308000, 760710),
    ]),
    ("59A", 59.98, 133.01, "일반", 114, [
        ("1구간", 43303000, 335080),
        ("2구간", 49490000, 382950),
        ("3구간", 61862000, 478690),
        ("4구간", 80421000, 622300),
        ("5구간", 98980000, 765910),
        ("6구간", 111352000, 861650),
    ]),
    ("59B", 59.87, 134.00, "일반", 58, [
        ("1구간", 43180000, 334130),
        ("2구간", 49348000, 381860),
        ("3구간", 61685000, 477330),
        ("4구간", 80191000, 620520),
        ("5구간", 98697000, 763720),
        ("6구간", 111034000, 859190),
    ]),
    ("59C", 59.75, 133.32, "일반", 58, [
        ("1구간", 43180000, 334130),
        ("2구간", 49348000, 381860),
        ("3구간", 61685000, 477330),
        ("4구간", 80191000, 620520),
        ("5구간", 98697000, 763720),
        ("6구간", 111034000, 859190),
    ])
]

# 기본 임대조건을 유닛에 추가
for supply_type, exclusive_area, contract_area, target, count, prices in types_info:
    for income_gp, dep, rent in prices:
        units.append({
            "complex_name": "다산지금A3",
            "room_number": None,
            "room_count": None,
            "supply_type": supply_type,
            "exclusive_area": exclusive_area,
            "contract_area": contract_area,
            "target_group": target,
            "income_group": income_gp,
            "supply_count": count,
            "reserve_count": 0,
            "deposit": dep,
            "monthly_rent": rent,
            "attributes": f"{income_gp} 기본 임대조건"
        })

# 생계·의료급여 수급자 상한 임대조건 (주거급여 수급자) 추가
# 51A, 51A(주거약자용) 수급자
for stype, target, count in [("51A", "생계·의료급여수급자", 221), ("51A(주거약자용)", "생계·의료급여수급자", 38)]:
    # 1구간
    units.append({
        "complex_name": "다산지금A3",
        "room_number": None,
        "room_count": None,
        "supply_type": stype,
        "exclusive_area": 51.83,
        "contract_area": 115.14,
        "target_group": target,
        "income_group": "1구간",
        "supply_count": count,
        "reserve_count": 0,
        "deposit": 27097000,
        "monthly_rent": 209670,
        "attributes": "주거급여 수급자 상한 임대조건 (1인: 27,097,000원/209,670원, 2인: 30,258,000원/234,130원, 3인: 36,219,000원/280,260원, 4인 이상: 38,107,000원/294,870원)"
    })
    # 2구간
    units.append({
        "complex_name": "다산지금A3",
        "room_number": None,
        "room_count": None,
        "supply_type": stype,
        "exclusive_area": 51.83,
        "contract_area": 115.14,
        "target_group": target,
        "income_group": "2구간",
        "supply_count": count,
        "reserve_count": 0,
        "deposit": 27096000,
        "monthly_rent": 209670,
        "attributes": "주거급여 수급자 상한 임대조건 (1인: 27,096,000원/209,670원, 2인: 30,258,000원/234,130원, 3인: 36,219,000원/280,260원, 4인: 41,819,000원/323,600원, 5인: 43,264,000원/334,780원, 6인 이상: 43,551,000원/337,000원)"
    })

# 51B, 51B(주거약자용) 수급자
for stype, target, count in [("51B", "생계·의료급여수급자", 21), ("51B(주거약자용)", "생계·의료급여수급자", 8)]:
    # 1구간
    units.append({
        "complex_name": "다산지금A3",
        "room_number": None,
        "room_count": None,
        "supply_type": stype,
        "exclusive_area": 51.94,
        "contract_area": 116.17,
        "target_group": target,
        "income_group": "1구간",
        "supply_count": count,
        "reserve_count": 0,
        "deposit": 27097000,
        "monthly_rent": 209670,
        "attributes": "주거급여 수급자 상한 임대조건 (1인: 27,097,000원/209,670원, 2인: 30,258,000원/234,130원, 3인: 36,219,000원/280,260원, 4인 이상: 38,231,000원/295,830원)"
    })
    # 2구간
    units.append({
        "complex_name": "다산지금A3",
        "room_number": None,
        "room_count": None,
        "supply_type": stype,
        "exclusive_area": 51.94,
        "contract_area": 116.17,
        "target_group": target,
        "income_group": "2구간",
        "supply_count": count,
        "reserve_count": 0,
        "deposit": 27096000,
        "monthly_rent": 209670,
        "attributes": "주거급여 수급자 상한 임대조건 (1인: 27,096,000원/209,670원, 2인: 30,258,000원/234,130원, 3인: 36,219,000원/280,260원, 4인: 41,819,000원/323,600원, 5인: 43,264,000원/334,780원, 6인 이상: 43,692,000원/338,090원)"
    })

# 59A 수급자
units.append({
    "complex_name": "다산지금A3",
    "room_number": None,
    "room_count": None,
    "supply_type": "59A",
    "exclusive_area": 59.98,
    "contract_area": 133.01,
    "target_group": "생계·의료급여수급자",
    "income_group": "1구간",
    "supply_count": 114,
    "reserve_count": 0,
    "deposit": 27096000,
    "monthly_rent": 209670,
    "attributes": "주거급여 수급자 상한 임대조건 (1인: 27,096,000원/209,670원, 2인: 30,258,000원/234,130원, 3인: 36,219,000원/280,260원, 4인: 41,819,000원/323,600원, 5인: 43,265,000원/334,780원, 6인 이상: 43,303,000원/335,080원)"
})
units.append({
    "complex_name": "다산지금A3",
    "room_number": None,
    "room_count": None,
    "supply_type": "59A",
    "exclusive_area": 59.98,
    "contract_area": 133.01,
    "target_group": "생계·의료급여수급자",
    "income_group": "2구간",
    "supply_count": 114,
    "reserve_count": 0,
    "deposit": 27097000,
    "monthly_rent": 209670,
    "attributes": "주거급여 수급자 상한 임대조건 (1인: 27,097,000원/209,670원, 2인: 30,258,000원/234,130원, 3인: 36,219,000원/280,260원, 4인: 41,819,000원/323,600원, 5인: 43,265,000원/334,780원, 6인 이상: 49,490,000원/382,950원)"
})

# 59B, 59C 수급자
for stype, count in [("59B", 58), ("59C", 58)]:
    units.append({
        "complex_name": "다산지금A3",
        "room_number": None,
        "room_count": None,
        "supply_type": stype,
        "exclusive_area": 59.87 if stype == "59B" else 59.75,
        "contract_area": 134.00 if stype == "59B" else 133.32,
        "target_group": "생계·의료급여수급자",
        "income_group": "1구간",
        "supply_count": count,
        "reserve_count": 0,
        "deposit": 27096000,
        "monthly_rent": 209670,
        "attributes": "주거급여 수급자 상한 임대조건 (1인: 27,096,000원/209,670원, 2인: 30,258,000원/234,130원, 3인: 36,219,000원/280,260원, 4인: 41,819,000원/323,600원, 5인 이상: 43,180,000원/334,130원)"
    })
    units.append({
        "complex_name": "다산지금A3",
        "room_number": None,
        "room_count": None,
        "supply_type": stype,
        "exclusive_area": 59.87 if stype == "59B" else 59.75,
        "contract_area": 134.00 if stype == "59B" else 133.32,
        "target_group": "생계·의료급여수급자",
        "income_group": "2구간",
        "supply_count": count,
        "reserve_count": 0,
        "deposit": 27096000,
        "monthly_rent": 209670,
        "attributes": "주거급여 수급자 상한 임대조건 (1인: 27,096,000원/209,670원, 2인: 30,258,000원/234,130원, 3인: 36,219,000원/280,260원, 4인: 41,819,000원/323,600원, 5인: 43,264,000원/334,780원, 6인 이상: 49,348,000원/381,860원)"
    })

# 생계·의료급여 수급자 임대조건 (주거급여 비수급자인 경우, 영구임대 기준)
# 51A, 51A(주거약자용): 5,538,000원 / 110,240원
for stype, count in [("51A", 221), ("51A(주거약자용)", 38)]:
    units.append({
        "complex_name": "다산지금A3",
        "room_number": None,
        "room_count": None,
        "supply_type": stype,
        "exclusive_area": 51.83,
        "contract_area": 115.14,
        "target_group": "생계·의료급여수급자",
        "income_group": "영구임대기준",
        "supply_count": count,
        "reserve_count": 0,
        "deposit": 5538000,
        "monthly_rent": 110240,
        "attributes": "주거급여 비수급자인 경우 영구임대 기준 임대조건"
    })

# 51B, 51B(주거약자용): 5,549,000원 / 110,470원
for stype, count in [("51B", 21), ("51B(주거약자용)", 8)]:
    units.append({
        "complex_name": "다산지금A3",
        "room_number": None,
        "room_count": None,
        "supply_type": stype,
        "exclusive_area": 51.94,
        "contract_area": 116.17,
        "target_group": "생계·의료급여수급자",
        "income_group": "영구임대기준",
        "supply_count": count,
        "reserve_count": 0,
        "deposit": 5549000,
        "monthly_rent": 110470,
        "attributes": "주거급여 비수급자인 경우 영구임대 기준 임대조건"
    })

# 59A: 6,408,000원 / 127,570원
units.append({
    "complex_name": "다산지금A3",
    "room_number": None,
    "room_count": None,
    "supply_type": "59A",
    "exclusive_area": 59.98,
    "contract_area": 133.01,
    "target_group": "생계·의료급여수급자",
    "income_group": "영구임대기준",
    "supply_count": 114,
    "reserve_count": 0,
    "deposit": 6408000,
    "monthly_rent": 127570,
    "attributes": "주거급여 비수급자인 경우 영구임대 기준 임대조건"
})

# 59B: 6,397,000원 / 127,340원
units.append({
    "complex_name": "다산지금A3",
    "room_number": None,
    "room_count": None,
    "supply_type": "59B",
    "exclusive_area": 59.87,
    "contract_area": 134.00,
    "target_group": "생계·의료급여수급자",
    "income_group": "영구임대기준",
    "supply_count": 58,
    "reserve_count": 0,
    "deposit": 6397000,
    "monthly_rent": 127340,
    "attributes": "주거급여 비수급자인 경우 영구임대 기준 임대조건"
})

# 59C: 6,384,000원 / 127,080원
units.append({
    "complex_name": "다산지금A3",
    "room_number": None,
    "room_count": None,
    "supply_type": "59C",
    "exclusive_area": 59.75,
    "contract_area": 133.32,
    "target_group": "생계·의료급여수급자",
    "income_group": "영구임대기준",
    "supply_count": 58,
    "reserve_count": 0,
    "deposit": 6384000,
    "monthly_rent": 127080,
    "attributes": "주거급여 비수급자인 경우 영구임대 기준 임대조건"
})

data = {
    "announcement": {
        "title": "다산지금A3 통합공공임대주택 입주자 모집공고",
        "institution": "GH",
        "subscription_type": "통합공공임대",
        "doc_path": "doc/md/2026_1차_통합공공임대/document.md"
    },
    "schedules": [
        {
            "schedule_type": "신청접수",
            "raw_text": "신청접수(온라인/현장): ’26.06.16(화) 10시 ~ 06.19(금) 17시 (현장접수도 동일 기간 10~17시, 점심 12~13시 및 주말 제외)",
            "start_date": "2026-06-16 10:00:00",
            "end_date": "2026-06-19 17:00:00",
            "notes": "현장접수도 동일 기간 10~17시, 점심 12~13시 및 주말 제외"
        },
        {
            "schedule_type": "서류제출",
            "raw_text": "서류제출 대상자 발표: ‘26.07.03(금) 16시 이후",
            "start_date": "2026-07-03 16:00:00",
            "end_date": None,
            "notes": "서류제출 대상자 발표"
        },
        {
            "schedule_type": "서류제출",
            "raw_text": "서류제출 대상자 서류접수: ‘26.07.13(월) ~ ‘26.07.16(목) (우체국 소인분 포함, 등기우편/온라인/현장)",
            "start_date": "2026-07-13 00:00:00",
            "end_date": "2026-07-16 23:59:59",
            "notes": "우체국 소인분 포함, 등기우편/온라인/현장"
        },
        {
            "schedule_type": "당첨자발표",
            "raw_text": "당첨자 발표: ‘26.10.23(금) 16시 이후",
            "start_date": "2026-10-23 16:00:00",
            "end_date": None,
            "notes": "당첨자 발표"
        },
        {
            "schedule_type": "계약체결",
            "raw_text": "계약체결(전자/현장): ‘26.11.10(화) 10시 ~ 11.13(금) 17시",
            "start_date": "2026-11-10 10:00:00",
            "end_date": "2026-11-13 17:00:00",
            "notes": "전자/현장 계약체결"
        }
    ],
    "limits": [
        {
            "target_group": "일반가구",
            "max_support_amount": None,
            "deposit_limit": None,
            "tenant_share": None,
            "interest_rate": None,
            "max_monthly_rent": None,
            "notes": "총자산가액 345,000,000원 이하, 자동차가액 45,420,000원 이하"
        },
        {
            "target_group": "출산자녀 1명 가구",
            "max_support_amount": None,
            "deposit_limit": None,
            "tenant_share": None,
            "interest_rate": None,
            "max_monthly_rent": None,
            "notes": "총자산가액 379,000,000원 이하, 자동차가액 49,960,000원 이하"
        },
        {
            "target_group": "출산자녀 2명 이상 가구",
            "max_support_amount": None,
            "deposit_limit": None,
            "tenant_share": None,
            "interest_rate": None,
            "max_monthly_rent": None,
            "notes": "총자산가액 413,000,000원 이하, 자동차가액 54,510,000원 이하"
        },
        {
            "target_group": "우선공급",
            "max_support_amount": None,
            "deposit_limit": None,
            "tenant_share": None,
            "interest_rate": None,
            "max_monthly_rent": None,
            "notes": "소득기준: 기준 중위소득 100% 이하 (1인 가구 120% 이하, 2인 가구 110% 이하)"
        },
        {
            "target_group": "일반공급",
            "max_support_amount": None,
            "deposit_limit": None,
            "tenant_share": None,
            "interest_rate": None,
            "max_monthly_rent": None,
            "notes": "소득기준: 기준 중위소득 150% 이하 (1인 가구 170% 이하, 2인 가구 160% 이하)"
        },
        {
            "target_group": "주거약자용",
            "max_support_amount": None,
            "deposit_limit": None,
            "tenant_share": None,
            "interest_rate": None,
            "max_monthly_rent": None,
            "notes": "소득기준: 기준 중위소득 150% 이하 (1인 가구 170% 이하, 2인 가구 160% 이하)"
        },
        {
            "target_group": "신혼부부(맞벌이)",
            "max_support_amount": None,
            "deposit_limit": None,
            "tenant_share": None,
            "interest_rate": None,
            "max_monthly_rent": None,
            "notes": "일반공급 소득기준 30%p 가산 우대 적용 (2인 190%, 3인 180% 등)"
        }
    ],
    "complexes": [
        {
            "name": "다산지금A3",
            "address": "경기도 남양주시 다산동 6111번지 일원",
            "heating_type": "지역난방",
            "has_elevator": True,
            "parking_info": "아파트 589대(전기차 30대, 장애인 15대, 경형 58대 포함), 상가 3대 총 592대"
        }
    ],
    "units": units,
    "details": [
        {
            "section_title": "신청자격 소득/자산 기준 요약",
            "section_content": "### 자산보유기준\n- **총자산가액**: 345,000,000원 이하 (출산자녀 1명 379,000,000원, 2명 이상 413,000,000원)\n- **자동차가액**: 45,420,000원 이하 (출산자녀 1명 49,960,000원, 2명 이상 54,510,000원)\n\n### 소득기준\n- **우선공급**: 기준 중위소득 100% 이하 (1인 가구 120% 이하, 2인 가구 110% 이하)\n- **일반공급**: 기준 중위소득 150% 이하 (1인 가구 170% 이하, 2인 가구 160% 이하)\n- **주거약자용**: 기준 중위소득 150% 이하 (1인 가구 170% 이하, 2인 가구 160% 이하)\n- **신혼부부 맞벌이(일반공급)**: 30%p 가산 우대 적용 (2인 190%, 3인 180% 등)",
            "sort_order": 1
        },
        {
            "section_title": "2026년 가구원수별 기준 중위소득 금액",
            "section_content": "| 가구원수 | 기준 중위소득 금액 (원/월) |\n| :--- | :--- |\n| 1인 | 2,564,238원 |\n| 2인 | 4,199,292원 |\n| 3인 | 5,359,036원 |\n| 4인 | 6,494,738원 |\n| 5인 | 7,556,719원 |\n| 6인 | 8,555,952원 |",
            "sort_order": 2
        },
        {
            "section_title": "신청자격 구분 및 소득/자산 기준 상세",
            "section_content": "- **우선공급 소득기준**: 기준 중위소득 100% 이하 (1인 120%, 2인 110%)\n- **일반공급 소득기준**: 기준 중위소득 150% 이하 (1인 170%, 2인 160%)\n- **주거약자용 소득기준**: 기준 중위소득 150% 이하 (1인 170%, 2인 160%)\n- **맞벌이 신혼부부의 경우**: 일반공급 소득기준 30%p 가산 적용\n- **자산보유기준**: 총자산 345,000,000원 이하, 자동차가액 45,420,000원 이하 (출산자녀가 있는 경우 가산 적용)",
            "sort_order": 3
        },
        {
            "section_title": "주의사항",
            "section_content": "- **임대조건 구간 적용**: 본 주택은 통합공공임대주택으로 신청자의 소득 수준(1~6구간)에 따라 임대조건이 다르게 적용됩니다.\n- **수급자 우대 임대조건**: 생계·의료급여 수급자(주거급여 수급자 여부에 따라 상한액 상이) 및 주거급여 비수급자(영구임대 기준)의 경우 별도의 우대 임대조건이 적용되므로 본인의 수급자 유형 및 가구원수에 따른 임대조건을 확인하시기 바랍니다.",
            "sort_order": 4
        }
    ]
}

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("JSON file successfully created!")
