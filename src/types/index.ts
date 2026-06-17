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

export interface Limit {
  id: number;
  target_group: string | null;
  max_support_amount: number | null;
  deposit_limit: number | null;
  tenant_share: number | null;
  interest_rate: number | null;
  max_monthly_rent: number | null;
  notes: string | null;
}

export interface Announcement {
  id: number;
  title: string;
  institution: string;
  subscription_type: string;
  doc_path: string;
  deposit_increase_rate: number | null;
  deposit_decrease_rate: number | null;
  deposit_increase_limit_rate: number | null;
  deposit_decrease_limit_rate: number | null;
  schedules: Schedule[];
  details: Detail[];
  limits: Limit[];
}

export interface Complex {
  id: number;
  announcement_id: number;
  name: string;
  address: string;
  heating_type?: string;
  has_elevator?: boolean;
  parking_info?: string;
}

export interface HousingUnit {
  id: number;
  announcement_id: number;
  complex_id: number;
  room_number: string | null;
  room_count: number | null;
  supply_type: string | null;
  exclusive_area: number;
  contract_area: number | null;
  target_group: string | null;
  income_group: string | null;
  supply_count: number;
  reserve_count: number;
  deposit: number;
  monthly_rent: number;
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
