import os
import json
from dotenv import load_dotenv
from api import get_notice_list, get_notice_detail

# .env.local 로드
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env.local")
load_dotenv(dotenv_path=env_path)

def dump_data():
    print("올해 전체 공지사항 목록 조회 중...")
    page_no = 1
    page_size = 50
    all_notices = []
    
    while True:
        try:
            list_data = get_notice_list(page_no=page_no, page_size=page_size, start_date="2026-01-01", bbs_tl="모집")
            if len(list_data) > 1 and "dsList" in list_data[1]:
                notices = list_data[1]["dsList"]
                all_notices.extend(notices)
                if len(notices) < page_size:
                    break
                page_no += 1
            else:
                break
        except Exception as e:
            print(f"목록 조회 실패: {e}")
            break

    print(f"총 {len(all_notices)}건의 공지사항 원본 상세 내역 조회를 시작합니다.")
    
    dump_results = []
    
    for notice in all_notices:
        bbs_sn = notice.get("BBS_SN")
        sys_ds_cd = notice.get("CCR_CNNT_SYS_DS_CD")
        if not sys_ds_cd:
            link_url = notice.get("LINK_URL", "")
            if "ccrCnntSysDsCd=" in link_url:
                sys_ds_cd = link_url.split("ccrCnntSysDsCd=")[1].split("&")[0]
            elif "CCR_CNNT_SYS_DS_CD:" in link_url:
                sys_ds_cd = link_url.split("CCR_CNNT_SYS_DS_CD:")[1].split(",")[0]
            else:
                sys_ds_cd = "04"
                
        try:
            detail_data = get_notice_detail(sys_ds_cd=sys_ds_cd, bbs_sn=bbs_sn)
            dump_results.append({
                "list_info": notice,
                "detail_info": detail_data
            })
        except Exception as e:
            print(f"상세 조회 실패 (BBS_SN: {bbs_sn}): {e}")

    # 결과 저장
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "docs")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "detail_responses_2026.json")
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(dump_results, f, ensure_ascii=False, indent=2)
        
    print(f"[완료] 전체 응답 데이터가 {output_path} 파일에 저장되었습니다.")

if __name__ == "__main__":
    dump_data()
