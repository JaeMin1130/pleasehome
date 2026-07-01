#!/usr/bin/env python3
import os
import sys
import json
import re

def detect_features(md_content):
    """
    공고문 텍스트 내용을 기반으로 7대 기본 특성 플래그를 감지합니다.
    """
    # title 변수 정의 (is_reserve_only 등 하단 로직에서 사용됨)
    title_match = re.search(r'#\s*(.*)', md_content)
    title = title_match.group(1) if title_match else ""
    if not title:
        for line in md_content.split('\n'):
            line_str = line.strip().replace('|', '').strip()
            if line_str:
                title = line_str
                break

    # 1. has_complexes
    # 파일 상위 10줄 이내에 '전세임대' 혹은 '전세임대형'이 명시되어 있으면 실물 단지가 존재하지 않는 융자 지원 유형임
    has_complexes = True
    lines = md_content.split('\n')
    header_text = " ".join(lines[:10])
    
    if "전세임대" in header_text or "전세임대형" in header_text:
        has_complexes = False

    # 2. is_distributed
    # 상세 주택내역이 본문에 없고 외부 링크나 첨부파일로 우회되었는지 판별
    is_distributed = False
    dist_keywords = [
        "상세 내역은 첨부", "주택 내역은 첨부", "대상 주택 목록은 첨부", 
        "첨부파일을 참조", "홈페이지에서 확인", "별첨 자료", "별첨1", "첨부 1",
        "주택내역", "첨부파일", "별첨"
    ]
    # 본문 내 주택 주소나 공급 세부 정보를 담은 표의 유무를 정교하게 판별
    has_housing_table = False
    tables = re.findall(r'((?:\|.*\|\s*(?:\n|$))+)', md_content)
    for table in tables:
        # 1) 주소 표 혹은 주택형/타입을 명시하는 열 식별
        is_housing_ident = any(k in table for k in ["소재지", "주소", "단지명", "주택형", "주택 타입", "주택타입", "형별", "주택형별"])
        # 2) 면적 관련 열 식별
        is_area_ident = any(k in table for k in ["면적", "전용면적", "계약면적", "공급면적"])
        # 3) 가격 혹은 공급/모집 세대수 열 식별
        is_price_or_supply = any(k in table for k in ["보증금", "임대료", "공급호수", "모집호수", "세대수"])
        
        if is_housing_ident and is_area_ident and is_price_or_supply:
            has_housing_table = True
            break
            
    if not has_housing_table and any(k in md_content for k in dist_keywords):
        is_distributed = True

    # 3. is_income_linked
    # 소득 구간(1~6구간)별 차등 조건이 존재하는지 판별
    is_income_linked = False
    income_keywords = [
        "소득구간", "소득 분위", "1구간", "2구간", "3구간", "소득 50%", "소득 70%", "소득 100%"
    ]
    if any(k in md_content for k in income_keywords):
        is_income_linked = True

    # 4. is_deposit_optional
    # 보증금 비율 선택 옵션이 제공되는지 판별
    is_deposit_optional = False
    opt_keywords = [
        "보증금 비율", "선택형", "기본형", "30%형", "40%형", "보증금 선택", "임대보증금 비율"
    ]
    if any(k in md_content for k in opt_keywords):
        is_deposit_optional = True

    # 5. is_reserve_only
    # 예비입주자 모집 공고인지 판별
    is_reserve_only = False
    reserve_keywords = [
        "예비입주자", "예비자 모집", "예비자수", "예비자공급", "금회모집 예비자"
    ]
    if any(k in title for k in reserve_keywords) or (
        "예비입주자 모집" in md_content and "신규 공급" not in md_content
    ):
        is_reserve_only = True

    # 6. has_mutual_conversion
    # 상호전환 가능 여부 판별
    has_mutual_conversion = True
    no_conv_keywords = [
        "상호전환 불가", "전환 불가능", "전환할 수 없음"
    ]
    if any(k in md_content for k in no_conv_keywords):
        has_mutual_conversion = False
    elif not re.search(r'(?:상호전환|전환보증금|전환보증금|보증금 전환|환산율|전환요율|전환이율)', md_content):
        # 상호전환 관련 키워드가 아예 언급조차 없으면 False
        has_mutual_conversion = False

    # 7. has_unstandardized_address
    # 주소가 블록명 등으로 되어있고 표준 주소가 없는 경우 판별
    has_unstandardized_address = False
    block_keywords = [
        "블록", "BL", "지구", "도시개발구역"
    ]
    if any(k in md_content for k in block_keywords):
        # 표준 도로명/지번 주소 형태(예: "시 ", "구 ", "동 ", "길 ", "번지")가 인근에 없는지 체크
        # 만약 "블록"은 있는데 "번길" 이나 "도로" 형태의 구체적 주소가 주위에 드물면 True로 간주
        addresses = re.findall(r'(?:서울|경기|인천|강원|충북|충남|전북|전남|경북|경남|제주|부산|대구|광주|대전|울산|세종).*?\n', md_content)
        has_standard = False
        for addr in addresses:
            if re.search(r'\d+(?:번지|길|로)', addr):
                has_standard = True
                break
        if not has_standard and any(k in md_content for k in block_keywords):
            has_unstandardized_address = True

    return {
        "has_complexes": has_complexes,
        "is_distributed": is_distributed,
        "is_income_linked": is_income_linked,
        "is_deposit_optional": is_deposit_optional,
        "is_reserve_only": is_reserve_only,
        "has_mutual_conversion": has_mutual_conversion,
        "has_unstandardized_address": has_unstandardized_address
    }

def process_table_flatting(md_content):
    """
    마크다운 테이블을 파싱하여, 이전 행의 값을 하래 빈 셀로 채워주는
    전방 충전(Forward Fill) 테이블 평탄화 전처리를 수행합니다.
    """
    lines = md_content.split('\n')
    output_lines = []
    
    in_table = False
    table_headers = []
    prev_row_values = []
    
    for line in lines:
        stripped = line.strip()
        # 마크다운 테이블 라인인지 판별
        if stripped.startswith('|') and stripped.endswith('|'):
            # 구분선 행인지 판별 (예: |---|---|)
            if re.match(r'^\|[\s\-\|:]+\|$', stripped):
                output_lines.append(line)
                continue
                
            # 셀 추출 (맨 앞과 맨 뒤 빈 문자열 제외)
            cells = [c.strip() for c in stripped.split('|')[1:-1]]
            
            if not in_table:
                # 테이블 시작 (헤더 행)
                in_table = True
                table_headers = cells
                prev_row_values = [""] * len(cells)
                output_lines.append(line)
                continue
            
            # 일반 데이터 행 처리
            new_cells = []
            for idx, cell in enumerate(cells):
                if idx < len(prev_row_values):
                    # 빈 셀이고 이전 행에 누적된 값이 존재하면 상속 (전방 충전)
                    # 단, 수치 데이터나 특정 예약어는 상속 대상에서 제외하는 안전 장치 추가
                    is_numeric = re.match(r'^[\d,.\s]+$', cell)
                    if cell == "" and prev_row_values[idx] != "" and not is_numeric:
                        new_cells.append(prev_row_values[idx])
                    else:
                        new_cells.append(cell)
                        prev_row_values[idx] = cell
                else:
                    new_cells.append(cell)
                    prev_row_values.append(cell)
            
            # 다시 마크다운 테이블 라인 형태로 합체
            flat_line = "| " + " | ".join(new_cells) + " |"
            output_lines.append(flat_line)
        else:
            if in_table:
                # 테이블 종료
                in_table = False
                table_headers = []
                prev_row_values = []
            output_lines.append(line)
            
    return '\n'.join(output_lines)

def strip_housing_tables(md_content):
    """
    마크다운 텍스트에서 소형 일정, 배점 기준, 소득 자산 표 등은 살려두고,
    주택명, 단지명, 소재지 주소, 보증금/임대료, 주택형/면적 등 
    complexes 및 housing_units 테이블 적재 소스가 되는 테이블만 감지하여 제거합니다.
    이때, 테이블 헤더 영역(구분선 행 및 그 위쪽 라인들)은 지우지 않고 그대로 보존하여
    document_llm_source.md에 남겨둡니다.
    """
    lines = md_content.split('\n')
    output_lines = []
    
    in_table = False
    table_block = []
    
    # 단지/주택 정보 테이블 판단 키워드
    housing_keywords = ["소재지 주소", "주택명", "단지명", "건물명", "전용면적", "공급면적", "임대료", "보증금", "주택형", "타입", "세대수", "공급호수", "임대보증금"]
    # 보존해야 할 일정/자격 요건 테이블 판단 키워드
    preserve_keywords = ["신청접수", "서류제출", "계약체결", "당첨자 발표", "소득구분", "소득기준", "자산기준", "배점기준", "가점", "제출서류", "신청 자격"]
    
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('|') and stripped.endswith('|'):
            if not in_table:
                in_table = True
                table_block = [line]
            else:
                table_block.append(line)
        else:
            if in_table:
                in_table = False
                
                # 테이블의 텍스트 분석
                combined_table_text = " ".join(table_block)
                
                # 키워드 체크
                has_housing = any(k in combined_table_text for k in housing_keywords)
                has_preserve = any(k in combined_table_text for k in preserve_keywords)
                
                is_housing_table = False
                if has_housing:
                    if not has_preserve:
                        is_housing_table = True
                    else:
                        # 두 유형의 키워드가 혼재된 경우 데이터 행 수와 결합하여 판단
                        data_rows = [r for r in table_block if not re.match(r'^\|[\s\-\|:]+\|$', r.strip())]
                        if len(data_rows) >= 5:
                            is_housing_table = True
                
                if is_housing_table:
                    # [헤더 보존 소거 로직]
                    delimiter_idx = -1
                    for idx, row_line in enumerate(table_block):
                        if re.match(r'^\|[\s\-\|:]+\|$', row_line.strip()):
                            delimiter_idx = idx
                            break
                    if delimiter_idx != -1:
                        header_block = table_block[:delimiter_idx + 1]
                        output_lines.extend(header_block)
                    else:
                        output_lines.extend(table_block[:2])
                    output_lines.append("")
                else:
                    # 보존
                    output_lines.extend(table_block)
                table_block = []
            output_lines.append(line)
            
    if in_table:
        combined_table_text = " ".join(table_block)
        has_housing = any(k in combined_table_text for k in housing_keywords)
        has_preserve = any(k in combined_table_text for k in preserve_keywords)
        is_housing_table = False
        if has_housing:
            if not has_preserve:
                is_housing_table = True
            else:
                data_rows = [r for r in table_block if not re.match(r'^\|[\s\-\|:]+\|$', r.strip())]
                if len(data_rows) >= 5:
                    is_housing_table = True
                    
        if is_housing_table:
            delimiter_idx = -1
            for idx, row_line in enumerate(table_block):
                if re.match(r'^\|[\s\-\|:]+\|$', row_line.strip()):
                    delimiter_idx = idx
                    break
            if delimiter_idx != -1:
                header_block = table_block[:delimiter_idx + 1]
                output_lines.extend(header_block)
            else:
                output_lines.extend(table_block[:2])
            output_lines.append("")
        else:
            output_lines.extend(table_block)
            
    return '\n'.join(output_lines)

def slice_noise(md_content):
    """
    공고문 본문이 끝나고 후반부에 수록되는 제출 양식/서식(위임장, 동의서 등) 노이즈를 찾아내어
    그 시점부터 문서 끝까지를 슬라이싱(절삭)합니다.
    """
    # 엑셀 변환 데이터(### [주택목록 시트: ...)가 병합되어 있는 경우, 절삭 전 미리 추출하여 보존
    excel_marker = "### [주택목록 시트:"
    excel_content = ""
    if excel_marker in md_content:
        parts = md_content.split(excel_marker, 1)
        md_content = parts[0]
        excel_content = "\n\n" + excel_marker + parts[1]

    lines = md_content.split('\n')
    cutoff_idx = len(lines)
    
    # 절삭 기준이 될 핵심 키워드 패턴들 (주로 양식명이나 첨부 서식 헤더)
    # 단, '제출서류'처럼 본문 내에 흔히 등장하는 단어는 '양식/서식'이 뒤따를 때만 매칭하여 오판 차단
    cutoff_keywords = [
        r'■\s*고객동의서',
        r'■\s*개인정보\s*(?:제공|수집|이용)',
        r'■\s*위임장',
        r'■\s*청약신청서',
        r'■\s*서약서',
        r'■\s*공동신청',
        r'【서식\s*\d+】',
        r'\[서식\s*\d+\]',
        r'\[첨부\s*[2-9]\]', # 첨부 1은 주로 주택목록이므로 첨부 2부터 절삭
        r'【첨부\s*[2-9]】',
        r'\[별첨\s*[2-9]\]',
        r'【별첨\s*[2-9]】',
        r'별지\s*제\s*\d+\s*호\s*서식'
    ]
    
    for idx, line in enumerate(lines):
        # 헤더 수준(#, ##, ###, ■)의 라인이나 특정 라인에서 키워드 검출
        for pattern in cutoff_keywords:
            if re.search(pattern, line):
                cutoff_idx = idx
                break
        if cutoff_idx < len(lines):
            break
            
    if cutoff_idx < len(lines):
        # 에러 로그 방출 방지를 위해 표준 에러(sys.stderr)로 로깅하거나 단순 표시
        import sys
        print(f"[슬라이싱] 라인 {cutoff_idx}부터 문서 끝까지 절삭하였습니다. (매칭 라인: '{lines[cutoff_idx]}')", file=sys.stderr)
        return '\n'.join(lines[:cutoff_idx]) + excel_content
    return md_content + excel_content

def main():
    if len(sys.argv) < 2:
        print("사용법: python3 pre_processor.py <md_file_path>")
        sys.exit(1)
        
    md_path = sys.argv[1]
    if not os.path.exists(md_path):
        print(json.dumps({"error": f"파일을 찾을 수 없습니다: {md_path}"}))
        sys.exit(1)
        
    with open(md_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # 노이즈 양식 슬라이싱 전처리 수행
    content = slice_noise(content)
        
    # 7대 특성 판별
    features = detect_features(content)
    
    # api_meta.json이 존재하면 특성 정보 강제 재정의 (하이브리드용)
    dir_path = os.path.dirname(md_path)
    api_meta_path = os.path.join(dir_path, "api_meta.json")
    if os.path.exists(api_meta_path):
        try:
            with open(api_meta_path, "r", encoding="utf-8") as af:
                meta = json.load(af)
            inferred = meta.get("inferred_standards", {})
            if "has_complexes" in inferred:
                features["has_complexes"] = inferred["has_complexes"]
        except Exception as e:
            print(f"[경고] pre_processor 내 api_meta.json 읽기 실패: {e}", file=sys.stderr)
    
    # 마크다운 테이블 평탄화 전처리
    flat_content = process_table_flatting(content)
    
    # 평탄화된 파일 생성 (2번 이름 규칙: document_parser_source.md)
    base, ext = os.path.splitext(md_path)
    flat_path = os.path.join(os.path.dirname(md_path), f"document_parser_source{ext}")
    
    with open(flat_path, "w", encoding="utf-8") as f:
        f.write(flat_content)
        
    # 비정형 LLM 파싱용 테이블 소거 파일 생성 (2번 이름 규칙: document_llm_source.md)
    meta_only_content = strip_housing_tables(content)
    meta_only_path = os.path.join(os.path.dirname(md_path), f"document_llm_source{ext}")
    with open(meta_only_path, "w", encoding="utf-8") as f:
        f.write(meta_only_content)
        
    result = {
        "features": features,
        "flat_markdown_path": flat_path,
        "meta_only_markdown_path": meta_only_path
    }
    
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
