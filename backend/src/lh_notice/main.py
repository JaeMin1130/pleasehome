import os
import argparse
import requests
import json
from dotenv import load_dotenv
from api import get_lease_notice_list, get_lease_notice_detail

# 환경변수 설정
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env.local")
load_dotenv(dotenv_path=env_path)

PDF_SAVE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "docs", "pdf")

def download_file(url, save_path):
    """주어진 URL의 파일을 로컬 경로에 다운로드"""
    response = requests.get(url, stream=True)
    response.raise_for_status()
    with open(save_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    print(f"[완료] 다운로드: {save_path}")

# 지역 명칭과 공식 지역코드 매핑 테이블
REGION_CODE_MAP = {
    "서울": "11",
    "부산": "26",
    "대구": "27",
    "인천": "28",
    "광주": "29",
    "대전": "30",
    "울산": "31",
    "세종": "36110",
    "경기": "41",
    "강원": "42",
    "충북": "43",
    "충남": "44",
    "전북": "52",
    "전남": "46",
    "경북": "47",
    "경남": "48",
    "제주": "50"
}

def main():
    parser = argparse.ArgumentParser(description="LH 분양임대공고 및 첨부파일(PDF, 엑셀) 자동 다운로드 스크립트")
    parser.add_argument("--start-date", required=True, help="조회 시작일 (YYYY-MM-DD)")
    parser.add_argument("--end-date", required=True, help="조회 종료일 (YYYY-MM-DD)")
    parser.add_argument("--regions", nargs="*", default=[], help="필터링할 지역 키워드 목록 (예: 서울 경기 인천)")
    parser.add_argument("--pan-nm", help="검색할 공고명 키워드 (예: 양주회천)")
    parser.add_argument("--pan-ss", help="공고상태 필터 (예: 공고중, 접수중, 접수마감, 정정공고중)")
    
    args = parser.parse_args()
    
    # YYYY-MM-DD 또는 YYYYMMDD 형식을 YYYYMMDD로 정제
    start_date_formatted = args.start_date.replace("-", "")
    end_date_formatted = args.end_date.replace("-", "")
    
    if not os.path.exists(PDF_SAVE_DIR):
        os.makedirs(PDF_SAVE_DIR)
        
    # 입력된 지역명을 지역코드로 변환
    target_cnp_codes = []
    if args.regions:
        for reg in args.regions:
            found = False
            for name, code in REGION_CODE_MAP.items():
                if name in reg or reg in name:
                    target_cnp_codes.append(code)
                    found = True
                    break
            if not found:
                print(f"[경고] 매핑 테이블에 존재하지 않는 지역명입니다: {reg}")
                
    # 조회할 지역코드 목록 설정 (지정되지 않았거나 매핑 실패 시 전체 조회)
    query_cnp_codes = target_cnp_codes if target_cnp_codes else [None]
    
    # 수집 대상 주거용 상위매물유형코드 (05: 분양주택, 06: 임대주택, 13: 주거복지, 39: 신혼희망타운)
    residential_types = ["05", "06", "13", "39"]
    type_desc_map = {
        "05": "분양주택",
        "06": "임대주택",
        "13": "주거복지",
        "39": "신혼희망타운"
    }
    
    # 지역코드 및 매물유형별 공고 목록 조회 및 통합 (중복 제거)
    all_notices = {}
    
    for cnp_code in query_cnp_codes:
        region_str = [k for k, v in REGION_CODE_MAP.items() if v == cnp_code]
        region_desc = region_str[0] if region_str else "전체"
        
        for ais_type in residential_types:
            type_desc = type_desc_map.get(ais_type, ais_type)
            extra_log = ""
            if args.pan_nm:
                extra_log += f", 공고명필터: '{args.pan_nm}'"
            if args.pan_ss:
                extra_log += f", 상태필터: '{args.pan_ss}'"
                
            print(f"\n1. 분양임대공고 목록 조회 중... (지역: {region_desc}, 유형: {type_desc}, 기간: {start_date_formatted} ~ {end_date_formatted}{extra_log})")
            try:
                list_data = get_lease_notice_list(
                    page_no=1, 
                    page_size=100, 
                    start_date=start_date_formatted, 
                    end_date=end_date_formatted,
                    cnp_cd=cnp_code,
                    upp_ais_tp_cd=ais_type,
                    pan_nm=args.pan_nm,
                    pan_ss=args.pan_ss
                )
                
                # dsList 파싱
                notices = []
                for item in list_data:
                    if isinstance(item, dict) and "dsList" in item:
                        notices = item["dsList"]
                        break
                        
                for notice in notices:
                    pan_id = notice.get("PAN_ID")
                    if pan_id:
                        all_notices[pan_id] = notice
            except Exception as e:
                print(f"목록 조회 실패(지역코드: {cnp_code}, 유형: {ais_type}): {e}")
            
    notices_list = list(all_notices.values())
            
    if not notices_list:
        print("공고 목록을 찾을 수 없거나 해당 기간에 데이터가 없습니다.")
        return

    print(f"\n총 {len(notices_list)}건의 고유 분양임대공고를 수집했습니다. 상세 조회를 시작합니다.")
    
    for notice in notices_list:
        title = notice.get("PAN_NM", "")
        cnp_nm = notice.get("CNP_CD_NM", "")
        
        # 지역코드 변환을 거치지 못한 텍스트 매칭용 2차 검증 필터 (전체 조회 [None] 시에만 작동)
        if query_cnp_codes == [None] and args.regions:
            if not any(region in title or region in cnp_nm for region in args.regions):
                continue
                
        pan_id = notice.get("PAN_ID")
        pan_dt = notice.get("PAN_DT", "")
        spl_inf_tp_cd = notice.get("SPL_INF_TP_CD")
        sys_ds_cd = notice.get("CCR_CNNT_SYS_DS_CD")
        upp_ais_tp_cd = notice.get("UPP_AIS_TP_CD")
        ais_tp_cd = notice.get("AIS_TP_CD")
            
        print(f"\n[{title}] 상세 조회 중...")
        
        try:
            detail_data = get_lease_notice_detail(
                spl_inf_tp_cd=spl_inf_tp_cd, 
                ccr_cnnt_sys_ds_cd=sys_ds_cd, 
                pan_id=pan_id, 
                upp_ais_tp_cd=upp_ais_tp_cd, 
                ais_tp_cd=ais_tp_cd
            )
            
            # 공고별 전용 폴더 생성: LH_{PAN_ID}_{PAN_DT}
            folder_name = f"LH_{pan_id}_{pan_dt}"
            notice_dir = os.path.join(PDF_SAVE_DIR, folder_name)
            os.makedirs(notice_dir, exist_ok=True)
            
            # 목록 응답 + 상세 응답을 공고 단위로 flat merge
            merged_meta = dict(notice)
            for item in detail_data:
                if isinstance(item, dict):
                    for key, val in item.items():
                        if key != "dsSch":  # 요청 파라미터 echo 제외
                            merged_meta[key] = val
            merged_meta["_institution"] = "LH"
            merged_meta["_files"] = []
            
            # 첨부파일 추출 및 다운로드
            attachments = []
            for item in detail_data:
                if isinstance(item, dict):
                    for key, val in item.items():
                        if isinstance(val, list) and "Ahfl" in key:
                            attachments.extend(val)
                            
            for file_info in attachments:
                file_name = file_info.get("CMN_AHFL_NM", file_info.get("AHFL_NM", ""))
                download_url = file_info.get("AHFL_URL", "")
                
                if not file_name or not download_url:
                    continue
                    
                if file_name.lower().endswith((".pdf", ".xls", ".xlsx")):
                    # 블랙리스트 필터링: 제외 키워드
                    blacklist = ["팸플릿", "수집", "제출", "제3자"]
                    if any(kw in file_name for kw in blacklist):
                        print(f" -> 파일 제외 (블랙리스트): {file_name}")
                        continue

                    # 화이트리스트 필터링: 무관한 파일 제외
                    whitelist = ["공고", "모집", "안내", "목록", "주택", "입주자격"]
                    if not any(kw in file_name.lower() for kw in whitelist):
                        continue
                        
                    save_path = os.path.join(notice_dir, file_name)
                    print(f" -> 파일 발견: {file_name}")
                    if os.path.exists(save_path):
                        print("    이미 존재하는 파일입니다. 건너뜁니다.")
                    else:
                        download_file(download_url, save_path)
                    
                    if file_name not in merged_meta["_files"]:
                        merged_meta["_files"].append(file_name)
            
            # 공고별 download_meta.json 저장
            meta_path = os.path.join(notice_dir, "download_meta.json")
            try:
                with open(meta_path, "w", encoding="utf-8") as f:
                    json.dump(merged_meta, f, ensure_ascii=False, indent=2)
                print(f" -> download_meta.json 저장 완료: {meta_path}")
            except Exception as me:
                print(f"[경고] download_meta.json 작성 실패: {me}")
            
            # docs/pdf/announcement_map.json 공고 매핑 기록 갱신
            map_path = os.path.join(PDF_SAVE_DIR, "announcement_map.json")
            map_data = {"LH": {}, "SH": {}, "GH": {}, "민간": {}, "기타": {}}
            if os.path.exists(map_path):
                try:
                    with open(map_path, "r", encoding="utf-8") as f:
                        loaded_data = json.load(f)
                        # 로드된 데이터 복사 및 누락된 키 보강
                        for k, v in map_data.items():
                            map_data[k] = loaded_data.get(k, {})
                except Exception as re:
                    print(f"[경고] announcement_map.json 읽기 실패: {re}")
            
            # 기관 분류 매핑
            inst_key = merged_meta.get("_institution", "기타").upper()
            if inst_key not in ["LH", "SH", "GH", "민간"]:
                if "민간" in inst_key:
                    inst_key = "민간"
                else:
                    inst_key = "기타"
            
            map_data[inst_key][pan_id] = title
            
            try:
                with open(map_path, "w", encoding="utf-8") as f:
                    json.dump(map_data, f, ensure_ascii=False, indent=2)
                print(f" -> announcement_map.json 매핑 기록 완료 (기관: {inst_key})")
            except Exception as we:
                print(f"[경고] announcement_map.json 쓰기 실패: {we}")
                    
        except Exception as e:
            print(f"상세 조회/다운로드 실패: {e}")

if __name__ == "__main__":
    main()
