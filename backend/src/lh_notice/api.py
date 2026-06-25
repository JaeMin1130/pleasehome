import os
import requests
import urllib.parse

def get_notice_list(page_no=1, page_size=10, start_date=None, end_date=None, bbs_tl=None):
    """공지사항 목록 조회 API 호출"""
    url = "http://apis.data.go.kr/B552555/lhNoticeInfo1/getNoticeInfo1"
    
    # .env.local 에서 디코딩키 로드
    service_key = os.getenv("LH_NOTICE_LIST_API_KEY")
    if not service_key:
        raise ValueError("LH_NOTICE_LIST_API_KEY is not set.")
    
    params = {
        "serviceKey": urllib.parse.unquote(service_key), # requests에서 이중인코딩 방지
        "PAGE": page_no,
        "PG_SZ": page_size,
    }
    
    if start_date:
        params["SCH_ST_DT"] = start_date
    if end_date:
        params["SCH_ED_DT"] = end_date
    if bbs_tl:
        params["BBS_TL"] = bbs_tl
        
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()

def get_notice_detail(sys_ds_cd, bbs_sn):
    """공지사항별 상세정보(첨부파일 포함) 조회 API 호출"""
    url = "http://apis.data.go.kr/B552555/lhNoticeDtlInfo1/getNoticeDtlInfo1"
    
    service_key = os.getenv("LH_NOTICE_DTL_API_KEY")
    if not service_key:
        raise ValueError("LH_NOTICE_DTL_API_KEY is not set.")
        
    params = {
        "serviceKey": urllib.parse.unquote(service_key),
        "CCR_CNNT_SYS_DS_CD": sys_ds_cd,
        "BBS_SN": bbs_sn
    }
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()
