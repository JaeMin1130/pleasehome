#!/usr/bin/env python3
import os
import sys
import json
import re

def clean_address(addr):
    if not addr:
        return ""
    addr = re.sub(r'\s+외(?:\b|\s).*$', '', addr.strip())
    addr = re.sub(r'\s+(?:일원|일대)$', '', addr)
    addr = re.sub(r'\s*\([^)]*\)', '', addr)
    addr = re.sub(r'\s*\([^)]*$', '', addr)
    addr = re.sub(r'\s+', ' ', addr)
    addr = addr.strip()
    if addr and not addr.startswith("서울특별시") and not addr.startswith("서울시") and any(gu in addr for gu in ["구", "시", "군"]):
        if not any(prov in addr for prov in ["경기도", "인천시", "인천광역시", "강원도", "충청", "전라", "경상", "제주"]):
            addr = "서울특별시 " + addr
    if addr.startswith("서울시 "):
        addr = "서울특별시 " + addr[4:]
    return addr.strip()

def clean_name(name):
    if not name:
        return ""
    name = name.strip()
    name = re.sub(r'^\*+', '', name)
    name = re.sub(r'\s*\([^)]*\)', '', name)
    return name.strip()

def parse_int(val):
    if not val:
        return 0
    val_clean = re.sub(r'[^\d-]', '', str(val))
    if val_clean == "-" or not val_clean:
        return 0
    try:
        return int(val_clean)
    except ValueError:
        return 0

def parse_float(val):
    if not val:
        return 0.0
    val_clean = re.sub(r'[^\d.-]', '', str(val))
    if val_clean == "-" or val_clean == "." or val_clean == "-." or not val_clean:
        return 0.0
    try:
        return float(val_clean)
    except ValueError:
        return 0.0

# -------------------------------------------------------------
# 동적 complexes/units 파서 (table_map 기반)
# -------------------------------------------------------------
def parse_tables_by_map(lines, table_map, sub_type, inst, api_meta_data):
    complexes_list = []
    units_list = []
    
    # default 정보 추출
    default_complex_name = table_map.get("default_complex_name")
    default_address = table_map.get("default_address")
    
    if not default_address:
        default_address = "경기도"
        if api_meta_data:
            api_meta_part = api_meta_data.get("api_metadata", {})
            if "dsSbd" in api_meta_part and api_meta_part["dsSbd"]:
                default_address = api_meta_part["dsSbd"][0].get("LCTN_ADR", default_address)
            elif "CNP_CD_NM" in api_meta_part:
                default_address = api_meta_part["CNP_CD_NM"]
                
    if not default_complex_name:
        default_complex_name = "임대단지"
        if api_meta_data:
            api_meta_part = api_meta_data.get("api_metadata", {})
            if "dsSbd" in api_meta_part and api_meta_part["dsSbd"]:
                default_complex_name = api_meta_part["dsSbd"][0].get("BZDT_NM", default_complex_name)
                
    # Complexes 빌드 (기본 단일 단지 우선 등록)
    heating_type = None
    if api_meta_data:
        meta_sbd = api_meta_data.get("api_metadata", {}).get("dsSbd", [{}])[0]
        heating_type = meta_sbd.get("HTN_FMLA_DS_CD_NM")
        
    complexes_list.append({
        "name": default_complex_name,
        "address": default_address,
        "heating_type": heating_type if heating_type else "지역난방",
        "has_elevator": None,
        "parking_info": None,
        "complex_type": "아파트" if ("분양" in sub_type or "공공분양" in sub_type) else "연립주택"
    })
    
    # -------------------------------------------------------------
    # Case A: 이중 테이블 맵 결합 (supply_table_map & price_table_map)
    # -------------------------------------------------------------
    is_dual_map = "supply_table_map" in table_map and "price_table_map" in table_map
    
    if is_dual_map:
        supply_map = table_map["supply_table_map"]
        price_map = table_map["price_table_map"]
        
        # 1. 공급 정보 테이블 파싱 (면적, 세대수)
        supply_info = {}
        in_table = False
        in_target_table = False
        
        s_area_idx = supply_map.get("exclusive_area_column", 4)
        s_type_idx = supply_map.get("room_type_column", 2)
        s_count_idx = supply_map.get("supply_count_column", 12)
        
        s_indices = [idx for idx in [s_area_idx, s_type_idx, s_count_idx] if idx is not None]
        s_max_idx = max(s_indices) if s_indices else 0
        
        for line in lines:
            stripped = line.strip()
            line_clean = re.sub(r'^(?:<br\s*/?>\s*)+', '', stripped).strip()
            line_clean = re.sub(r'(?:<br\s*/?>\s*)+$', '', line_clean).strip()
            
            if line_clean.startswith('|') and line_clean.endswith('|'):
                if re.match(r'^\|[\s\-\|:]+\|$', line_clean):
                    continue
                cells = [c.strip() for c in line_clean.split('|')[1:-1]]
                if len(cells) > 0 and ("주택형" in cells[0] or "구분" in cells[0] or "블록" in cells[0] or "단지명" in cells[0]):
                    in_table = False
                
                # 테이블 감지
                if not in_table:
                    in_table = True
                    header_str = " ".join(cells)
                    if "공급면적" in header_str or "주택면적" in header_str or "금회공급" in header_str:
                        in_target_table = True
                    else:
                        in_target_table = False
                        
                if not in_target_table or len(cells) < s_max_idx + 1:
                    continue
                
                if "주택형" in cells[0] or "구분" in cells[0] or "블록" in cells[0] or cells[0] == "연번" or "합계" in cells[0] or "단지명" in cells[0]:
                    continue
                    
                room_type = clean_name(cells[s_type_idx])
                exclusive_area = parse_float(cells[s_area_idx])
                
                supply_count = 1
                if s_count_idx is not None and s_count_idx < len(cells):
                    cnt_val = parse_int(cells[s_count_idx])
                    if cnt_val > 0:
                        supply_count = cnt_val
                        
                if room_type and room_type != "-" and len(room_type) >= 2:
                    supply_info[room_type] = {
                        "exclusive_area": exclusive_area,
                        "supply_count": supply_count
                    }
            else:
                in_table = False
                in_target_table = False
        
        # 2. 가격 정보 테이블 파싱 & 조인 (분양가, 월세)
        in_table = False
        in_target_table = False
        
        p_type_idx = price_map.get("room_type_column", 1)
        p_dep_idx = price_map.get("deposit_column", 4)
        p_rent_idx = price_map.get("monthly_rent_column")
        
        p_indices = [idx for idx in [p_type_idx, p_dep_idx, p_rent_idx] if idx is not None]
        p_max_idx = max(p_indices) if p_indices else 0
        
        for line in lines:
            stripped = line.strip()
            line_clean = re.sub(r'^(?:<br\s*/?>\s*)+', '', stripped).strip()
            line_clean = re.sub(r'(?:<br\s*/?>\s*)+$', '', line_clean).strip()
            
            if line_clean.startswith('|') and line_clean.endswith('|'):
                if re.match(r'^\|[\s\-\|:]+\|$', line_clean):
                    continue
                cells = [c.strip() for c in line_clean.split('|')[1:-1]]
                if len(cells) > 0 and ("주택형" in cells[0] or "구분" in cells[0] or "타입별" in cells[0] or "임대조건" in cells[0]):
                    in_table = False
                
                if not in_table:
                    in_table = True
                    header_str = " ".join(cells)
                    exclude_words = ["발코니", "확장", "공사비", "추가선택"]
                    if ("주택가격" in header_str or "공급금액" in header_str or "분양가격" in header_str) and not any(w in header_str for w in exclude_words):
                        in_target_table = True
                    else:
                        in_target_table = False
                        
                if not in_target_table or len(cells) < p_max_idx + 1:
                    continue
                
                if "주택형" in cells[0] or "구분" in cells[0] or cells[0] == "연번" or "합계" in cells[0]:
                    continue
                    
                room_type = clean_name(cells[p_type_idx])
                if not room_type or room_type == "-" or len(room_type) < 2 or "합계" in room_type:
                    continue
                    
                dep_val = parse_int(cells[p_dep_idx])
                if "분양" in sub_type or "공공분양" in sub_type:
                    dep_val = dep_val * 1000
                    
                rent_val = parse_int(cells[p_rent_idx]) if p_rent_idx is not None else 0
                
                # 조인 결합
                matched_supply = supply_info.get(room_type)
                if not matched_supply:
                    for skey, sval in supply_info.items():
                        if skey in room_type or room_type in skey:
                            matched_supply = sval
                            break
                            
                exclusive_area = matched_supply["exclusive_area"] if matched_supply else 59.0
                supply_count = matched_supply["supply_count"] if matched_supply else 1
                
                units_list.append({
                    "complex_name": default_complex_name,
                    "room_number": None,
                    "room_count": 3 if ("분양" in sub_type or "공공분양" in sub_type) else 1,
                    "room_type": room_type,
                    "supply_type": "일반공급",
                    "exclusive_area": exclusive_area,
                    "contract_area": None,
                    "target_group": "상관없음",
                    "income_group": "상관없음",
                    "supply_count": supply_count,
                    "reserve_count": 0,
                    "deposit": dep_val,
                    "monthly_rent": rent_val,
                    "max_deposit": None,
                    "min_deposit": None,
                    "max_monthly_rent": None,
                    "min_monthly_rent": None,
                    "attributes": "공공분양 잔여세대 공급" if ("분양" in sub_type) else "매입임대주택 공급"
                })
            else:
                in_table = False
                in_target_table = False

    # -------------------------------------------------------------
    # Case B: 기존 단일 매핑 구조 (SH 청년매입임대 호환성 보장)
    # -------------------------------------------------------------
    else:
        # 단지명/주소 컬럼 인덱스 추출
        c_name_idx = table_map.get("complex_name_column", 4)
        c_addr_idx = table_map.get("address_column", 5)
        
        # complexes 요약 매칭 준비
        summary_complexes = {}
        in_summary_table = False
        
        for line in lines:
            stripped = line.strip()
            if stripped.startswith('|') and stripped.endswith('|'):
                if "대상주택" in stripped and "공급호수" in stripped:
                    in_summary_table = True
                    continue
                if re.match(r'^\|[\s\-\|:]+\|$', stripped):
                    continue
                
                if in_summary_table:
                    cells = [c.strip() for c in stripped.split('|')[1:-1]]
                    if len(cells) < 8 or cells[0] == "합계" or cells[1] == "합계" or cells[0] == "연번":
                        continue
                    gu = cells[0]
                    name_addr_raw = cells[1]
                    
                    if '(' in name_addr_raw:
                        parts = name_addr_raw.split('(', 1)
                        raw_name = parts[0]
                        raw_addr = parts[1]
                    else:
                        raw_name = name_addr_raw
                        raw_addr = ""
                        
                    c_name = clean_name(raw_name)
                    raw_addr = raw_addr.replace(')', '').strip()
                    if not raw_addr and gu:
                        raw_addr = gu
                    elif gu and gu not in raw_addr:
                        raw_addr = gu + " " + raw_addr
                    c_addr = clean_address(raw_addr)
                    
                    if not c_name or not c_addr or c_name == "-" or c_addr == "-":
                        continue
                    
                    c_type = clean_name(cells[4])
                    elevator_raw = cells[6]
                    has_elev = True if "있음" in elevator_raw else (False if "없음" in elevator_raw else None)
                    parking_raw = cells[7]
                    
                    summary_complexes[(c_name, c_addr)] = {
                        "has_elevator": has_elev,
                        "parking_info": parking_raw if parking_raw else None,
                        "complex_type": c_type if c_type else None
                    }
            else:
                in_summary_table = False

        # 상세 호실 데이터 테이블 탐색
        indices_to_check = [
            c_name_idx, c_addr_idx, 
            table_map.get("exclusive_area_column"), 
            table_map.get("deposit_column"), 
            table_map.get("monthly_rent_column"), 
            table_map.get("room_type_column"),
            table_map.get("target_group_column")
        ]
        valid_indices = [idx for idx in indices_to_check if idx is not None]
        max_idx = max(valid_indices) if valid_indices else 0
        
        detail_rows = []
        in_table = False
        in_housing_detail_table = False
        
        for line in lines:
            stripped = line.strip()
            if stripped.startswith('|') and stripped.endswith('|'):
                if re.match(r'^\|[\s\-\|:]+\|$', stripped):
                    continue
                cells = [c.strip() for c in stripped.split('|')[1:-1]]
                
                # 테이블 시작 감지 및 타입 추론
                if not in_table:
                    in_table = True
                    header_str = " ".join(cells)
                    exclude_words = ["구비서류", "신분증", "융자", "HUG", "인증서", "배점", "접수", "일정", "신청자"]
                    include_words = ["주택형", "타입", "면적", "분양가", "공급금액", "세대수", "공급구분", "동·호", "보증금", "임대료"]
                    if any(w in header_str for w in include_words) and not any(w in header_str for w in exclude_words):
                        in_housing_detail_table = True
                    else:
                        in_housing_detail_table = False
                        
                if not in_housing_detail_table:
                    continue
                    
                if len(cells) < max_idx + 1:
                    continue
                
                if "연번" in cells[0] or "구분" in cells[0] or "주택명" in cells[0] or "소재지" in cells[0] or cells[0] == "연번" or cells[0] == "블록" or "단지명" in cells[0]:
                    continue
                
                raw_cname = clean_name(cells[c_name_idx]) if c_name_idx is not None else default_complex_name
                raw_caddr = clean_address(cells[c_addr_idx]) if c_addr_idx is not None else default_address
                if raw_cname and raw_cname != "-" and 2 <= len(raw_cname) <= 100:
                    if c_addr_idx is None or (raw_caddr and raw_caddr != "-" and len(raw_caddr) >= 5):
                        detail_rows.append(cells)
            else:
                in_table = False
                in_housing_detail_table = False

        # Complexes 목록 구축
        complexes_map = {}
        for cells in detail_rows:
            c_name = clean_name(cells[c_name_idx]) if c_name_idx is not None else default_complex_name
            c_addr = clean_address(cells[c_addr_idx]) if c_addr_idx is not None else default_address
            
            comp_key = (c_name, c_addr)
            if comp_key not in complexes_map:
                matched_summary = summary_complexes.get(comp_key)
                if not matched_summary:
                    for skey, svalue in summary_complexes.items():
                        s_name, s_addr = skey
                        if s_name == c_name and s_name not in ["주건축물제1동", "명칭없음", "B동", "A단지", "B단지", "-"]:
                            matched_summary = svalue
                            break
                
                complexes_map[comp_key] = {
                    "name": c_name,
                    "address": c_addr,
                    "heating_type": heating_type if heating_type else None,
                    "has_elevator": matched_summary["has_elevator"] if matched_summary else None,
                    "parking_info": matched_summary["parking_info"] if matched_summary else None,
                    "complex_type": matched_summary["complex_type"] if matched_summary else None
                }
                # default 단지가 중복 등록되지 않게 complexes_list 재조정
                if not any(cp.get("name") == c_name for cp in complexes_list):
                    complexes_list.append(complexes_map[comp_key])

        # Units 목록 구축
        is_multi_tier_lease = "deposit_column" not in table_map and "deposit_tier_1_youth_column" in table_map
        
        if is_multi_tier_lease:
            units_groups = {}
            for cells in detail_rows:
                c_name = clean_name(cells[c_name_idx]) if c_name_idx is not None else default_complex_name
                c_addr = clean_address(cells[c_addr_idx]) if c_addr_idx is not None else default_address
                gubun = cells[1] if len(cells) > 1 else "신규공급"
                
                room_type_idx = table_map.get("room_type_column", 6)
                structure_idx = table_map.get("room_structure_column", 7)
                exclusive_area_idx = table_map.get("exclusive_area_column", 9)
                gender_idx = table_map.get("gender_column", 8)
                
                room_type = clean_name(cells[room_type_idx])
                structure = cells[structure_idx]
                exclusive_area = parse_float(cells[exclusive_area_idx])
                gender = cells[gender_idx] if len(cells) > gender_idx else "-"
                
                room_count = 1
                if "투룸" in structure or "2룸" in structure or "쓰리룸" in structure or "3룸" in structure:
                    room_count = 2 if ("투" in structure or "2" in structure) else 3
                if not room_type or room_type == "-":
                    room_type = f"{int(exclusive_area)}형"
                    
                p1 = parse_int(cells[table_map["deposit_tier_1_youth_column"]])
                p2 = parse_int(cells[table_map["rent_tier_1_youth_column"]])
                p3 = parse_int(cells[table_map["deposit_tier_1_student_column"]])
                p4 = parse_int(cells[table_map["rent_tier_1_student_column"]])
                p5 = parse_int(cells[table_map["deposit_tier_2_youth_column"]])
                p6 = parse_int(cells[table_map["rent_tier_2_youth_column"]])
                p7 = parse_int(cells[table_map["deposit_tier_2_student_column"]])
                p8 = parse_int(cells[table_map["rent_tier_2_student_column"]])
                
                prices_tuple = (p1, p2, p3, p4, p5, p6, p7, p8)
                
                group_key = (c_name, c_addr, room_type, room_count, exclusive_area, prices_tuple, gubun, gender)
                if group_key not in units_groups:
                    units_groups[group_key] = []
                units_groups[group_key].append(cells)
                
            for group_key, rows in units_groups.items():
                c_name, c_addr, room_type, room_count, exclusive_area, prices, gubun, gender = group_key
                p1, p2, p3, p4, p5, p6, p7, p8 = prices
                supply_count = len(rows)
                
                attributes_extra = f"{gubun}주택"
                if gender and gender != "-":
                    attributes_extra += f" ({gender}전용)"
                    
                units_list.append({
                    "complex_name": c_name, "room_number": None, "room_count": room_count, "room_type": room_type,
                    "supply_type": "일반공급", "exclusive_area": exclusive_area, "contract_area": None,
                    "target_group": "청년", "income_group": "1순위 청년", "supply_count": supply_count, "reserve_count": 0,
                    "deposit": p1, "monthly_rent": p2, "max_deposit": None, "min_deposit": None,
                    "max_monthly_rent": None, "min_monthly_rent": None, "attributes": attributes_extra
                })
                units_list.append({
                    "complex_name": c_name, "room_number": None, "room_count": room_count, "room_type": room_type,
                    "supply_type": "일반공급", "exclusive_area": exclusive_area, "contract_area": None,
                    "target_group": "대학생 및 취업준비생", "income_group": "1순위 대학생 및 취업준비생", "supply_count": supply_count, "reserve_count": 0,
                    "deposit": p3, "monthly_rent": p4, "max_deposit": None, "min_deposit": None,
                    "max_monthly_rent": None, "min_monthly_rent": None, "attributes": f"{gubun}주택 (보증금의 임대료 전환 불가)"
                })
                units_list.append({
                    "complex_name": c_name, "room_number": None, "room_count": room_count, "room_type": room_type,
                    "supply_type": "일반공급", "exclusive_area": exclusive_area, "contract_area": None,
                    "target_group": "청년", "income_group": "2~3순위 청년", "supply_count": supply_count, "reserve_count": 0,
                    "deposit": p5, "monthly_rent": p6, "max_deposit": None, "min_deposit": None,
                    "max_monthly_rent": None, "min_monthly_rent": None, "attributes": attributes_extra
                })
                units_list.append({
                    "complex_name": c_name, "room_number": None, "room_count": room_count, "room_type": room_type,
                    "supply_type": "일반공급", "exclusive_area": exclusive_area, "contract_area": None,
                    "target_group": "대학생 및 취업준비생", "income_group": "2~3순위 대학생 및 취업준비생", "supply_count": supply_count, "reserve_count": 0,
                    "deposit": p7, "monthly_rent": p8, "max_deposit": None, "min_deposit": None,
                    "max_monthly_rent": None, "min_monthly_rent": None, "attributes": f"{gubun}주택 (보증금의 임대료 전환 불가)"
                })
                
        else:
            units_groups = {}
            dep_idx = table_map.get("deposit_column")
            rent_idx = table_map.get("monthly_rent_column")
            area_idx = table_map.get("exclusive_area_column")
            room_type_idx = table_map.get("room_type_column")
            target_group_idx = table_map.get("target_group_column")
            
            for cells in detail_rows:
                c_name = clean_name(cells[c_name_idx]) if c_name_idx is not None else default_complex_name
                c_addr = clean_address(cells[c_addr_idx]) if c_addr_idx is not None else default_address
                
                exclusive_area = parse_float(cells[area_idx]) if area_idx is not None else 0.0
                dep_val = parse_int(cells[dep_idx]) if dep_idx is not None else 0
                if "분양" in sub_type or "공공분양" in sub_type:
                    dep_val = dep_val * 1000
                    
                rent_val = parse_int(cells[rent_idx]) if rent_idx is not None else 0
                room_type = clean_name(cells[room_type_idx]) if room_type_idx is not None else f"{int(exclusive_area)}형"
                target_group = cells[target_group_idx] if (target_group_idx is not None and len(cells) > target_group_idx) else "상관없음"
                
                group_key = (c_name, c_addr, room_type, exclusive_area, dep_val, rent_val, target_group)
                if group_key not in units_groups:
                    units_groups[group_key] = 0
                units_groups[group_key] += 1
                
            for group_key, supply_count in units_groups.items():
                c_name, c_addr, room_type, exclusive_area, dep_val, rent_val, target_group = group_key
                room_count = 3 if ("분양" in sub_type or "공공분양" in sub_type) else 1
                
                units_list.append({
                    "complex_name": c_name,
                    "room_number": None,
                    "room_count": room_count,
                    "room_type": room_type,
                    "supply_type": "일반공급",
                    "exclusive_area": exclusive_area,
                    "contract_area": None,
                    "target_group": target_group if target_group != "-" else "상관없음",
                    "income_group": "상관없음",
                    "supply_count": supply_count,
                    "reserve_count": 0,
                    "deposit": dep_val,
                    "monthly_rent": rent_val,
                    "max_deposit": None,
                    "min_deposit": None,
                    "max_monthly_rent": None,
                    "min_monthly_rent": None,
                    "attributes": "공공분양 잔여세대 공급" if ("분양" in sub_type) else "매입임대주택 공급"
                })
                
    # 첫 번째 기본 단지 정보가 complexes_list에 잘 안착했는지 체크하고 빈 단지 소거
    complexes_list = [cp for cp in complexes_list if cp.get("name") and cp.get("name") != "임대단지"]
    if not complexes_list and default_complex_name:
        complexes_list.append({
            "name": default_complex_name,
            "address": default_address,
            "heating_type": heating_type if heating_type else "지역난방",
            "has_elevator": None,
            "parking_info": None,
            "complex_type": "아파트" if ("분양" in sub_type or "공공분양" in sub_type) else "연립주택"
        })
        
    return complexes_list, units_list

def main():
    if len(sys.argv) < 2:
        print("사용법: python3 hybrid_parser.py <공고_폴더_경로>")
        sys.exit(1)
        
    folder_path = sys.argv[1].strip()
    if not os.path.exists(folder_path):
        print(f"[에러] 공고 폴더 경로가 존재하지 않습니다: {folder_path}", file=sys.stderr)
        sys.exit(1)
        
    meta_json_path = os.path.join(folder_path, "data.json")
    parser_source_md_path = os.path.join(folder_path, "document_parser_source.md")
    dest_json_path = os.path.join(folder_path, "data.json")
    
    meta_data = {}
    if os.path.exists(meta_json_path) and os.path.getsize(meta_json_path) > 0:
        try:
            with open(meta_json_path, "r", encoding="utf-8") as f:
                meta_data = json.load(f)
        except Exception as e:
            print(f"[경고] data.json 로드 실패: {e}", file=sys.stderr)
            
    if not meta_data:
        meta_data = {
            "announcement": {},
            "schedules": [],
            "limits": [],
            "details": [],
            "complexes": [],
            "units": []
        }
        
    api_meta_path = os.path.join(folder_path, "api_meta.json")
    api_meta_data = {}
    if os.path.exists(api_meta_path):
        try:
            with open(api_meta_path, "r", encoding="utf-8") as f:
                api_meta_data = json.load(f)
                meta_data["api_metadata"] = api_meta_data.get("api_metadata", {})
                if "inferred_standards" in api_meta_data:
                    meta_data["inferred_standards"] = api_meta_data["inferred_standards"]
        except Exception as e:
            print(f"[경고] api_meta.json 로드 실패: {e}", file=sys.stderr)
            
    if not os.path.exists(parser_source_md_path):
        print(f"[에러] 테이블 소스 파일이 존재하지 않습니다: {parser_source_md_path}", file=sys.stderr)
        sys.exit(1)
        
    with open(parser_source_md_path, "r", encoding="utf-8") as f:
        md_content = f.read()
        
    lines = md_content.split('\n')
    
    inferred = meta_data.get("inferred_standards", {})
    sub_type = inferred.get("subscription_type", "")
    inst = inferred.get("institution", "")
    is_dist = inferred.get("is_distributed", False)
    
    folder_name = os.path.basename(folder_path)
    if folder_name.startswith("SH_"):
        if not inst: inst = "SH"
        if not sub_type: sub_type = "매입임대"
    elif folder_name.startswith("LH_"):
        if not inst: inst = "LH"
    
    if not sub_type:
        title = meta_data.get("announcement", {}).get("title", "")
        if not title and "api_metadata" in meta_data:
            title = meta_data["api_metadata"].get("PAN_NM", "")
        if "매입임대" in title or "매입" in title:
            sub_type = "매입임대"
        elif "분양" in title or "신혼희망타운" in title:
            sub_type = "공공분양"
            
    if not inst:
        title = meta_data.get("announcement", {}).get("title", "")
        if "LH" in title:
            inst = "LH"
        elif "SH" in title:
            inst = "SH"
            
    complexes = []
    units = []
    
    table_map = meta_data.get("table_map", {})
    
    if is_dist:
        print("[하이브리드 파서] 외부 엑셀 배포 형태 공고이므로 complexes 및 units 파싱을 건너뜁니다.")
    elif table_map:
        print("[하이브리드 파서] table_map 기반 동적 추출 알고리즘을 가동합니다.")
        complexes, units = parse_tables_by_map(lines, table_map, sub_type, inst, meta_data)
    else:
        print("[하이브리드 파서] 기본 매핑을 가동합니다.")
        complexes, units = parse_tables_by_map(lines, table_map, sub_type, inst, meta_data)
        
    meta_data["complexes"] = complexes
    meta_data["units"] = units
    
    # table_map 은 최종 data.json에 적재되지 않도록 제거
    meta_data.pop("table_map", None)
    
    if not meta_data.get("announcement", {}).get("title"):
        title = meta_data.get("api_metadata", {}).get("PAN_NM", "")
        if not title:
            title = folder_name
        meta_data["announcement"] = {
            "title": title,
            "institution": inst if inst else "LH",
            "subscription_type": sub_type if sub_type else "매입임대",
            "region": meta_data.get("api_metadata", {}).get("CNP_CD_NM", "서울특별시")
        }
        
    with open(dest_json_path, "w", encoding="utf-8") as f:
        json.dump(meta_data, f, ensure_ascii=False, indent=2)
        
    print(f"[완료] {dest_json_path} 최종 병합 데이터 파일이 생성되었습니다. (단지: {len(complexes)}개, 유닛: {len(units)}개)")

if __name__ == "__main__":
    main()
