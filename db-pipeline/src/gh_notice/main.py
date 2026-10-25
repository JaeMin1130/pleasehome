import os
import sys
import argparse
import json
import re
import urllib.parse
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

def is_recruitment_notice(title):
    """제목 기반 입주자 모집공고 여부 엄격 판별"""
    t_clean = re.sub(r"\s+", " ", title).strip()

    # 1. 명백한 비모집 게시물 배제 (블랙리스트)
    blacklist = [
        "당첨자", "입주대상자", "합격자", "서류심사", "서류제출", "서류 제출", "심사서류", "제출 안내", "소명", 
        "시스템", "일시 중단", "시스템 점검", "가격 공개", "경쟁률", 
        "명단 게시", "계약안내", "입주안내", "동의서", "설문"
    ]
    for bw in blacklist:
        if bw in t_clean:
            return False, f"비모집 공지 키워드 포함 ('{bw}')"

    # 2. 필수 모집공고 핵심 키워드 검증 (화이트리스트)
    whitelist = [
        "입주자모집", "입주자 모집", "모집공고", "모집 공고",
        "예비입주자", "예비자 모집", "예비입주자모집",
        "추가모집", "추가 모집", "선착순", "동호지정"
    ]
    for ww in whitelist:
        if ww in t_clean:
            return True, "정상 모집공고"

    return False, "모집공고 핵심 키워드 미포함"

def clean_file_name(raw_name):
    """파일 텍스트에서 크기 표시 '(12345 Byte)' 등을 제거하여 순수 파일명 반환"""
    name = raw_name.strip()
    name = re.sub(r"\s*\([0-9,\.]+\s*(?:Byte|KB|MB|GB)\)\s*$", "", name, flags=re.IGNORECASE)
    return name.strip()

def is_whitelisted_file(file_name):
    """첨부파일 화이트리스트/블랙리스트 검사 (PDF, 엑셀만 허용, HWP 완전 배제)"""
    fn_lower = file_name.lower()
    valid_exts = (".pdf", ".xls", ".xlsx")
    if not fn_lower.endswith(valid_exts):
        return False

    blacklist = ["팜플렛", "팸플릿", "수집", "제3자", "위임장", "동의서", "안내문"]
    if any(bw in fn_lower for bw in blacklist):
        if "공고" not in fn_lower and "모집" not in fn_lower and "목록" not in fn_lower:
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
        print(f"    [오류] 서버 파일 다운로드 실패 XML 반환 (서버 손상/부재)")
        return False, "서버 파일 손상 (XML 오류 응답)"

    with open(save_path, "wb") as f:
        f.write(first_chunk)
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

    size = os.path.getsize(save_path)
    print(f"    [완료] 다운로드: {os.path.basename(save_path)} ({size:,} bytes)")
    return True, None

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

    results_summary = {
        "success": [],
        "failed": [],
        "already_collected": [],
        "skipped": []
    }
    is_map_updated = False

    for board in BOARDS:
        b_name = board["name"]
        b_id = board["board_id"]
        list_url = board["list_url"]
        detail_url = board["detail_url"]

        print(f"\n📂 [GH {b_name}] 공고 목록 조회 시작 (기간: {start_date} ~ {end_date})...")

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
                break

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

                # 1단계: 모집공고 여부 엄격 판별
                is_notice, reason = is_recruitment_notice(title)
                if not is_notice:
                    print(f" -> [스킵] {title} ({reason})")
                    results_summary["skipped"].append({"title": title, "reason": reason, "id": pbanc_no})
                    continue

                pan_dt = reg_date.replace("-", "")

                if pbanc_no in existing_pan_ids or pbanc_no in map_data["GH"]:
                    print(f"\n[{title}] 이미 수집된 공고입니다 (ID: {pbanc_no}). 건너뜁니다.")
                    results_summary["already_collected"].append({
                        "title": title,
                        "id": pbanc_no,
                        "region": region
                    })
                    continue

                print(f"\n[{title}] 상세 페이지 조회 중 (ID: {pbanc_no}, 게시일: {reg_date})...")

                detail_post_data = {
                    "pbancNo": pbanc_no,
                    "pbancKndCd": pbanc_knd_cd,
                    "bizTyNm": biz_ty_nm,
                    "previewYn": preview_yn,
                    "searchArea": "",
                    "searchCate": "",
                    "searchState": "",
                    "searchTitle": "",
                    "pageIndex": "1"
                }

                try:
                    view_res = session.post(detail_url, data=detail_post_data, timeout=15)
                    view_res.raise_for_status()
                except Exception as ve:
                    err_msg = f"상세 페이지 접근 실패 ({ve})"
                    print(f" -> [오류] {err_msg}")
                    results_summary["failed"].append({"title": title, "id": pbanc_no, "region": region, "reason": err_msg})
                    continue

                detail_tree = lxml.html.fromstring(view_res.content)
                file_links = detail_tree.xpath("//a[contains(@href, 'selectFileDown.do')]")

                folder_name = f"GH_{pbanc_no}_{pan_dt}"
                notice_dir = os.path.join(PDF_SAVE_DIR, folder_name)
                os.makedirs(notice_dir, exist_ok=True)

                downloaded_files = []
                file_fail_reasons = []

                for a in file_links:
                    raw_fn = a.text_content().strip()
                    clean_fn = clean_file_name(raw_fn)
                    file_url = a.get("href", "")

                    if not clean_fn or not file_url:
                        continue

                    if not is_whitelisted_file(clean_fn):
                        print(f" -> 파일 제외 (필터/비PDF): {clean_fn}")
                        continue

                    if not file_url.startswith("http"):
                        file_url = urllib.parse.urljoin("https://apply-cdn.gh.or.kr", file_url)

                    save_path = os.path.join(notice_dir, clean_fn)
                    if os.path.exists(save_path) and os.path.getsize(save_path) > 0:
                        print(f" -> 이미 존재하는 파일입니다: {clean_fn}")
                        if clean_fn not in downloaded_files:
                            downloaded_files.append(clean_fn)
                    else:
                        print(f" -> 첨부파일 다운로드 시도: {clean_fn}")
                        try:
                            ok, f_err = download_file(session, file_url, save_path, referer=detail_url)
                            if ok:
                                if clean_fn not in downloaded_files:
                                    downloaded_files.append(clean_fn)
                            else:
                                if os.path.exists(save_path):
                                    os.remove(save_path)
                                file_fail_reasons.append(f"{clean_fn}: {f_err}")
                        except Exception as de:
                            print(f"    [오류] 다운로드 실패 ({clean_fn}): {de}")
                            file_fail_reasons.append(f"{clean_fn}: 네트워크 예외 ({de})")

                # PDF 확보 여부 검증
                has_pdf = any(fn.lower().endswith(".pdf") for fn in downloaded_files)
                if has_pdf:
                    status_flag = "SUCCESS"
                    error_reason = ""
                    results_summary["success"].append({
                        "title": title,
                        "id": pbanc_no,
                        "region": region,
                        "files": downloaded_files
                    })
                    map_data["GH"][pbanc_no] = title
                else:
                    status_flag = "FAILED"
                    if file_fail_reasons:
                        error_reason = f"공고문 PDF 다운로드 실패 ({'; '.join(file_fail_reasons)})"
                    else:
                        error_reason = "공고문 PDF 부재 (상세 페이지에 HWP 파일만 제공됨)"

                    results_summary["failed"].append({
                        "title": title,
                        "id": pbanc_no,
                        "region": region,
                        "reason": error_reason
                    })
                    map_data["GH"][pbanc_no] = f"[PDF부재] {title}"

                # download_meta.json 작성 (안전 플래그 포함)
                merged_meta = {
                    "PAN_ID": pbanc_no,
                    "PAN_NM": title,
                    "PAN_DT": pan_dt,
                    "DTL_URL": f"https://apply.gh.or.kr/sb/sr/{b_id}/selectPbancRentHouseList.do",
                    "CNP_CD_NM": "경기도",
                    "REGION_NM": region,
                    "PAN_SS": status or "공고중",
                    "CLSG_DT": close_date,
                    "BIZ_TY_NM": biz_ty_nm,
                    "BOARD_NAME": b_name,
                    "_status": status_flag,
                    "_error_reason": error_reason,
                    "dsSplInfo": [],
                    "_institution": "GH",
                    "_files": downloaded_files
                }

                meta_path = os.path.join(notice_dir, "download_meta.json")
                try:
                    with open(meta_path, "w", encoding="utf-8") as mf:
                        json.dump(merged_meta, mf, ensure_ascii=False, indent=2)
                    print(f" -> download_meta.json 저장 완료 (상태: {status_flag}): {meta_path}")
                except Exception as me:
                    print(f"[경고] download_meta.json 저장 실패: {me}")

                existing_pan_ids.add(pbanc_no)
                is_map_updated = True

            page += 1

    if is_map_updated:
        try:
            with open(MAP_PATH, "w", encoding="utf-8") as f:
                json.dump(map_data, f, ensure_ascii=False, indent=2)
            print(f"\n[완료] announcement_map.json 최종 갱신 완료 (GH 반영)")
        except Exception as e:
            print(f"[경고] announcement_map.json 갱신 실패: {e}")

    # 최종 결과 요약 리포트 출력
    print("\n" + "=" * 80)
    print(f"📊 [GH 경기주택도시공사] 공고 수집 결과 리포트 ({start_date} ~ {end_date})")
    print("=" * 80)
    total_inspected = (
        len(results_summary["success"])
        + len(results_summary["failed"])
        + len(results_summary["already_collected"])
        + len(results_summary["skipped"])
    )
    print(f"- 총 검토 게시물: {total_inspected}건")
    print(f"- ✅ 모집공고 신규 수집 성공 (PDF 확보): {len(results_summary['success'])}건")
    print(f"- ⚠️ 수집 주의/실패 (PDF 미확보): {len(results_summary['failed'])}건")
    print(f"- ⏭️ 기 수집(중복) 공고 스킵: {len(results_summary['already_collected'])}건")
    print(f"- 🚫 일반 게시물(비모집) 스킵: {len(results_summary['skipped'])}건")

    if results_summary["success"]:
        print("\n[수집 성공 공고 목록]")
        for idx, s_item in enumerate(results_summary["success"], 1):
            print(f" {idx}. [{s_item['region']}] {s_item['title']} (ID: {s_item['id']}, 파일 {len(s_item['files'])}개)")

    if results_summary["already_collected"]:
        print("\n[기 수집 공고 스킵 목록]")
        for idx, a_item in enumerate(results_summary["already_collected"], 1):
            print(f" {idx}. [{a_item['region']}] {a_item['title']} (ID: {a_item['id']})")

    if results_summary["failed"]:
        print("\n[수집 주의/실패 상세 내역]")
        for idx, f_item in enumerate(results_summary["failed"], 1):
            print(f" {idx}. [{f_item['region']}] {f_item['title']} (ID: {f_item['id']})")
            print(f"    - 사유: {f_item['reason']}")
            print(f"    - 상태: download_meta.json에 실패 플래그 기록 완료 (수동 확인 필요)")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    main()
