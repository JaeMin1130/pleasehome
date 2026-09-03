#!/usr/bin/env python3
import os
import sys
import json
import re
import argparse
from typing import List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator, ValidationError

# ==========================================
# 후처리(Soft Correction) 보정 헬퍼 함수
# ==========================================

def clean_int(v: Any) -> int:
    if v is None:
        return 0
    if isinstance(v, (int, float)):
        return int(v)
    # 콤마, 원, 천원 등 숫자 제외 문자 모두 제거
    s = str(v).strip()
    # '천원' 단위를 원 단위로 환산 처리
    multiplier = 1
    if '천원' in s:
        multiplier = 1000
    elif '만원' in s:
        multiplier = 10000
    
    s = re.sub(r'[^\d-]', '', s)
    return int(s) * multiplier if s else 0

def clean_float(v: Any) -> Optional[float]:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = re.sub(r'[^\d.-]', '', str(v))
    return float(s) if s else None

# ==========================================
# Pydantic v2 데이터 모델 정의
# ==========================================

INSTITUTION_MAP = {
    "LH": "LH", "한국토지주택공사": "LH", "토지주택공사": "LH",
    "SH": "SH", "서울주택도시공사": "SH", "서울도시주택공사": "SH", "서울주택공사": "SH",
    "GH": "GH", "경기주택도시공사": "GH", "경기도시공사": "GH",
    "iH": "iH", "인천도시공사": "iH", "인천주택도시공사": "iH", "인천광역시도시공사": "iH",
    "HUG": "HUG", "주택도시보증공사": "HUG",
    "민간": "민간"
}

REGION_MAP = {
    "서울": "서울특별시", "서울특별시": "서울특별시",
    "부산": "부산광역시", "부산광역시": "부산광역시",
    "대구": "대구광역시", "대구광역시": "대구광역시",
    "인천": "인천광역시", "인천광역시": "인천광역시",
    "광주": "광주광역시", "광주광역시": "광주광역시",
    "대전": "대전광역시", "대전광역시": "대전광역시",
    "울산": "울산광역시", "울산광역시": "울산광역시",
    "세종": "세종특별자치시", "세종특별자치시": "세종특별자치시",
    "경기": "경기도", "경기도": "경기도",
    "강원": "강원도", "강원도": "강원도",
    "충북": "충청북도", "충청북도": "충청북도",
    "충남": "충청남도", "충청남도": "충청남도",
    "전북": "전북특별자치도", "전북특별자치도": "전북특별자치도", "전북": "전북특별자치도",
    "전남": "전라남도", "전라남도": "전라남도",
    "경북": "경상북도", "경상북도": "경상북도",
    "경남": "경상남도", "경상남도": "경상남도",
    "제주": "제주특별자치도", "제주특별자치도": "제주특별자치도", "제주": "제주특별자치도"
}

class AnnouncementModel(BaseModel):
    title: str = Field(..., description="공고 제목")
    institution: str = Field(..., description="시행 기관 (LH, SH, GH, iH, HUG, 민간)")
    subscription_type: str = Field(..., description="청약 구분 (공공분양, 행복주택, 국민임대 등)")
    region: Optional[str] = Field(None, description="17대 광역지자체 표준명")
    dtl_url: Optional[str] = Field(None, description="PC 상세페이지 URL")
    dtl_url_mob: Optional[str] = Field(None, description="모바일 상세페이지 URL")

    @field_validator('institution', mode='before')
    @classmethod
    def clean_institution(cls, v: Any) -> str:
        s = str(v).strip()
        if s in INSTITUTION_MAP:
            return INSTITUTION_MAP[s]
        allowed = sorted(list(set(INSTITUTION_MAP.values())))
        raise ValueError(f"시행기관(institution)은 {allowed} 중 하나여야 합니다 (입력값: '{v}')")

    @field_validator('region', mode='before')
    @classmethod
    def clean_region(cls, v: Any) -> Optional[str]:
        if v is None or str(v).strip() == '' or str(v).lower() == 'null':
            return None
        s = str(v).strip()
        if s in REGION_MAP:
            return REGION_MAP[s]
        allowed = sorted(list(set(REGION_MAP.values())))
        raise ValueError(f"지역(region)은 {allowed} 중 하나여야 합니다 (입력값: '{v}')")


class ScheduleModel(BaseModel):
    schedule_type: str = Field(..., description="일정 타입")
    raw_text: str = Field(..., description="원본 텍스트")
    start_date: Optional[str] = Field(None, description="시작일시 (YYYY-MM-DD HH:MM:SS)")
    end_date: Optional[str] = Field(None, description="종료일시 (YYYY-MM-DD HH:MM:SS)")
    notes: Optional[str] = Field(None, description="비고")

    @field_validator('start_date', 'end_date', mode='before')
    @classmethod
    def parse_date_fields(cls, v: Any) -> Optional[str]:
        if v is None or str(v).strip() == '' or str(v).lower() == 'null' or str(v) == '해당사항없음' or str(v) == '해당사항 없음':
            return None
        s = str(v).strip()
        # 요일 정보 제거 (예: (월), [화], {수} 등)
        s = re.sub(r'[\(\[\{][가-힣a-zA-Z\s]+[\)\]\}]', '', s)
        # 점(.)을 대시(-)로 변경
        s = s.replace('.', '-')
        # 연속된 공백 단일화
        s = re.sub(r'\s+', ' ', s).strip()
        
        # 년-월-일만 있는 경우 끝에 기본 시간 00:00:00 추가
        if re.match(r'^\d{4}-\d{2}-\d{2}$', s):
            s += " 00:00:00"
        elif re.match(r'^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$', s):
            s += ":00"

        patterns = [
            (r'^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$', '%Y-%m-%d %H:%M:%S'),
        ]
        
        for regex, fmt in patterns:
            if re.match(regex, s):
                try:
                    dt = datetime.strptime(s, fmt)
                    return dt.strftime('%Y-%m-%d %H:%M:%S')
                except ValueError:
                    pass
        raise ValueError(f"날짜 형식이 YYYY-MM-DD HH:MM:SS 규격에 맞지 않습니다 (입력값: '{v}')")


class RecruitmentGroupModel(BaseModel):
    name: str = Field(..., description="주택군 / 모집단위명")
    region: Optional[str] = Field(None, description="소재 지역")
    supply_count: int = Field(0, description="주택군 총 공급호수")
    reserve_count: int = Field(0, description="주택군 총 모집 예비자수")
    notes: Optional[str] = Field(None, description="비고")

    @field_validator('supply_count', 'reserve_count', mode='before')
    @classmethod
    def parse_int_fields(cls, v: Any) -> int:
        return clean_int(v)


class ComplexModel(BaseModel):
    name: str = Field(..., description="단지명")
    address: str = Field(..., description="지번/도로명 주소")
    heating_type: Optional[str] = Field(None, description="난방 유형")
    has_elevator: Optional[bool] = Field(None, description="엘리베이터 여부")
    parking_info: Optional[str] = Field(None, description="주차장 세부 정보")
    complex_type: Optional[str] = Field(None, description="단지 유형")
    recruitment_group: Optional[str] = Field(None, description="소속 모집단위(주택군)명")

    @field_validator('has_elevator', mode='before')
    @classmethod
    def parse_elevator(cls, v: Any) -> Optional[bool]:
        if v is None or str(v).strip() == '' or str(v).lower() == 'null':
            return None
        s = str(v).strip().lower()
        if s in ('true', '1', 'y', 'yes', '있음', '유'):
            return True
        if s in ('false', '0', 'n', 'no', '없음', '무'):
            return False
        return None


class UnitModel(BaseModel):
    complex_name: str = Field(..., description="소속 단지명")
    complex_address: str = Field(..., description="소속 단지 주소")
    room_number: Optional[str] = Field(None, description="호실 번호")
    room_count: Optional[int] = Field(None, description="방 개수")
    room_type: str = Field(..., description="주택형/타입")
    supply_type: str = Field(..., description="공급 유형")
    exclusive_area: float = Field(..., description="전용 면적")
    contract_area: Optional[float] = Field(None, description="계약 면적")
    target_group: str = Field(..., description="공급 대상군")
    income_group: str = Field(..., description="소득 조건 그룹")
    supply_count: int = Field(..., description="공급 세대수")
    reserve_count: int = Field(..., description="예비 모집 세대수")
    deposit: int = Field(..., description="임대 보증금 / 분양가")
    monthly_rent: int = Field(..., description="월 임대료")
    max_deposit: Optional[int] = Field(None, description="최대 전환 임대보증금")
    min_deposit: Optional[int] = Field(None, description="최소 전환 임대보증금")
    max_monthly_rent: Optional[int] = Field(None, description="최대 전환 월 임대료")
    min_monthly_rent: Optional[int] = Field(None, description="최소 전환 월 임대료")
    attributes: Optional[str] = Field(None, description="특이 속성")

    @field_validator('deposit', 'monthly_rent', 'supply_count', 'reserve_count', mode='before')
    @classmethod
    def parse_int_fields(cls, v: Any) -> int:
        return clean_int(v)

    @field_validator('room_count', 'max_deposit', 'min_deposit', 'max_monthly_rent', 'min_monthly_rent', mode='before')
    @classmethod
    def parse_opt_int_fields(cls, v: Any) -> Optional[int]:
        if v is None or str(v).strip() == '' or str(v).lower() == 'null':
            return None
        return clean_int(v)

    @field_validator('exclusive_area', mode='before')
    @classmethod
    def parse_float_fields(cls, v: Any) -> float:
        res = clean_float(v)
        if res is None:
            raise ValueError("전용면적(exclusive_area)은 필수 숫자 필드입니다.")
        return res

    @field_validator('contract_area', mode='before')
    @classmethod
    def parse_opt_float_fields(cls, v: Any) -> Optional[float]:
        if v is None or str(v).strip() == '' or str(v).lower() == 'null':
            return None
        return clean_float(v)

    @model_validator(mode="after")
    def fill_conversion_defaults(self) -> 'UnitModel':
        # 상호전환 미지원 시 기본값 자동 복사 (Soft Correction)
        if self.max_deposit is None:
            self.max_deposit = self.deposit
        if self.min_deposit is None:
            self.min_deposit = self.deposit
        if self.max_monthly_rent is None:
            self.max_monthly_rent = self.monthly_rent
        if self.min_monthly_rent is None:
            self.min_monthly_rent = self.monthly_rent
        return self


class DetailModel(BaseModel):
    section_title: str = Field(..., description="상세 섹션 제목")
    section_content: str = Field(..., description="상세 마크다운 내용")
    sort_order: int = Field(..., description="정렬 순서 (1~6)")

    @field_validator('section_title')
    @classmethod
    def check_section_title(cls, v: str) -> str:
        allowed = ["신청 자격 요건", "소득 및 자산 기준", "임대 조건 및 융자 혜택", "선정 및 배점 기준", "신청 방법 및 제출 서류", "기관별 특화 및 유의사항"]
        if v not in allowed:
            raise ValueError(f"상세 섹션 제목(section_title)은 {allowed} 중 하나여야 합니다 (입력값: '{v}')")
        return v


class DataJsonModel(BaseModel):
    announcement: AnnouncementModel
    schedules: List[ScheduleModel] = Field(default_factory=list)
    recruitment_groups: List[RecruitmentGroupModel] = Field(default_factory=list)
    complexes: List[ComplexModel] = Field(default_factory=list)
    units: List[UnitModel] = Field(default_factory=list)
    details: List[DetailModel] = Field(default_factory=list)


# ==========================================
# 에러 메시지 포맷터
# ==========================================

def format_validation_error(e: ValidationError) -> str:
    errors = e.errors()
    formatted = []
    for err in errors:
        loc = err.get("loc", [])
        path = ""
        for item in loc:
            if isinstance(item, int):
                path += f"[{item}]"
            else:
                path += f".{item}" if path else item
        
        msg = err.get("msg", "")
        input_val = err.get("input", "")
        
        # 에러 메시지 친화적 번역
        if "Field required" in msg:
            msg = "필수 키/항목이 누락되었습니다."
        elif "value is not a valid" in msg:
            msg = "유효하지 않은 데이터 타입 또는 값입니다."
        elif "Input should be" in msg:
            msg = msg.replace("Input should be", "입력값은 다음 형식이어야 합니다:")
        
        formatted.append(f"- 오류 경로: {path}\n  상세 내용: {msg}\n  제공된 값: {repr(input_val)}")
    
    return "\n".join(formatted)


# ==========================================
# 메인 비즈니스 로직 및 CLI 인터페이스
# ==========================================

def merge_temp_files(directory: str) -> dict:
    """temp_meta.json, temp_units.json, temp_details.json 파일을 합칩니다."""
    meta_path = os.path.join(directory, "temp_meta.json")
    units_path = os.path.join(directory, "temp_units.json")
    details_path = os.path.join(directory, "temp_details.json")

    # 파일 존재 확인
    for p in (meta_path, units_path, details_path):
        if not os.path.exists(p):
            raise FileNotFoundError(f"필수 임시 파일이 디렉토리에 없습니다: {os.path.basename(p)}")

    try:
        with open(meta_path, "r", encoding="utf-8") as f:
            meta_data = json.load(f)
        with open(units_path, "r", encoding="utf-8") as f:
            units_data = json.load(f)
        with open(details_path, "r", encoding="utf-8") as f:
            details_data = json.load(f)
    except json.JSONDecodeError as je:
        raise ValueError(f"임시 JSON 파싱 에러: {je}")

    # 결합
    merged = {
        "announcement": meta_data.get("announcement", {}),
        "schedules": meta_data.get("schedules", []),
        "complexes": units_data.get("complexes", []),
        "units": units_data.get("units", []),
        "details": details_data.get("details", [])
    }
    return merged


def clean_temp_files(directory: str):
    """결합이 완료된 임시 파일들을 깔끔하게 삭제합니다."""
    for fn in ("temp_meta.json", "temp_units.json", "temp_details.json"):
        p = os.path.join(directory, fn)
        if os.path.exists(p):
            try:
                os.remove(p)
            except Exception as e:
                print(f"[경고] 임시 파일 {fn} 삭제 실패: {e}")


def main():
    parser = argparse.ArgumentParser(description="Pydantic v2 data.json Validator & Post-Processor")
    parser.add_argument("file_or_dir", help="검증할 data.json 파일 경로, 또는 임시 파일들이 위치한 디렉토리 경로")
    parser.add_argument("--merge", action="store_true", help="temp_*.json 파일들을 읽어 data.json으로 병합한 뒤 검증을 시작합니다.")
    parser.add_argument("--keep-temp", action="store_true", help="병합 성공 시에도 임시 파일을 삭제하지 않고 유지합니다.")
    
    args = parser.parse_args()
    target = args.file_or_dir

    try:
        if args.merge:
            if not os.path.isdir(target):
                print(f"[오류] --merge 적용 시 대상 경로는 디렉토리여야 합니다: {target}", file=sys.stderr)
                sys.exit(1)
            
            print(f"[정보] {target} 디렉토리 내 임시 파일 병합 시작...")
            data = merge_temp_files(target)
            dest_json_path = os.path.join(target, "data.json")
        else:
            if not os.path.isfile(target):
                print(f"[오류] 대상 파일이 존재하지 않습니다: {target}", file=sys.stderr)
                sys.exit(1)
            
            with open(target, "r", encoding="utf-8") as f:
                data = json.load(f)
            dest_json_path = target

        # Pydantic 검증 및 후처리(Soft Correction) 실행
        print(f"[정보] 데이터 정합성 검증 및 자동 후처리(Soft Correction) 시작...")
        model_instance = DataJsonModel(**data)
        
        # 성공 시 후처리된 데이터를 JSON으로 다시 변환
        processed_data = model_instance.model_dump()
        
        # 파일 저장 (이때, Overwrite 적용)
        with open(dest_json_path, "w", encoding="utf-8") as f:
            json.dump(processed_data, f, ensure_ascii=False, indent=2)
        print(f"[성공] 검증 및 정형화 성공! 결과 저장 완료: {dest_json_path}")

        # 임시 파일 정리
        if args.merge and not args.keep_temp:
            clean_temp_files(target)
            print("[정보] 임시 파일(temp_*.json) 삭제 완료.")

        sys.exit(0)

    except ValidationError as ve:
        print("\n" + "="*50, file=sys.stderr)
        print("[스키마 검증 에러 (Hard Failure)]", file=sys.stderr)
        print("="*50, file=sys.stderr)
        print(format_validation_error(ve), file=sys.stderr)
        print("="*50 + "\n", file=sys.stderr)
        sys.exit(2)
        
    except Exception as e:
        print(f"[오류] 프로세스 실행 에러: {e}", file=sys.stderr)
        sys.exit(3)


if __name__ == "__main__":
    main()
