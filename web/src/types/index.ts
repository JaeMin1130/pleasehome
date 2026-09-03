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
  details: Detail[];
  recruitment_groups?: RecruitmentGroup[];
}

export interface Complex {
  id: number;
  announcement_id: number;
  recruitment_group_id?: number | null;
  recruitment_group_name?: string | null;
  recruitment_group?: RecruitmentGroup | null;
  name: string;
  address: string;
  heating_type?: string;
  has_elevator?: boolean;
  parking_info?: string;
  complex_type?: string;
  latitude: number | null;
  longitude: number | null;
  is_imprecise: number;
}

export interface HousingUnit {
  id: number;
  announcement_id: number;
  complex_id: number;
  room_number: string | null;
  room_count: number | null;
  room_type: string | null;
  supply_type: string | null;
  exclusive_area: number;
  contract_area: number | null;
  target_group: string | null;
  income_group: string | null;
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
