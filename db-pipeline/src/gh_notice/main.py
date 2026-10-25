import os
import sys
import argparse
import json
import re
import requests
import lxml.html

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
PDF_SAVE_DIR = os.path.join(BASE_DIR, "docs", "pdf")
MAP_PATH = os.path.join(PDF_SAVE_DIR, "announcement_map.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

BOARDS = [
    {
        "name": "임대주택",
        "board_id": "sr7155",
        "list_url": "https://apply.gh.or.kr/sb/sr/sr7155/selectPbancRentHouseList.do",
        "detail_url": "https://apply.gh.or.kr/sb/sr/sr7155/selectPbancDetailView.do",
    },
    {
        "name": "분양주택",
        "board_id": "sr7150",
        "list_url": "https://apply.gh.or.kr/sb/sr/sr7150/selectPbancRentHouseList.do",
        "detail_url": "https://apply.gh.or.kr/sb/sr/sr7150/selectPbancDetailView.do",
    },
]

def clean_file_name(raw_name):
    """파일 텍스트에서 크기 표시 '(12345 Byte)' 등을 제거하여 순수 파일명 반환"""
    name = raw_name.strip()
    name = re.sub(r"\s*\([0-9,\.]+\s*(?:Byte|KB|MB|GB)\)\s*$", "", name, flags=re.IGNORECASE)
    return name.strip()

def is_whitelisted_file(file_name):
    """첨부파일 화이트리스트/블랙리스트 검사"""
    fn_lower = file_name.lower()
    valid_exts = (".pdf", ".xls", ".xlsx", ".hwp", ".hwpx")
    if not fn_lower.endswith(valid_exts):
        return False

    blacklist = ["팜플렛", "팸플릿", "수집", "제3자", "위임장", "동의서"]
    if any(bw in fn_lower for bw in blacklist):
        return False

    whitelist = ["공고", "모집", "안내", "목록", "주택", "입주자격", "내역", "임대조건", "단지", "평면도"]
    if any(ww in fn_lower for ww in whitelist):
        return True
    return True

def download_file(session, url, save_path, referer):
    """주어진 URL의 파일을 로컬 경로에 다운로드 (스트림)"""
    headers = dict(HEADERS)
    if referer:
        headers["Referer"] = referer
    response = session.get(url, headers=headers, stream=True, timeout=60)
    response.raise_for_status()

    # 에러 XML 응답 검출
    first_chunk = response.raw.read(512)
    if b"<Root" in first_chunk and (b"ErrorCode" in first_chunk or b"err." in first_chunk):
        print(f"    [건너뜀] 파일 다운로드 실패 XML 응답 (서버 파일 손상/부재)")
        return False

    with open(save_path, "wb") as f:
        f.write(first_chunk)
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

    size = os.path.getsize(save_path)
    print(f"    [완료] 다운로드: {os.path.basename(save_path)} ({size:,} bytes)")
    return True

def main():
    parser = argparse.ArgumentParser(description="GH 경기주택도시공사 공고 및 첨부파일 크롤링 스크립트")
    parser.add_argument("--start-date", required=True, help="조회 시작일 (YYYY-MM-DD)")
    parser.add_argument("--end-date", required=True, help="조회 종료일 (YYYY-MM-DD)")
    parser.add_argument("--pan-nm", help="검색할 공고명 키워드 (선택)")

    args = parser.parse_args()

    start_date = args.start_date.replace(".", "-")
    end_date = args.end_date.replace(".", "-")

    os.makedirs(PDF_SAVE_DIR, exist_ok=True)

    # announcement_map.json 로드
    map_data = {"LH": {}, "SH": {}, "GH": {}, "민간": {}, "기타": {}}
    existing_pan_ids = set()
    if os.path.exists(MAP_PATH):
        try:
            with open(MAP_PATH, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                for k in map_data.keys():
                    if k in loaded and isinstance(loaded[k], dict):
                        map_data[k] = loaded[k]
                for k, v in map_data.items():
                    existing_pan_ids.update(v.keys())
        except Exception as e:
            print(f"[경고] announcement_map.json 로드 실패: {e}")

    session = requests.Session()
    session.headers.update(HEADERS)

    total_downloaded = 0
    is_map_updated = False

    for board in BOARDS:
        b_name = board["name"]
        b_id = board["board_id"]
        list_url = board["list_url"]
        detail_url = board["detail_url"]

        print(f"\n📂 [GH {b_name}] 공고 목록 조회 시작 (기간: {start_date} ~ {end_date})...")

        # 세션 초기화
        try:
            session.get(list_url, timeout=15)
        except Exception as se:
            print(f"[{b_name}] 초기 세션 접속 실패: {se}")
            continue

        page = 1
        stop_board = False

        while not stop_board and page <= 30:
            post_data = {
                "searchArea": "",
                "searchCate": "",
                "searchState": "",
                "searchTitle": args.pan_nm or "",
                "pageIndex": str(page)
            }

            try:
                res = session.post(list_url, data=post_data, timeout=15)
                res.raise_for_status()
            except Exception as e:
                print(f"[{b_name}] 페이지 {page} 호출 실패: {e}")
                break

            tree = lxml.html.fromstring(res.content)
            rows = tree.xpath("//table[1]//tr")
            if len(rows) <= 1:
                print(f"[{b_name}] 페이지 {page}에 데이터가 없습니다.")
                break

            page_notices = []
            for r in rows[1:]:
                tds = r.xpath(".//td")
                if len(tds) < 8:
                    continue

                no = tds[0].text_content().strip()
                biz_ty = tds[1].text_content().strip()
                
                a_elem = tds[2].xpath(".//a")
                if not a_elem:
                    continue
                title = a_elem[0].text_content().strip()
                pbanc_no = a_elem[0].get("data-pbancno", "")
                pbanc_knd_cd = a_elem[0].get("data-pbanckndcd", "")
                biz_ty_nm = a_elem[0].get("data-biztynm", biz_ty)
                preview_yn = a_elem[0].get("data-previewyn", "0")

                if not pbanc_no:
                    continue

                region = tds[3].text_content().strip()
                reg_date = tds[5].text_content().strip().replace(".", "-")  # YYYY-MM-DD
                close_date = tds[6].text_content().strip().replace(".", "-")
                status = tds[7].text_content().strip()

                # 날짜 검사
                if reg_date < start_date:
                    stop_board = True
                    break

                if reg_date > end_date:
                    continue

                if args.pan_nm and args.pan_nm not in title:
                    continue

                page_notices.append({
                    "pbanc_no": pbanc_no,
                    "pbanc_knd_cd": pbanc_knd_cd,
                    "biz_ty_nm": biz_ty_nm,
                    "preview_yn": preview_yn,
                    "title": title,
                    "region": region,
                    "reg_date": reg_date,
                    "close_date": close_date,
                    "status": status,
                    "board_id": b_id,
                    "detail_url": detail_url
                })

            print(f" -> 페이지 {page}: 대상 공고 {len(page_notices)}건 발견")

            for item in page_notices:
                pbanc_no = item["pbanc_no"]
                title = item["title"]
                reg_date = item["reg_date"]
                pan_dt = reg_date.replace("-", "")

                if pbanc_no in existing_pan_ids or pbanc_no in map_data["GH"]:
                    print(f"\n[{title}] 이미 수집된 공고입니다 (ID: {pbanc_no}). 건너뜁니다.")
                    continue

                print(f"\n[{title}] 상세 페이지 조회 중 (ID: {pbanc_no}, 게시일: {reg_date})...")

                detail_post_data = {
                    "pbancNo": pbanc_no,
                    "pbancKndCd": item["pbanc_knd_cd"],
                    "bizTyNm": item["biz_ty_nm"],
                    "previewYn": item["preview_yn"],
                    "searchArea": "",
                    "searchCate": "",
                    "searchState": "",
                    "searchTitle": "",
                    "pageIndex": "1"
                }

                try:
                    view_res = session.post(item["detail_url"], data=detail_post_data, timeout=15)
                    view_res.raise_for_status()
                except Exception as ve:
                    print(f"상세 조회 실패: {ve}")
                    continue

                detail_tree = lxml.html.fromstring(view_res.content)
                file_links = detail_tree.xpath("//a[contains(@href, 'selectFileDown.do')]")

                folder_name = f"GH_{pbanc_no}_{pan_dt}"
                notice_dir = os.path.join(PDF_SAVE_DIR, folder_name)
                os.makedirs(notice_dir, exist_ok=True)

                downloaded_files = []
                for a in file_links:
                    raw_fn = a.text_content().strip()
                    clean_fn = clean_file_name(raw_fn)
                    file_url = a.get("href", "")

                    if not clean_fn or not file_url:
                        continue

                    if not is_whitelisted_file(clean_fn):
                        print(f" -> 파일 제외 (필터): {clean_fn}")
                        continue

                    if not file_url.startswith("http"):
                        file_url = urllib.parse.urljoin("https://apply-cdn.gh.or.kr", file_url)

                    save_path = os.path.join(notice_dir, clean_fn)
                    if os.path.exists(save_path) and os.path.getsize(save_path) > 0:
                        print(f" -> 이미 존재하는 파일입니다: {clean_fn}")
                    else:
                        print(f" -> 첨부파일 다운로드 시도: {clean_fn}")
                        try:
                            ok = download_file(session, file_url, save_path, referer=item["detail_url"])
                            if not ok:
                                if os.path.exists(save_path):
                                    os.remove(save_path)
                                continue
                        except Exception as de:
                            print(f"    [오류] 다운로드 실패 ({clean_fn}): {de}")
                            continue

                    if clean_fn not in downloaded_files:
                        downloaded_files.append(clean_fn)

                # download_meta.json 작성
                merged_meta = {
                    "PAN_ID": pbanc_no,
                    "PAN_NM": title,
                    "PAN_DT": pan_dt,
                    "DTL_URL": f"https://apply.gh.or.kr/sb/sr/{item['board_id']}/selectPbancRentHouseList.do",
                    "CNP_CD_NM": "경기도",
                    "REGION_NM": item["region"],
                    "PAN_SS": item["status"] or "공고중",
                    "CLSG_DT": item["close_date"],
                    "BIZ_TY_NM": item["biz_ty_nm"],
                    "BOARD_NAME": b_name,
                    "dsSplInfo": [],
                    "_institution": "GH",
                    "_files": downloaded_files
                }

                meta_path = os.path.join(notice_dir, "download_meta.json")
                try:
                    with open(meta_path, "w", encoding="utf-8") as mf:
                        json.dump(merged_meta, mf, ensure_ascii=False, indent=2)
                    print(f" -> download_meta.json 저장 완료: {meta_path}")
                except Exception as me:
                    print(f"[경고] download_meta.json 저장 실패: {me}")

                map_data["GH"][pbanc_no] = title
                existing_pan_ids.add(pbanc_no)
                is_map_updated = True
                total_downloaded += 1

            page += 1

    if is_map_updated:
        try:
            with open(MAP_PATH, "w", encoding="utf-8") as f:
                json.dump(map_data, f, ensure_ascii=False, indent=2)
            print(f"\n[완료] announcement_map.json 최종 갱신 완료 (GH 신규 공고 반영)")
        except Exception as e:
            print(f"[경고] announcement_map.json 갱신 실패: {e}")

    print(f"\n🎉 [GH 수집 완료] 총 {total_downloaded}건의 신규 공고 수집 및 다운로드를 마쳤습니다.")

if __name__ == "__main__":
    main()
