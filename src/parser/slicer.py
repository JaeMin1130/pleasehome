#!/usr/bin/env python3
import os
import sys

def slice_document(folder_name):
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    doc_path = os.path.join(base_dir, "doc", "md", folder_name, "document.md")
    
    if not os.path.exists(doc_path):
        print(f"Error: {doc_path} not found.")
        return None
        
    with open(doc_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    # Cut-off point: 후반부 서약서 양식 등 제거
    cutoff_index = len(lines)
    for idx, line in enumerate(lines):
        if idx > len(lines) * 0.5:
            if "개인정보 제공 동의서" in line or "개인정보 수집" in line or "위임장" in line or "서약서" in line or "생계·의료급여 수급자 등의 임대조건 상한" in line:
                cutoff_index = idx
                break
    lines = lines[:cutoff_index]
    
    # 테이블 라인 인덱스 찾기
    table_divider_indices = [idx for idx, line in enumerate(lines) if "|---" in line]
    
    # 핵심 데이터 테이블 감지 및 범위 수집
    matched_ranges = []
    
    for div_idx in table_divider_indices:
        # 테이블의 시작행 찾기
        start_idx = div_idx
        while start_idx > 0 and lines[start_idx - 1].strip().startswith("|"):
            start_idx -= 1
            
        # 테이블의 종료행 찾기
        end_idx = div_idx
        while end_idx < len(lines) - 1 and lines[end_idx + 1].strip().startswith("|"):
            end_idx += 1
            
        # 테이블 콘텐츠 결합
        table_content = "".join(lines[start_idx:end_idx + 1])
        
        # 줌 아웃하여 오직 가장 정제된 청약 기본 뼈대 데이터 테이블만 매칭
        keywords = ['공급호수', '신청접수', '기본 임대조건', '임대보증금', '월임대료']
        # 수급자 상한선 등 제외
        if any(kw in table_content for kw in keywords) and "생계·의료급여" not in table_content:
            # 테이블 시작 전 10라인부터 테이블 종료 후 15라인까지 컴팩트하게 수집
            range_start = max(0, start_idx - 10)
            range_end = min(len(lines), end_idx + 16)
            matched_ranges.append((range_start, range_end))
            
    # 범위 정렬 및 병합 (Merge overlap)
    if not matched_ranges:
        print("No matching table content found.")
        return ""
        
    ranges = matched_ranges
    ranges.sort(key=lambda x: x[0])
    merged_ranges = [ranges[0]]
    for current in ranges[1:]:
        prev_start, prev_end = merged_ranges[-1]
        curr_start, curr_end = current
        if curr_start <= prev_end:
            merged_ranges[-1] = (prev_start, max(prev_end, curr_end))
        else:
            merged_ranges.append(current)
            
    sliced_content = []
    for start, end in merged_ranges:
        sliced_content.append(f"\n--- [Line {start} to {end}] ---\n")
        sliced_content.extend(lines[start:end])
        
    output_text = "".join(sliced_content)
    
    # 저장 경로
    output_path = os.path.join(base_dir, "doc", "md", folder_name, "sliced.txt")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(output_text)
        
    print(f"Successfully sliced. Saved to {output_path} (Original: {len(lines)} lines -> Sliced: {output_text.count(chr(10))} lines)")
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python slicer.py {folder_name}")
        sys.exit(1)
    slice_document(sys.argv[1])
