import os
import time
from dotenv import load_dotenv
from api import get_lease_notice_list, get_lease_notice_detail

# .env.local 로드
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env.local")
load_dotenv(dotenv_path=env_path)

def dump_title_and_attachments():
    print("최근 100건 게시글(분양임대공고) 제목과 첨부파일명 쌍 추출 중...")
    
    try:
        # 카테고리 13(매입임대/전세임대) 한정
        list_data1 = get_lease_notice_list(page_no=1, page_size=50, start_date="2026-01-01", upp_ais_tp_cd="13")
        list_data2 = get_lease_notice_list(page_no=2, page_size=50, start_date="2026-01-01", upp_ais_tp_cd="13")
        notices = []
        
        for data in [list_data1, list_data2]:
            if isinstance(data, list) and len(data) > 1 and "dsList" in data[1]:
                notices.extend(data[1]["dsList"])
    except Exception as e:
        print(f"목록 조회 실패: {e}")
        return

    notices = notices[:100]
    results = []
    
    for i, notice in enumerate(notices):
        pan_id = notice.get("PAN_ID")
        pan_nm = notice.get("PAN_NM", "제목 없음")
        sys_ds_cd = notice.get("CCR_CNNT_SYS_DS_CD")
        spl_inf_tp_cd = notice.get("SPL_INF_TP_CD")
        upp_ais_tp_cd = notice.get("UPP_AIS_TP_CD")
        ais_tp_cd = notice.get("AIS_TP_CD")
        
        # 502 에러 대비 재시도 로직
        max_retries = 3
        files_list = []
        for attempt in range(max_retries):
            try:
                if not pan_id or not spl_inf_tp_cd or not sys_ds_cd:
                    files_list.append("[필수 파라미터 누락으로 상세조회 불가]")
                    break

                detail_data = get_lease_notice_detail(
                    spl_inf_tp_cd=spl_inf_tp_cd,
                    ccr_cnnt_sys_ds_cd=sys_ds_cd,
                    pan_id=pan_id,
                    upp_ais_tp_cd=upp_ais_tp_cd,
                    ais_tp_cd=ais_tp_cd
                )
                
                if isinstance(detail_data, list) and len(detail_data) > 1:
                    info = detail_data[1]
                    
                    # 1. 일반 첨부파일
                    if "dsAhflInfo" in info:
                        for f in info["dsAhflInfo"]:
                            nm = f.get("CMN_AHFL_NM")
                            if nm: files_list.append(nm)
                            
                    # 2. 단지별 첨부파일 (단지배치도, 평면도 등)
                    if "dsSbdAhfl" in info:
                        for f in info["dsSbdAhfl"]:
                            nm = f.get("CMN_AHFL_NM")
                            if nm: files_list.append(nm)
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(1)
                else:
                    files_list.append(f"[조회 실패: {e}]")
                    
        results.append({
            "title": pan_nm,
            "files": list(set(files_list)) # 중복 파일명 제거
        })
        
        if (i + 1) % 10 == 0:
            print(f"진행 중... ({i + 1}/{len(notices)})")

    # 가독성을 높인 텍스트 형식으로 저장
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "docs")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "notice_mapping_100.txt")
    
    with open(output_path, "w", encoding="utf-8") as f:
        for item in results:
            f.write(f"■ 제목: {item['title']}\n")
            if item['files']:
                for a in item['files']:
                    f.write(f"  - 첨부: {a}\n")
            else:
                f.write("  - (첨부파일 없음)\n")
            f.write("-" * 60 + "\n\n")
            
    print(f"[완료] 매핑 데이터가 {output_path} 파일에 덮어쓰기 되었습니다.")

if __name__ == "__main__":
    dump_title_and_attachments()
