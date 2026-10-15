export type ApplicationStatus = 'UPCOMING' | 'ONGOING' | 'CLOSED';

export interface Schedule {
  id: number;
  schedule_type: string;
  start_date: string | null;
  end_date: string | null;
  raw_text: string | null;
  notes: string | null;
}

export interface Detail {
  id: number;
  section_title: string;
  section_content: string;
  sort_order: number;
}

export interface RecruitmentGroup {
  id: number;
  announcement_id: number;
  name: string;
  region?: string | null;
  supply_count: number;
  reserve_count: number;
  notes?: string | null;
}

export interface Announcement {
  id: number;
  title: string;
  institution: string;
  subscription_type: string;
  doc_path: string;
  region?: string | null; // 💡 DB region 컬럼 매핑 타입 추가
  dtl_url?: string | null;
  dtl_url_mob?: string | null;
  schedules: Schedule[];
  details?: Detail[];
  recruitment_groups?: RecruitmentGroup[];
}

export interface Complex {
  id: number;
  announcement_id: number; // 최초 발견 공고 참고용 메타 (단지는 전역 엔티티, 여러 공고에 걸칠 수 있음)
  // 신청단위는 이제 단지 1개에 고정되지 않을 수 있어 이름/합계를 모아서 내려줌 (docs/dev/DOMAIN_MODEL.md 3.3)
  recruitment_group_name?: string | null;
  recruitment_group_supply_count?: number | null;
  recruitment_group_reserve_count?: number | null;
  name: string;
  address: string;
  heating_type?: string;
  has_elevator?: boolean;
  parking_info?: string;
  complex_type?: string;
  min_deposit?: number | null;
  max_deposit?: number | null;
  min_monthly_rent?: number | null;
  max_monthly_rent?: number | null;
  min_exclusive_area?: number | null;
  max_exclusive_area?: number | null;
  total_supply_count?: number | null;
  total_reserve_count?: number | null;
  latitude: number | null;
  longitude: number | null;
  is_imprecise: number;
}

export interface HousingUnit {
  id: number;
  announcement_id: number;
  complex_id: number;
  recruitment_group_id?: number | null;
  room_number: string | null;
  room_count: number | null;
  room_type: string | null;
  supply_type: string | null;
  exclusive_area: number;
  contract_area: number | null;
  target_group: string | null;
  target_tags?: string[]; // target_group 압축 문자열을 분해한 자격 태그 (docs/dev/DOMAIN_MODEL.md 3.5)
  income_group: string | null;
  // 자격진단/향후 기능용 신규 분해 필드 (docs/dev/DOMAIN_MODEL.md 3.4) — 현재 UI는 미사용
  housing_product_type?: string | null;
  allocation_method?: string | null;
  priority_rank?: string | null;
  rent_price_tier?: number | null;
  income_threshold_pct?: number | null;
  income_threshold_condition?: string | null;
  sale_price?: number | null;
  supply_count: number;
  reserve_count: number;
  deposit: number;
  monthly_rent: number;
  max_deposit: number | null;
  min_deposit: number | null;
  max_monthly_rent: number | null;
  min_monthly_rent: number | null;
  attributes: string | null;
}

export interface FilterState {
  targetGroup: string;
  minArea: number;
  maxArea: number;
  minDeposit: number;
  maxDeposit: number;
  minMonthlyRent: number;
  maxMonthlyRent: number;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface BookmarkItem {
  complexId: number;
  folderId: string;
  memo?: string;
  createdAt: string;
}

export interface Member {
  id: string;
  security_q: string;
  created_at: string;
}
