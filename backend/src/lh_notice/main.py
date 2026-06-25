import os
import requests
from dotenv import load_dotenv
from api import get_notice_list, get_notice_detail

# .env.local 파일 로드
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

def main():
    if not os.path.exists(PDF_SAVE_DIR):
        os.makedirs(PDF_SAVE_DIR)
        
    print("1. 공지사항 목록 조회 중...")
    try:
        # 올 초부터 최근까지의 "모집" 공지사항 30개 조회
        list_data = get_notice_list(page_no=1, page_size=30, start_date="2026-01-01", bbs_tl="모집")
    except Exception as e:
        print(f"목록 조회 실패: {e}")
        return

    # dsList 추출
    try:
        notices = list_data[1]["dsList"]
    except (IndexError, KeyError):
        print("응답 구조에서 공지사항 목록(dsList)을 찾을 수 없습니다.")
        return

    print(f"총 {len(notices)}건의 공지사항 목록을 확인했습니다. 상세 조회를 시작합니다.")
    
    for notice in notices:
        bbs_sn = notice.get("BBS_SN")
        
        # 최신 API 응답에는 CCR_CNNT_SYS_DS_CD 필드가 직접 제공됨
        sys_ds_cd = notice.get("CCR_CNNT_SYS_DS_CD")
        if not sys_ds_cd:
            link_url = notice.get("LINK_URL", "")
            if "ccrCnntSysDsCd=" in link_url:
                sys_ds_cd = link_url.split("ccrCnntSysDsCd=")[1].split("&")[0]
            elif "CCR_CNNT_SYS_DS_CD:" in link_url:
                sys_ds_cd = link_url.split("CCR_CNNT_SYS_DS_CD:")[1].split(",")[0]
            else:
                sys_ds_cd = "04"
            
        title = notice.get("BBS_TL", "제목없음")
        print(f"\n[{title}] 상세 조회 중...")
        
        try:
            detail_data = get_notice_detail(sys_ds_cd=sys_ds_cd, bbs_sn=bbs_sn)
            # dsBbsAhflInfo 추출 (첨부파일)
            attachments = []
            if len(detail_data) > 2 and "dsBbsAhflInfo" in detail_data[2]:
                attachments = detail_data[2]["dsBbsAhflInfo"]
            elif len(detail_data) > 1 and "dsBbsAhflInfo" in detail_data[1]:
                attachments = detail_data[1]["dsBbsAhflInfo"]
                
            for file_info in attachments:
                file_name = file_info.get("CMN_AHFL_NM", "")
                download_url = file_info.get("AHFL_URL", "")
                
                if file_name.lower().endswith(".pdf"):
                    # 화이트리스트 키워드 필터링 적용
                    whitelist = ["공고", "모집", "안내"]
                    if not any(kw in file_name.lower() for kw in whitelist):
                        continue
                        
                    save_path = os.path.join(PDF_SAVE_DIR, file_name)
                    print(f" -> PDF 발견: {file_name}")
                    if os.path.exists(save_path):
                        print("    이미 존재하는 파일입니다. 건너뜁니다.")
                        continue
                    download_file(download_url, save_path)
                    
        except Exception as e:
            print(f"상세 조회 및 다운로드 실패 (BBS_SN: {bbs_sn}): {e}")

if __name__ == "__main__":
    main()
