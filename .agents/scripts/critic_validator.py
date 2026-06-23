#!/usr/bin/env python3
import os
import sys
import json
import re
from datetime import datetime

def validate_announcement(data, features):
    errors = []
    
    ann = data.get("announcement", {})
    title = ann.get("title", "")
    inst = ann.get("institution", "")
    sub_type = ann.get("subscription_type", "")
    
    # 1. 시행기관 및 유형 검증
    valid_institutions = ["LH", "SH", "GH", "iH", "HUG", "민간"]
    valid_sub_types = [
        "행복주택", "장기전세", "장기전세2", "국민임대", "영구임대", 
        "통합공공임대", "공공임대", "매입임대", "전세임대", "든든전세", 
        "청년안심", "장기안심", "희망하우징", "50년공공임대"
    ]
    
    if not title:
        errors.append("공고 제목(title)이 누락되었습니다.")
    if inst not in valid_institutions:
        errors.append(f"유효하지 않은 시행 기관입니다: '{inst}'. ({', '.join(valid_institutions)} 중 하나여야 합니다.)")
    if sub_type not in valid_sub_types:
        errors.append(f"유효하지 않은 청약 유형입니다: '{sub_type}'. ({', '.join(valid_sub_types)} 중 하나여야 합니다.)")

    # 2. 7대 인자에 따른 구조적 상호 배타성 검증
    has_complexes = features.get("has_complexes", True)
    is_distributed = features.get("is_distributed", False)
    
    complexes = data.get("complexes", [])
    units = data.get("units", [])
    limits = data.get("limits", [])
    
    if has_complexes:
        if not complexes and not is_distributed:
            errors.append("has_complexes가 True이지만 complexes 목록이 비어있습니다.")
        if not units and not is_distributed:
            errors.append("has_complexes가 True이지만 units 목록이 비어있습니다.")
        if limits:
            errors.append("has_complexes가 True일 때 limits(지원한도액)는 비어있어야 합니다.")
    else:
        if complexes:
            errors.append("has_complexes가 False일 때 complexes(단지)는 비어있어야 합니다.")
        if units:
            errors.append("has_complexes가 False일 때 units(평형)는 비어있어야 합니다.")
        if not limits:
            errors.append("has_complexes가 False이지만 limits(지원한도액) 목록이 비어있습니다.")

    # 3. Relational Integrity (단지명 매핑 검증)
    if has_complexes and not is_distributed:
        complex_names = {c.get("name") for c in complexes if c.get("name")}
        for idx, unit in enumerate(units):
            comp_name = unit.get("complex_name")
            if not comp_name:
                errors.append(f"units[{idx}]의 complex_name이 누락되었습니다.")
            elif comp_name not in complex_names:
                errors.append(f"units[{idx}]의 complex_name '{comp_name}'은 complexes 목록에 존재하지 않습니다.")

    # 4. 일정(Schedules) 날짜 선후 관계 및 포맷 검증
    schedules = data.get("schedules", [])
    schedule_dates = {}
    
    for idx, sched in enumerate(schedules):
        s_type = sched.get("schedule_type")
        start_str = sched.get("start_date")
        end_str = sched.get("end_date")
        
        # 포맷 검증 (YYYY-MM-DD HH:MM:SS)
        date_pattern = r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$'
        if start_str and not re.match(date_pattern, start_str):
            errors.append(f"schedules[{idx}] ({s_type})의 start_date '{start_str}' 포맷이 올바르지 않습니다. (YYYY-MM-DD HH:MM:SS)")
        if end_str and not re.match(date_pattern, end_str):
            errors.append(f"schedules[{idx}] ({s_type})의 end_date '{end_str}' 포맷이 올바르지 않습니다. (YYYY-MM-DD HH:MM:SS)")
            
        # 논리 선후 관계 검증 (start <= end)
        if start_str and end_str and re.match(date_pattern, start_str) and re.match(date_pattern, end_str):
            start_dt = datetime.strptime(start_str, "%Y-%m-%d %H:%M:%S")
            end_dt = datetime.strptime(end_str, "%Y-%m-%d %H:%M:%S")
            if start_dt > end_dt:
                errors.append(f"schedules[{idx}] ({s_type})의 시작 일시({start_str})가 종료 일시({end_str})보다 늦습니다.")
            
            schedule_dates[s_type] = (start_dt, end_dt)

    # 일정 간의 논리 선후 관계 검증
    # 청약접수 -> 당첨자발표 -> 계약체결 순이어야 함
    try:
        apply_start = schedule_dates.get("신청접수", (None, None))[0]
        announce_start = schedule_dates.get("당첨자발표", (None, None))[0]
        contract_start = schedule_dates.get("계약체결", (None, None))[0]
        
        if apply_start and announce_start and apply_start > announce_start:
            errors.append(f"신청접수 시작일({apply_start})이 당첨자발표일({announce_start})보다 늦습니다.")
        if announce_start and contract_start and announce_start > contract_start:
            errors.append(f"당첨자발표일({announce_start})이 계약체결일({contract_start})보다 늦습니다.")
    except Exception as e:
        pass

    # 5. 상호전환 범위 및 수학적 정합성 검증
    has_mutual_conversion = features.get("has_mutual_conversion", True)
    if not has_mutual_conversion:
        # 상호전환 불가능한 경우, 관련 전환 금액들은 모두 null이어야 함
        for idx, unit in enumerate(units):
            for col in ["max_deposit", "min_deposit", "max_monthly_rent", "min_monthly_rent"]:
                if unit.get(col) is not None:
                    errors.append(f"has_mutual_conversion이 False이나 units[{idx}]의 {col}이 null이 아닙니다 (값: {unit[col]}).")
    else:
        # 상호전환 가능한 경우
        for idx, unit in enumerate(units):
            deposit = unit.get("deposit")
            rent = unit.get("monthly_rent")
            max_dep = unit.get("max_deposit")
            min_dep = unit.get("min_deposit")
            max_rent = unit.get("max_monthly_rent")
            min_rent = unit.get("min_monthly_rent")
            
            # None이 아닌 경우에 한해 범위 검증
            if deposit is not None:
                if max_dep is not None and deposit > max_dep:
                    errors.append(f"units[{idx}]의 기본 보증금({deposit})이 최대 전환 보증금({max_dep})보다 큽니다.")
                if min_dep is not None and deposit < min_dep:
                    errors.append(f"units[{idx}]의 기본 보증금({deposit})이 최소 전환 보증금({min_dep})보다 작습니다.")
            if rent is not None:
                if max_rent is not None and rent > max_rent:
                    errors.append(f"units[{idx}]의 기본 월임대료({rent})이 최대 전환 임대료({max_rent})보다 큽니다.")
                if min_rent is not None and rent < min_rent:
                    errors.append(f"units[{idx}]의 기본 월임대료({rent})이 최소 전환 임대료({min_rent})보다 작습니다.")
                    
            # 수학적 역관계 검증 (보증금이 늘어나면 임대료는 줄어들어야 함)
            # max_deposit 일 때 min_monthly_rent 여야 하고, min_deposit 일 때 max_monthly_rent 여야 함
            # 단, 공고문에 전환 금액이 일부 누락되었을 수 있으므로 값이 다 있는 경우만 매칭 검증
            if max_dep is not None and min_rent is not None and deposit is not None and rent is not None:
                if max_dep > deposit and min_rent >= rent and rent > 0:
                    errors.append(f"units[{idx}]의 보증금은 증액(기본:{deposit} -> 최대:{max_dep})되었는데 월임대료는 감액(기본:{rent} -> 최소:{min_rent})되지 않았습니다.")
            if min_dep is not None and max_rent is not None and deposit is not None and rent is not None:
                if min_dep < deposit and max_rent <= rent:
                    errors.append(f"units[{idx}]의 보증금은 감액(기본:{deposit} -> 최소:{min_dep})되었는데 월임대료는 증액(기본:{rent} -> 최대:{max_rent})되지 않았습니다.")

    # 6. 예비입주자 모집 공고인 경우 검증
    is_reserve_only = features.get("is_reserve_only", False)
    if is_reserve_only:
        for idx, unit in enumerate(units):
            sup_cnt = unit.get("supply_count", 0)
            res_cnt = unit.get("reserve_count", 0)
            if sup_cnt != 0:
                errors.append(f"is_reserve_only가 True이나 units[{idx}]의 supply_count({sup_cnt})가 0이 아닙니다.")
            if res_cnt <= 0:
                # 비록 예비자수만 뽑는다 해도 모집 인원이 있어야 하므로 경고/에러 처리
                errors.append(f"is_reserve_only가 True이나 units[{idx}]의 reserve_count({res_cnt})가 0 이하입니다.")

    return errors

def main():
    if len(sys.argv) < 3:
        print("사용법: python3 critic_validator.py <parsed_json_path> <features_json_or_path>")
        sys.exit(1)
        
    parsed_path = sys.argv[1]
    features_arg = sys.argv[2]
    
    if not os.path.exists(parsed_path):
        print(json.dumps({"status": "FAIL", "errors": [f"파싱 결과 파일을 찾을 수 없습니다: {parsed_path}"]}))
        sys.exit(1)
        
    with open(parsed_path, "r", encoding="utf-8") as f:
        parsed_data = json.load(f)
        
    # features_arg가 파일 경로인지 검사, 아니면 JSON 문자열로 간주
    if os.path.exists(features_arg):
        with open(features_arg, "r", encoding="utf-8") as f:
            features_data = json.load(f)
    else:
        try:
            features_data = json.loads(features_arg)
        except Exception as e:
            print(json.dumps({"status": "FAIL", "errors": [f"features 인자 파싱 에러: {e}"]}))
            sys.exit(1)
            
    # 만약 features_data 안에 'features' 키가 있으면 추출
    if "features" in features_data:
        features_data = features_data["features"]
        
    errors = validate_announcement(parsed_data, features_data)
    
    if errors:
        # 서브에이전트에게 보낼 구체적 피드백 생성
        feedback_msgs = [f"- {err}" for err in errors]
        feedback = "데이터 추출 결과에 아래와 같은 데이터 정합성 오류가 감지되었습니다. 지침(7-Feature Logic) 및 비즈니스 룰을 다시 정독하고, 아래 오류들을 해결할 수 있도록 데이터를 올바르게 재추출해 주십시오:\n" + "\n".join(feedback_msgs)
        
        result = {
            "status": "FAIL",
            "errors": errors,
            "feedback": feedback
        }
    else:
        result = {
            "status": "SUCCESS"
        }
        
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
