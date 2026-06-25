import os
from dotenv import load_dotenv
from api import get_notice_list

# .env.local 로드
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env.local")
load_dotenv(dotenv_path=env_path)

def dump_titles():
    print("올해 공지사항 목록 제목(BBS_TL) 고속 추출 중...")
    page_no = 1
    page_size = 50
    titles = []
    
    while True:
        try:
            list_data = get_notice_list(page_no=page_no, page_size=page_size, start_date="2026-01-01")
            if len(list_data) > 1 and "dsList" in list_data[1]:
                notices = list_data[1]["dsList"]
                for notice in notices:
                    title = notice.get("BBS_TL")
                    if title:
                        titles.append(title)
                
                # 가져온 건수가 요청 건수보다 적으면 마지막 페이지
                if len(notices) < page_size:
                    break
                page_no += 1
            else:
                break
        except Exception as e:
            print(f"목록 조회 실패: {e}")
            break

    # 결과 저장
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "docs")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "notice_titles_2026.txt")
    
    with open(output_path, "w", encoding="utf-8") as f:
        for t in titles:
            f.write(t + "\n")
            
    print(f"[완료] 총 {len(titles)}건의 제목이 {output_path} 파일에 깔끔하게 저장되었습니다.")

if __name__ == "__main__":
    dump_titles()
