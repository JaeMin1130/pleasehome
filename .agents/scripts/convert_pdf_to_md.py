#!/usr/bin/env python3
import os
import sys
import argparse
import re
import shutil
import tempfile

def parse_metadata(pdf_path):
    filename = os.path.basename(pdf_path)
    
    # 1. 파일명에서 연도 추출 (4자리 숫자)
    year = "2026"  # 기본값
    year_match = re.search(r"(20\d{2})", filename)
    if year_match:
        year = year_match.group(1)
        
    # 2. 파일명에서 차수/구분 추출
    order = "1차"  # 기본값
    if "상반기" in filename:
        order = "상반기"
    elif "하반기" in filename:
        order = "하반기"
    elif "특화형" in filename:
        order = "특화형"
    elif "공임50년" in filename or "50년공공임대" in filename:
        order = "50년"
    else:
        order_match = re.search(r"제?(\d+)차", filename)
        if order_match:
            order = f"{order_match.group(1)}차"
        elif "신혼신생아" in filename:
            order = "신혼신생아1"
            
    # 특수 처리: 자립준비청년 키워드 결합
    if "자립준비청년" in filename:
        order = f"{order}_자립준비청년"
            
    # 3. 파일명에서 청약유형 추출
    category = None
    if "행복주택" in filename:
        category = "행복주택"
    elif "장기전세주택2" in filename or "장기전세2" in filename or "미리내집" in filename:
        category = "장기전세2"
    elif "장기전세" in filename:
        category = "장기전세"
    elif "든든전세" in filename or "든든주택" in filename:
        category = "든든전세"
    elif "국민임대" in filename:
        category = "국민임대"
    elif "영구임대" in filename:
        category = "영구임대"
    elif "통합공공임대" in filename:
        category = "통합공공임대"
    elif "매입임대" in filename:
        category = "매입임대"
    elif "전세임대" in filename:
        category = "전세임대"
    elif "청년안심" in filename:
        category = "청년안심"
    elif "장기안심" in filename:
        category = "장기안심"
    elif "희망하우징" in filename:
        category = "희망하우징"
    elif "공공임대" in filename:
        category = "공공임대"

    # 4. 기관명 1차 추출 (LH, SH, GH, iH, HUG)
    institution = None
    if "LH" in filename or "한국토지주택공사" in filename:
        institution = "LH"
    elif "SH" in filename or "서울주택도시공사" in filename:
        institution = "SH"
    elif "GH" in filename or "경기주택도시공사" in filename or "경기도시공사" in filename:
        institution = "GH"
    elif "iH" in filename or "인천도시공사" in filename:
        institution = "iH"
    elif "HUG" in filename or "주택도시보증공사" in filename:
        institution = "HUG"
    else:
        # 파일명에서 지자체명/조합명 등 감지 시도 (백업)
        agency_match = re.search(r"\(?[a-zA-Z0-9_]*\)?([가-힣\w]+(?:도시공사|주택공사|협동조합|시|군|구))", filename)
        if agency_match:
            institution = agency_match.group(1)

    # 5. 본문 텍스트 분석 기반 보정 (기관명이 표준 5대 기관이 아니거나 유형을 감지 못한 경우 강제 구동)
    if not category or institution not in ["LH", "SH", "GH", "iH", "HUG"]:
        try:
            import opendataloader_pdf
            with tempfile.TemporaryDirectory() as temp_dir:
                opendataloader_pdf.convert(
                    input_path=[pdf_path],
                    output_dir=temp_dir,
                    format="markdown"
                )
                md_files = [f for f in os.listdir(temp_dir) if f.endswith(".md")]
                if md_files:
                    with open(os.path.join(temp_dir, md_files[0]), "r", encoding="utf-8") as f:
                        text = f.read(5000)  # 첫 5000자 분석
                    
                    if not category:
                        if "행복주택" in text:
                            category = "행복주택"
                        elif "장기전세" in text:
                            if "장기전세주택2" in text or "미리내집" in text:
                                category = "장기전세2"
                            else:
                                category = "장기전세"
                        elif "든든전세" in text or "든든주택" in text:
                            category = "든든전세"
                        elif "국민임대" in text:
                            category = "국민임대"
                        elif "영구임대" in text:
                            category = "영구임대"
                        elif "통합공공임대" in text:
                            category = "통합공공임대"
                        elif "매입임대" in text:
                            category = "매입임대"
                        elif "전세임대" in text:
                            category = "전세임대"
                        elif "청년안심" in text:
                            category = "청년안심"
                        elif "장기안심" in text:
                            category = "장기안심"
                    
                    # 기관명 재검증 및 강제 보정
                    if "한국토지주택공사" in text or "LH" in text or "L.H" in text:
                        institution = "LH"
                    elif "서울주택도시공사" in text or "SH" in text:
                        institution = "SH"
                    elif "경기주택도시공사" in text or "GH" in text or "경기도시공사" in text:
                        institution = "GH"
                    elif "인천도시공사" in text or "iH" in text:
                        institution = "iH"
                    elif "주택도시보증공사" in text or "HUG" in text:
                        institution = "HUG"
        except Exception as e:
            pass

    # 최종 기본값 세팅
    if not institution:
        institution = "LH"
    if not category:
        category = "공공임대"
        
    return year, order, category, institution

def convert_single_pdf(pdf_path, output_dir, folder_name):
    # opendataloader-pdf 로드
    import opendataloader_pdf
    
    # 출력 디렉토리 생성
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"변환 시작: {pdf_path}")
    print(f"변환 출력지: {output_dir}")
    
    pdf_filename = os.path.basename(pdf_path)
    pdf_basename = os.path.splitext(pdf_filename)[0]
    
    # 변환 실행
    opendataloader_pdf.convert(
        input_path=[pdf_path],
        output_dir=output_dir,
        format="markdown"
    )
    
    # 표준화 후처리 (document.md & images/ 로 리네임)
    generated_md = os.path.join(output_dir, f"{pdf_basename}.md")
    standard_md = os.path.join(output_dir, "document.md")
    generated_images = os.path.join(output_dir, f"{pdf_basename}_images")
    standard_images = os.path.join(output_dir, "images")

    # 가. 마크다운 파일명 변경
    if os.path.exists(generated_md):
        if os.path.exists(standard_md):
            os.remove(standard_md)
        os.rename(generated_md, standard_md)
        print(f"-> 마크다운 파일 표준화 완료: {standard_md}")
    else:
        # 예외 상황: 변환된 다른 이름의 md가 있는지 탐색
        md_files = [f for f in os.listdir(output_dir) if f.endswith(".md") and f != "document.md"]
        if md_files:
            shutil.move(os.path.join(output_dir, md_files[0]), standard_md)
            pdf_basename = os.path.splitext(md_files[0])[0]
            generated_images = os.path.join(output_dir, f"{pdf_basename}_images")

    # 나. 이미지 폴더명 변경 및 마크다운 내 이미지 링크 치환
    if os.path.exists(generated_images):
        if os.path.exists(standard_images):
            shutil.rmtree(standard_images)
        os.rename(generated_images, standard_images)
        print(f"-> 이미지 디렉토리 표준화 완료: {standard_images}")

        # 마크다운 파일 내의 이미지 참조 경로 치환 (예: origin_images/ -> images/)
        if os.path.exists(standard_md):
            with open(standard_md, "r", encoding="utf-8") as f:
                content = f.read()
            
            old_rel_path = f"{pdf_basename}_images/"
            new_rel_path = "images/"
            
            if old_rel_path in content:
                content = content.replace(old_rel_path, new_rel_path)
                with open(standard_md, "w", encoding="utf-8") as f:
                    f.write(content)
                print("-> 마크다운 내 이미지 참조 링크 치환 완료.")

def run_auto_scan():
    base_pdf_dir = "/home/iru/project03/doc/pdf"
    base_md_dir = "/home/iru/project03/doc/md"
    
    # 1. 미분류 PDF 파일 목록 가져오기
    pdf_files = [
        f for f in os.listdir(base_pdf_dir) 
        if f.lower().endswith(".pdf") and os.path.isfile(os.path.join(base_pdf_dir, f))
    ]
    
    if not pdf_files:
        print("정리할 미분류 PDF 파일이 doc/pdf/ 루트에 존재하지 않습니다.")
        return
        
    print(f"미분류 PDF 파일 {len(pdf_files)}개를 감지했습니다.")
    
    for pdf_name in pdf_files:
        pdf_path = os.path.join(base_pdf_dir, pdf_name)
        print(f"\n==========================================")
        print(f"자동 감지 및 처리 중: {pdf_name}")
        
        # 가. 메타데이터 파싱
        year, order, category, institution = parse_metadata(pdf_path)
        
        # 나. 시퀀스 번호 결정 (동일 조합 존재 시 자동 증가)
        prefix = f"{year}_{order}_{category}_{institution}_"
        existing_seqs = []
        for d in os.listdir(base_pdf_dir):
            if os.path.isdir(os.path.join(base_pdf_dir, d)) and d.startswith(prefix):
                try:
                    seq_str = d[len(prefix):]
                    existing_seqs.append(int(seq_str))
                except ValueError:
                    pass
        
        if existing_seqs:
            next_seq = max(existing_seqs) + 1
        else:
            next_seq = 1
            
        std_folder_name = f"{year}_{order}_{category}_{institution}_{next_seq:02d}"
        print(f"-> 판정된 표준 공고명: {std_folder_name}")
        
        target_folder = os.path.join(base_pdf_dir, std_folder_name)
        # 원본 PDF 파일명 유지 (유저 규칙 #1)
        target_pdf_path = os.path.join(target_folder, pdf_name)
        
        # 다. 폴더 생성 및 이동
        os.makedirs(target_folder, exist_ok=True)
        
        if os.path.exists(target_pdf_path):
            print(f"-> 동일 파일이 이미 타겟 폴더에 존재하여 덮어씁니다.")
        shutil.move(pdf_path, target_pdf_path)
        print(f"-> 표준 폴더로 이동 완료: {target_pdf_path}")
            
        # 라. 변환 실행
        output_dir = os.path.join(base_md_dir, std_folder_name)
        try:
            convert_single_pdf(target_pdf_path, output_dir, std_folder_name)
            print(f"-> 변환 성공! 결과 경로: doc/md/{std_folder_name}/document.md")
        except Exception as e:
            print(f"-> 변환 실패! 에러: {e}", file=sys.stderr)

def main():
    parser = argparse.ArgumentParser(
        description="PDF 파일을 표준 마크다운(document.md & images/)으로 변환하고 정리하는 통합 스크립트입니다."
    )
    parser.add_argument(
        "target",
        nargs="?",
        default=None,
        help="변환할 공고 폴더명(예: 2026_1차_행복주택) 또는 PDF 직접 경로 (생략 시 자동 미분류 파일 스캔)"
    )
    
    args = parser.parse_args()
    
    # 인자가 생략되었으면 자동 스캔 실행
    if args.target is None:
        run_auto_scan()
        sys.exit(0)
        
    # 인자가 주어졌으면 단일 파일 변환 모드로 가동
    base_pdf_dir = "/home/iru/project03/doc/pdf"
    base_md_dir = "/home/iru/project03/doc/md"
    
    target = args.target
    if not os.path.exists(target) and not os.path.isabs(target):
        folder_pdf_dir = os.path.join(base_pdf_dir, target)
        if os.path.isdir(folder_pdf_dir):
            pdfs = [f for f in os.listdir(folder_pdf_dir) if f.lower().endswith(".pdf")]
            if pdfs:
                pdf_path = os.path.join(folder_pdf_dir, pdfs[0])
            else:
                pdf_path = os.path.join(folder_pdf_dir, "origin.pdf")  # fallback
        else:
            pdf_path = os.path.join(base_pdf_dir, target)
        output_dir = os.path.join(base_md_dir, target)
        folder_name = target
    else:
        pdf_path = os.path.abspath(target)
        folder_name = os.path.basename(os.path.dirname(pdf_path))
        output_dir = os.path.join(base_md_dir, folder_name)

    if not os.path.isfile(pdf_path):
        print(f"오류: PDF 파일을 찾을 수 없습니다: {pdf_path}", file=sys.stderr)
        sys.exit(1)
        
    try:
        convert_single_pdf(pdf_path, output_dir, folder_name)
        print("모든 변환 및 표준화 후처리가 성공적으로 완료되었습니다!")
    except Exception as e:
        print(f"변환 중 오류 발생: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
