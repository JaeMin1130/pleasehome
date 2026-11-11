import asyncio
import os
import re
import urllib.parse
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import httpx
import lxml.html
from dotenv import load_dotenv

# .env.local 로드
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
env_local_path = os.path.join(BASE_DIR, "db-pipeline", ".env.local")
if os.path.exists(env_local_path):
    load_dotenv(env_local_path)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

def normalize_date(d_str: str) -> str:
    """모든 형식의 날짜 문자열(YYYY.MM.DD, YYYYMMDD, YYYY-MM-DD 등)을 YYYY-MM-DD로 정규화"""
    if not d_str:
        return ""
    clean = re.sub(r"[^\d]", "", str(d_str))
    if len(clean) >= 8:
        return f"{clean[:4]}-{clean[4:6]}-{clean[6:8]}"
    return str(d_str).strip()

# 입주자 모집공고 여부 엄격 판별 (단순 당첨자/결과/안내문 배제)
def is_recruitment_notice(title: str) -> Tuple[bool, str]:
    t_clean = re.sub(r"\s+", " ", title).strip()

    blacklist = [
        "당첨자", "입주대상자", "합격자", "서류심사", "서류제출", "서류 제출", "심사서류", "제출 안내", "소명",
        "시스템", "일시 중단", "시스템 점검", "가격 공개", "경쟁률", "명단 게시", "계약안내", "입주안내", "동의서", "설문"
    ]
    for bw in blacklist:
        if bw in t_clean:
            return False, f"비모집 공지 키워드 포함 ('{bw}')"

    whitelist = [
        "입주자모집", "입주자 모집", "모집공고", "모집 공고",
        "예비입주자", "예비자 모집", "예비입주자모집",
        "추가모집", "추가 모집", "선착순", "동호지정"
    ]
    for ww in whitelist:
        if ww in t_clean:
            return True, "정상 모집공고"

    return False, "모집공고 핵심 키워드 미포함"

# -------------------------------------------------------------
# 1. LH 청약플러스 OpenAPI 공고 목록 조회
# -------------------------------------------------------------
async def fetch_lh_notices(
    client: httpx.AsyncClient,
    start_date: str,
    end_date: str,
    recruitment_only: bool = True
) -> List[Dict]:
    service_key = os.getenv("LH_ROA_INFO_API_KEY")
    if not service_key:
        return []

    start_formatted = start_date.replace("-", "")
    end_formatted = end_date.replace("-", "")
    url = "http://apis.data.go.kr/B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1"

    residential_types = [
        ("05", "분양주택"),
        ("06", "임대주택"),
        ("13", "주거복지"),
        ("39", "신혼희망타운")
    ]

    all_notices = {}

    for ais_type, type_name in residential_types:
        params = {
            "serviceKey": urllib.parse.unquote(service_key),
            "PAGE": 1,
            "PG_SZ": 100,
            "PAN_ST_DT": start_formatted,
            "PAN_ED_DT": end_formatted,
            "UPP_AIS_TP_CD": ais_type,
        }
        try:
            res = await client.get(url, params=params, timeout=12.0)
            if res.status_code != 200:
                continue
            data = res.json()
            items = []
            for d in data:
                if isinstance(d, dict) and "dsList" in d:
                    items = d["dsList"]
                    break

            for item in items:
                pan_id = item.get("PAN_ID")
                if not pan_id or pan_id in all_notices:
                    continue

                title = item.get("PAN_NM", "")
                is_rec, _ = is_recruitment_notice(title)
                if recruitment_only and not is_rec:
                    continue

                raw_date = item.get("PAN_NT_ST_DT") or item.get("PAN_DT") or ""
                notice_date = normalize_date(raw_date)

                all_notices[pan_id] = {
                    "id": f"LH_{pan_id}",
                    "institution": "LH",
                    "title": title,
                    "notice_date": notice_date,
                    "closing_date": normalize_date(item.get("CLSG_DT") or ""),
                    "status": item.get("PAN_SS", "공고중"),
                    "subscription_type": item.get("AIS_TP_CD_NM") or type_name,
                    "region": item.get("CNP_CD_NM", "수도권"),
                    "detail_url": item.get("DTL_URL") or f"https://apply.lh.or.kr/lhapply/apply/wt/wrtanc/selectWrtancInfo.do?panId={pan_id}",
                    "is_recruitment": is_rec
                }
        except Exception as e:
            print(f"[LH fetch error ({type_name})]: {e}")

    return list(all_notices.values())

# -------------------------------------------------------------
# 2. SH 서울주택도시공사 웹 목록 스크래핑 (다운로드 없음)
# -------------------------------------------------------------
async def fetch_sh_notices(
    client: httpx.AsyncClient,
    start_date: str,
    end_date: str,
    recruitment_only: bool = True
) -> List[Dict]:
    boards = [
        {"name": "주택임대", "prog_id": "S48T1581C1617", "brd_id": "m_244", "m_seq": "1"},
        {"name": "주택분양", "prog_id": "S48T1581C563", "brd_id": "m_247", "m_seq": "2"},
    ]

    all_notices = []

    for board in boards:
        b_name = board["name"]
        prog_id = board["prog_id"]
        brd_id = board["brd_id"]
        m_seq = board["m_seq"]

        for page in range(1, 4):  # 최근 3페이지 탐색
            list_url = f"https://www.i-sh.co.kr/app/lay2/program/{prog_id}/www/brd/{brd_id}/list.do?multi_itm_seq={m_seq}&page={page}"
            try:
                res = await client.get(list_url, headers=HEADERS, timeout=12.0)
                if res.status_code != 200:
                    break

                tree = lxml.html.fromstring(res.content)
                rows = tree.xpath("//table[1]//tr")
                if len(rows) <= 1:
                    break

                stop_board = False
                for r in rows[1:]:
                    tds = r.xpath(".//td")
                    if len(tds) < 4:
                        continue

                    title_elem = tds[1].xpath(".//a")
                    if not title_elem:
                        continue
                    title = title_elem[0].text_content().strip()
                    onclick = title_elem[0].get("onclick", "")
                    seq_match = re.search(r"getDetailView\('(\d+)'\)", onclick)
                    seq = seq_match.group(1) if seq_match else ""

                    reg_date = tds[3].text_content().strip()  # YYYY-MM-DD
                    notice_date = normalize_date(reg_date)

                    if notice_date and notice_date < start_date:
                        stop_board = True
                        break
                    if notice_date and notice_date > end_date:
                        continue

                    is_rec, _ = is_recruitment_notice(title)
                    if recruitment_only and not is_rec:
                        continue

                    detail_url = f"https://www.i-sh.co.kr/app/lay2/program/{prog_id}/www/brd/{brd_id}/view.do?seq={seq}&multi_itm_seq={m_seq}" if seq else list_url

                    all_notices.append({
                        "id": f"SH_{seq}" if seq else f"SH_{len(all_notices)+1}",
                        "institution": "SH",
                        "title": title,
                        "notice_date": notice_date,
                        "closing_date": "",
                        "status": "접수중",
                        "subscription_type": b_name,
                        "region": "서울",
                        "detail_url": detail_url,
                        "is_recruitment": is_rec
                    })

                if stop_board:
                    break
            except Exception as e:
                print(f"[SH fetch error ({b_name} p{page})]: {e}")
                break

    return all_notices

# -------------------------------------------------------------
# 3. GH 경기주택도시공사 웹 목록 스크래핑 (다운로드 없음)
# -------------------------------------------------------------
async def fetch_gh_notices(
    client: httpx.AsyncClient,
    start_date: str,
    end_date: str,
    recruitment_only: bool = True
) -> List[Dict]:
    boards = [
        {"name": "임대주택", "board_id": "sr7155", "list_url": "https://apply.gh.or.kr/sb/sr/sr7155/selectPbancRentHouseList.do"},
        {"name": "분양주택", "board_id": "sr7150", "list_url": "https://apply.gh.or.kr/sb/sr/sr7150/selectPbancRentHouseList.do"},
    ]

    all_notices = []

    for board in boards:
        b_name = board["name"]
        b_id = board["board_id"]
        list_url = board["list_url"]

        try:
            res = await client.get(list_url, headers=HEADERS, timeout=12.0)
            if res.status_code != 200:
                continue

            tree = lxml.html.fromstring(res.content)
            rows = tree.xpath("//tbody/tr")
            for r in rows:
                tds = r.xpath(".//td")
                if len(tds) < 4:
                    continue

                title_elem = tds[2].xpath(".//a")
                if not title_elem:
                    continue
                title = title_elem[0].text_content().strip()

                onclick = title_elem[0].get("onclick", "")
                id_match = re.search(r"fn_detail\('([^']+)'\)", onclick) or re.search(r"'(\d+)'", onclick)
                gh_id = id_match.group(1) if id_match else ""

                # GH 컬럼: td[1]=유형, td[2]=공고명, td[3]=지역, td[5]=공고일, td[6]=접수기간, td[7]=상태
                sub_type = tds[1].text_content().strip() if len(tds) > 1 else b_name
                gh_region = tds[3].text_content().strip() if len(tds) > 3 else "경기도"
                raw_date = tds[5].text_content().strip() if len(tds) > 5 else ""
                notice_date = normalize_date(raw_date)

                closing_text = tds[6].text_content().strip() if len(tds) > 6 else ""
                gh_status = tds[7].text_content().strip() if len(tds) > 7 else "공고중"

                if notice_date and notice_date < start_date:
                    continue
                if notice_date and notice_date > end_date:
                    continue

                is_rec, _ = is_recruitment_notice(title)
                if recruitment_only and not is_rec:
                    continue

                detail_url = f"https://apply.gh.or.kr/sb/sr/{b_id}/selectPbancDetailView.do?pbancId={gh_id}" if gh_id else list_url

                all_notices.append({
                    "id": f"GH_{gh_id}" if gh_id else f"GH_{len(all_notices)+1}",
                    "institution": "GH",
                    "title": title,
                    "notice_date": notice_date,
                    "closing_date": closing_text if closing_text != "-" else "",
                    "status": gh_status or "공고중",
                    "subscription_type": sub_type or b_name,
                    "region": gh_region or "경기도",
                    "detail_url": detail_url,
                    "is_recruitment": is_rec
                })
        except Exception as e:
            print(f"[GH fetch error ({b_name})]: {e}")

    return all_notices

# -------------------------------------------------------------
# 4. 통합 실시간 조회 헬퍼 (실서버 DB 적재 여부 대조 및 지역 필터링)
# -------------------------------------------------------------
async def get_live_external_announcements(
    client: httpx.AsyncClient,
    institution: str = "ALL",
    region: str = "ALL",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    recruitment_only: bool = True,
    existing_db_titles: Optional[List[str]] = None
) -> Dict:
    if not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")
    if not start_date:
        start_date = (datetime.now() - timedelta(days=14)).strftime("%Y-%m-%d")

    target_inst = institution.upper()
    tasks = []

    if target_inst in ("ALL", "LH"):
        tasks.append(fetch_lh_notices(client, start_date, end_date, recruitment_only))
    if target_inst in ("ALL", "SH"):
        tasks.append(fetch_sh_notices(client, start_date, end_date, recruitment_only))
    if target_inst in ("ALL", "GH"):
        tasks.append(fetch_gh_notices(client, start_date, end_date, recruitment_only))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    combined: List[Dict] = []
    for r in results:
        if isinstance(r, list):
            combined.extend(r)

    # 지역 필터링: region은 "서울,경기,인천"처럼 쉼표로 여러 개, "ALL"이면 전국
    regions = [r.strip() for r in (region or "ALL").split(",") if r.strip()]
    if any(r.upper() in ("ALL", "") for r in regions) or not regions:
        regions = []
    elif any(r.upper() == "CAPITAL" for r in regions):
        regions = ["서울", "경기", "인천"]
    capital = any(r in ("서울", "경기", "인천") for r in regions)

    def region_match(item: Dict) -> bool:
        if not regions:
            return True
        item_reg = item.get("region", "")
        item_title = item.get("title", "")
        inst = item.get("institution", "")
        if capital and ("수도권" in item_reg or "수도권" in item_title):
            return True
        for r in regions:
            if r in item_reg or r in item_title:
                return True
            if (inst == "SH" and r == "서울") or (inst == "GH" and r == "경기"):
                return True
        return False

    filtered_by_region: List[Dict] = [item for item in combined if region_match(item)]

    # 최신 공고일 기준 내림차순 정렬
    filtered_by_region.sort(key=lambda x: x.get("notice_date", ""), reverse=True)

    # 실서버 DB 적재 여부 대조 (공고 제목 키워드 비교)
    norm_db_titles = set()
    if existing_db_titles:
        for t in existing_db_titles:
            norm_db_titles.add(re.sub(r"[\s\-_()\[\]]", "", t.lower()))

    lh_count = 0
    sh_count = 0
    gh_count = 0
    new_count = 0

    for item in filtered_by_region:
        inst = item.get("institution", "")
        if inst == "LH": lh_count += 1
        elif inst == "SH": sh_count += 1
        elif inst == "GH": gh_count += 1

        title_norm = re.sub(r"[\s\-_()\[\]]", "", item.get("title", "").lower())
        # 실서버 DB 타이틀에 포함되거나 일치하면 적재 완료로 판별
        is_ingested = False
        if norm_db_titles:
            for dbt in norm_db_titles:
                if title_norm in dbt or dbt in title_norm:
                    is_ingested = True
                    break

        item["is_ingested"] = is_ingested
        if not is_ingested:
            new_count += 1

    return {
        "items": filtered_by_region,
        "stats": {
            "total": len(filtered_by_region),
            "lh": lh_count,
            "sh": sh_count,
            "gh": gh_count,
            "new_count": new_count
        },
        "query": {
            "institution": institution,
            "region": region,
            "start_date": start_date,
            "end_date": end_date,
            "recruitment_only": recruitment_only
        }
    }
