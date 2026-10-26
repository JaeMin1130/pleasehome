import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
PDF_BASE_DIR = BASE_DIR / "db-pipeline" / "docs" / "pdf"
OLD_DIR = PDF_BASE_DIR / "!old"

# .env 로드 (프로젝트 루트 및 db-pipeline)
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / "db-pipeline" / ".env")

API_KEY = os.getenv("GEMINI_API_KEY")

SYSTEM_PROMPT = """당신은 대한민국 공공주택(LH, SH, GH) 청약 공고문 전문 데이터 추출 AI입니다.
주어진 공고문 PDF와 메타데이터(download_meta.json)를 정밀 분석하여, 아래 규격에 맞는 완전한 단일 JSON을 작성하세요.

[필수 원칙]
1. 최상위 키 6개를 반드시 포함해야 합니다: announcement, schedules, recruitment_groups, complexes, units, details
2. 수식이나 화살표에 LaTeX 기호($ 또는 \\rightarrow)를 절대 사용하지 말고, 유니코드 기호(→)를 사용하세요.
3. Clean Title: announcement.title에서 [정정], [재공고] 등 시스템 접두사를 제거한 정제된 공식 제목을 쓰세요.
4. 수치 일치: units 배열의 각 항목(supply_count, reserve_count)의 총합은 recruitment_groups의 공급/예비자 합계 및 공고 원문의 총 모집규모와 1:1로 정확히 일치해야 합니다.
5. details: 원문 PDF의 실제 페이지를 명시하는 주석(<!-- Source: 원본.pdf p.N -->)을 포함하여 7대 섹션(1.공급일정, 2.신청자격, 3.소득/자산기준, 4.선정방법/배점, 5.임대조건, 6.신청방법/서류, 7.유의사항)을 마크다운 텍스트로 작성하세요.

[JSON 스키마 규격]
{
  "announcement": {
    "title": "공고 제목",
    "institution": "LH | SH | GH",
    "subscription_type": "행복주택 | 국민임대 | 매입임대 | 공공분양 등",
    "region": "서울 | 경기 | 인천 등 17대 지자체명",
    "recruit_date": "YYYY-MM-DD",
    "doc_path": "PDF 상대경로"
  },
  "schedules": [
    {
      "schedule_type": "모집공고 | 신청접수 | 서류제출 | 당첨자발표 | 계약체결",
      "start_date": "YYYY-MM-DD HH:MM:SS (또는 null)",
      "end_date": "YYYY-MM-DD HH:MM:SS (또는 null)",
      "notes": "비고 또는 순위"
    }
  ],
  "recruitment_groups": [
    {
      "name": "주택군/모집단위명",
      "supply_count": 0,
      "reserve_count": 0,
      "region": "시/군/구명"
    }
  ],
  "complexes": [
    {
      "name": "단지명",
      "address": "지번주소 또는 도로명주소",
      "heating_type": "개별난방 | 지역난방 등",
      "has_elevator": true | false | null,
      "total_households": 0
    }
  ],
  "units": [
    {
      "complex_name": "소속 단지명",
      "exclusive_area": 0.0,
      "supply_count": 0,
      "reserve_count": 0,
      "deposit": 0,
      "monthly_rent": 0,
      "target_group": "일반공급 | 청년 | 신혼부부 | 고령자 등",
      "group_name": "소속 주택군명"
    }
  ],
  "details": [
    {
      "section_type": "공급일정 | 신청자격 | 소득자산기준 | 선정방법배점 | 임대조건 | 신청방법서류 | 유의사항",
      "content": "상세 내용 (마크다운)"
    }
  ]
}
반드시 순수 JSON 문자열만 출력하세요. 마크다운 코드블록(```json) 없이 원본 JSON만 반환하세요."""

def audit_data_json(data: dict, folder_name: str) -> Tuple[bool, List[str]]:
    """6대 핵심 영역 정합성 독립 전수 감사"""
    errors = []

    # 1. 6대 핵심 필드 존재 및 비어있지 않음 확인 (누적 규칙 #8)
    required_keys = ["announcement", "schedules", "recruitment_groups", "complexes", "units", "details"]
    for k in required_keys:
        if k not in data:
            errors.append(f"핵심 필드 누락: '{k}' 키가 없습니다.")
        elif isinstance(data[k], list) and len(data[k]) == 0:
            errors.append(f"핵심 필드 비어있음: '{k}' 배열의 길이가 0건입니다.")
        elif isinstance(data[k], dict) and len(data[k]) == 0:
            errors.append(f"핵심 필드 비어있음: '{k}' 딕셔너리가 비어있습니다.")

    if errors:
        return False, errors

    # 2. LaTeX 기호 검사 (누적 규칙 #7)
    json_str = json.dumps(data, ensure_ascii=False)
    if "$" in json_str or "\\rightarrow" in json_str:
        errors.append("LaTeX 수식 기호($, \\rightarrow)가 감지되었습니다. 유니코드 기호(→)로 변환해야 합니다.")

    # 3. 공고 및 단지 기본 필드 유효성
    ann = data.get("announcement", {})
    if not ann.get("title"):
        errors.append("announcement.title이 비어있습니다.")
    if ann.get("institution") not in ["LH", "SH", "GH", "iH", "HUG", "민간"]:
        errors.append(f"비표준 기관명: {ann.get('institution')}")

    # 4. 세대수 합계 1:1 교차 검증 (누적 규칙 #7)
    rg_supply_sum = sum(int(rg.get("supply_count") or 0) for rg in data.get("recruitment_groups", []))
    rg_reserve_sum = sum(int(rg.get("reserve_count") or 0) for rg in data.get("recruitment_groups", []))
    rg_total = rg_supply_sum + rg_reserve_sum

    unit_supply_sum = sum(int(u.get("supply_count") or 0) for u in data.get("units", []))
    unit_reserve_sum = sum(int(u.get("reserve_count") or 0) for u in data.get("units", []))
    unit_total = unit_supply_sum + unit_reserve_sum

    if rg_total != unit_total:
        errors.append(
            f"세대수 불일치: 주택군 총합({rg_total} = 공가 {rg_supply_sum} + 예비자 {rg_reserve_sum})과 "
            f"유닛 총합({unit_total} = 공가 {unit_supply_sum} + 예비자 {unit_reserve_sum})이 일치하지 않습니다. "
            f"(오차: {abs(rg_total - unit_total)}세대)"
        )

    # 5. complexes와 units의 단지명 일치 확인
    complex_names = {c.get("name") for c in data.get("complexes", []) if c.get("name")}
    for idx, u in enumerate(data.get("units", [])):
        c_name = u.get("complex_name")
        if not c_name or c_name not in complex_names:
            errors.append(f"유닛 [{idx}]의 소속 단지명('{c_name}')이 complexes 목록에 정의되어 있지 않습니다.")
            break

    is_passed = (len(errors) == 0)
    return is_passed, errors

def extract_with_gemini(folder: Path, feedback: Optional[str] = None) -> Optional[dict]:
    """Gemini API를 사용하여 PDF에서 data.json 추출"""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=API_KEY)

    # 폴더 내 가장 큰 PDF를 공고문 PDF로 선택
    pdf_files = sorted(folder.glob("*.pdf"), key=lambda f: f.stat().st_size, reverse=True)
    if not pdf_files:
        print(f"❌ [{folder.name}] PDF 파일이 없습니다.")
        return None

    main_pdf = pdf_files[0]
    print(f"📄 [{folder.name}] 원본 PDF 업로드 및 분석 중: {main_pdf.name} ({main_pdf.stat().st_size:,} bytes)...")

    # 한글 파일명으로 인한 HTTP 헤더 ASCII 인코딩 에러(UnicodeEncodeError) 방지용 임시 영문 링크 사용
    temp_pdf = Path("/tmp/pleasehome_notice.pdf")
    if temp_pdf.exists() or temp_pdf.is_symlink():
        temp_pdf.unlink()

    try:
        temp_pdf.symlink_to(main_pdf.resolve())
        uploaded_file = client.files.upload(
            file=str(temp_pdf),
            config=types.UploadFileConfig(
                mime_type="application/pdf",
                display_name="notice.pdf"
            )
        )
    finally:
        if temp_pdf.exists() or temp_pdf.is_symlink():
            temp_pdf.unlink()

    # 메타데이터 확인
    meta_path = folder / "download_meta.json"
    meta_text = ""
    if meta_path.exists():
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta_text = f"공고 다운로드 메타정보:\n{f.read()[:2000]}"
        except Exception:
            pass

    user_prompt = f"다음 공고문 PDF와 메타정보를 분석하여 청약 data.json을 작성하세요.\n{meta_text}\n"
    if feedback:
        user_prompt += f"\n\n⚠️ [이전 감사 불합격 피드백 - 반드시 수정할 사항]:\n{feedback}\n위의 지적된 오류를 완벽히 바로잡아 정정된 JSON을 반환하세요."

    # Gemini 2.5 Flash 호출
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[uploaded_file, user_prompt],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            temperature=0.1
        )
    )

    try:
        raw_text = response.text.strip()
        # 마크다운 코드블록 제거
        if raw_text.startswith("```"):
            raw_text = re.sub(r"^```[a-zA-Z]*\n?", "", raw_text)
            raw_text = re.sub(r"\n?```$", "", raw_text)
        data = json.loads(raw_text)
        return data
    except Exception as e:
        print(f"❌ [{folder.name}] JSON 파싱 실패: {e}")
        return None

def process_single_folder(folder: Path) -> bool:
    """1개 공고 폴더에 대해 추출 -> 독립 감사(FAIL 루프) -> DB 적재 파이프라인 수행"""
    print(f"\n{'='*70}")
    print(f"🚀 [공고 파이프라인 시작] 대상: {folder.name}")
    print(f"{'='*70}")

    token_file = folder / "audit_passed.token"
    data_file = folder / "data.json"

    # 이미 감사 토큰이 발급되어 있는 경우 바로 적재
    if token_file.exists() and data_file.exists():
        print(f"ℹ️ [{folder.name}] 이미 audit_passed.token이 존재합니다. 바로 DB 적재를 진행합니다.")
        return load_and_archive(folder)

    if not API_KEY:
        print("❌ GEMINI_API_KEY가 설정되어 있지 않습니다. (.env 파일을 확인하세요)")
        return False

    feedback = None
    max_retries = 3

    for attempt in range(1, max_retries + 1):
        print(f"\n🔄 [1단계: AI 추출] 시도 {attempt}/{max_retries}...")
        data = extract_with_gemini(folder, feedback)
        if not data:
            print(f"⚠️ 추출 실패. 재시도합니다.")
            continue

        # data.json 임시 저장
        with open(data_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"🧐 [2단계: 독립 감사] 6대 영역 및 수치 1:1 전수 감사 진행 중...")
        passed, errors = audit_data_json(data, folder.name)

        if passed:
            print(f"✅ [감사 통과] 모든 정합성 검증 100% 통과! audit_passed.token을 발급합니다.")
            token_file.write_text("AUDIT_PASSED_OK\n", encoding="utf-8")
            break
        else:
            print(f"❌ [감사 FAIL] {len(errors)}개 오류 발견:")
            for err in errors:
                print(f"   - {err}")
            feedback = "\n".join(f"- {err}" for err in errors)

    if not token_file.exists():
        print(f"\n❌ [{folder.name}] 최대 재시도 횟수({max_retries}회)를 초과하여 감사를 통과하지 못했습니다. 수동 확인이 필요합니다.")
        return False

    # 3단계: DB 직렬 적재 및 아카이빙
    return load_and_archive(folder)

def load_and_archive(folder: Path) -> bool:
    """audit_passed.token 확인 후 DB 적재 및 !old 아카이빙"""
    token_file = folder / "audit_passed.token"
    data_file = folder / "data.json"
    loader_script = BASE_DIR / ".agents" / "scripts" / "insert_loader.py"

    if not token_file.exists():
        print(f"⛔ audit_passed.token이 없어 DB 적재가 차단되었습니다: {folder.name}")
        return False

    print(f"\n💾 [3단계: DB 적재] insert_loader.py 실행 중...")
    res = subprocess.run([sys.executable, str(loader_script), str(data_file)], capture_output=True, text=True)
    print(res.stdout)
    if res.stderr:
        print(res.stderr, file=sys.stderr)

    if res.returncode != 0:
        print(f"❌ DB 적재 실패 (Exit code: {res.returncode})")
        return False

    # !old/ 폴더로 아카이빙
    OLD_DIR.mkdir(parents=True, exist_ok=True)
    dest_path = OLD_DIR / folder.name
    print(f"📦 [아카이빙] 적재 완료된 공고 폴더를 !old/ 로 이동: {folder.name} → {dest_path}")
    if dest_path.exists():
        shutil.rmtree(dest_path)
    shutil.move(str(folder), str(dest_path))

    print(f"🎉 [{folder.name}] 공고 파이프라인 완결! (적재 및 아카이빙 완료)")
    return True

def main():
    target_arg = sys.argv[1] if len(sys.argv) > 1 else "all"

    if target_arg != "all":
        folder = Path(target_arg)
        if not folder.is_dir():
            folder = PDF_BASE_DIR / target_arg
        if not folder.is_dir():
            print(f"❌ 대상 폴더를 찾을 수 없습니다: {target_arg}")
            sys.exit(1)
        folders = [folder]
    else:
        # 미처리 공고 폴더 스캔
        if not PDF_BASE_DIR.exists():
            print("📭 pdf 폴더가 존재하지 않습니다.")
            sys.exit(0)
        folders = [p for p in sorted(PDF_BASE_DIR.iterdir()) if p.is_dir() and p.name != "!old"]

    if not folders:
        print("📭 처리할 대기 중인 신규 공고가 없습니다. (모두 아카이빙 완료됨)")
        sys.exit(0)

    print(f"📋 총 {len(folders)}건의 미적재 공고 파이프라인을 순차 실행합니다.")
    success_count = 0
    fail_count = 0

    for f in folders:
        ok = process_single_folder(f)
        if ok:
            success_count += 1
        else:
            fail_count += 1

    print(f"\n{'='*70}")
    print(f"📊 [공고 파이프라인 최종 결과 리포트]")
    print(f"{'='*70}")
    print(f"- 총 작업 대상: {len(folders)}건")
    print(f"- ✅ 성공 (DB 적재 및 아카이빙 완료): {success_count}건")
    print(f"- ❌ 실패/주의: {fail_count}건")
    print(f"{'='*70}\n")

if __name__ == "__main__":
    main()
