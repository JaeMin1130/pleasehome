import os
import requests
import urllib.parse

"""고객센터 공지사항 목록 조회 API 호출"""
def get_notice_list(page_no=1, page_size=10, start_date=None, end_date=None, bbs_tl=None, upp_ais_tp_cd=None):
    url = "http://apis.data.go.kr/B552555/lhNoticeInfo1/getNoticeInfo1"
    
    service_key = os.getenv("LH_NOTICE_LIST_API_KEY")
    if not service_key:
        raise ValueError("LH_NOTICE_LIST_API_KEY is not set.")
    
    params = {
        "serviceKey": urllib.parse.unquote(service_key),
        "PAGE": page_no,
        "PG_SZ": page_size,
    }
    
    if start_date:
        params["SCH_ST_DT"] = start_date
    if end_date:
        params["SCH_ED_DT"] = end_date
    if bbs_tl:
        params["BBS_TL"] = bbs_tl
    if upp_ais_tp_cd:
        params["UPP_AIS_TP_CD"] = upp_ais_tp_cd
        
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()

"""고객센터 공지사항별 상세정보 조회 API 호출"""
def get_notice_detail(sys_ds_cd, bbs_sn):
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

"""분양임대공고문 목록 조회 API 호출"""
def get_lease_notice_list(page_no=1, page_size=10, start_date=None, end_date=None, pan_nm=None, upp_ais_tp_cd=None):
    url = "http://apis.data.go.kr/B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1"
    
    service_key = os.getenv("LH_ROA_INFO_API_KEY")
    if not service_key:
        raise ValueError("LH_ROA_INFO_API_KEY is not set.")
    
    params = {
        "serviceKey": urllib.parse.unquote(service_key),
        "PAGE": page_no,
        "PG_SZ": page_size,
    }
    
    if start_date:
        params["PAN_ST_DT"] = start_date
    if end_date:
        params["PAN_ED_DT"] = end_date
    if pan_nm:
        params["PAN_NM"] = pan_nm
    if upp_ais_tp_cd:
        params["UPP_AIS_TP_CD"] = upp_ais_tp_cd
        
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()

"""분양임대공고별 상세정보(첨부파일 포함) 조회 API 호출"""
def get_lease_notice_detail(spl_inf_tp_cd, ccr_cnnt_sys_ds_cd, pan_id, upp_ais_tp_cd=None, ais_tp_cd=None):
    url = "http://apis.data.go.kr/B552555/lhLeaseNoticeDtlInfo1/getLeaseNoticeDtlInfo1"
    
    service_key = os.getenv("LH_ROA_DTL_API_KEY")
    if not service_key:
        raise ValueError("LH_ROA_DTL_API_KEY is not set.")
        
    params = {
        "serviceKey": urllib.parse.unquote(service_key),
        "SPL_INF_TP_CD": spl_inf_tp_cd,
        "CCR_CNNT_SYS_DS_CD": ccr_cnnt_sys_ds_cd,
        "PAN_ID": pan_id
    }
    if upp_ais_tp_cd:
        params["UPP_AIS_TP_CD"] = upp_ais_tp_cd
    if ais_tp_cd:
        params["AIS_TP_CD"] = ais_tp_cd
        
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()

"""분양임대공고별 공급정보(금액, 면적, 모집호수 등) 조회 API 호출"""
def get_lease_supply_info(spl_inf_tp_cd, ccr_cnnt_sys_ds_cd, pan_id, upp_ais_tp_cd=None, ais_tp_cd=None):
    url = "http://apis.data.go.kr/B552555/lhLeaseNoticeSplInfo1/getLeaseNoticeSplInfo1"
    
    service_key = os.getenv("LH_SUPPLY_INFO_API_KEY")
    if not service_key:
        raise ValueError("LH_SUPPLY_INFO_API_KEY is not set.")
        
    params = {
        "serviceKey": urllib.parse.unquote(service_key),
        "SPL_INF_TP_CD": spl_inf_tp_cd,
        "CCR_CNNT_SYS_DS_CD": ccr_cnnt_sys_ds_cd,
        "PAN_ID": pan_id
    }
    if upp_ais_tp_cd:
        params["UPP_AIS_TP_CD"] = upp_ais_tp_cd
    if ais_tp_cd:
        params["AIS_TP_CD"] = ais_tp_cd
        
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()

"""공공임대주택 단지정보(주차수, 난방, 승강기 등 마스터 정보) 조회 API 호출"""
def get_rental_house_info(brtc_code, signgu_code, page_no=1, num_of_rows=10):
    url = "https://data.myhome.go.kr/rentalHouseList"
    
    service_key = os.getenv("LH_RENTAL_HOUSE_API_KEY")
    if not service_key:
        raise ValueError("LH_RENTAL_HOUSE_API_KEY is not set.")
        
    params = {
        "ServiceKey": urllib.parse.unquote(service_key),
        "brtcCode": brtc_code,
        "signguCode": signgu_code,
        "pageNo": page_no,
        "numOfRows": num_of_rows
    }
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()
