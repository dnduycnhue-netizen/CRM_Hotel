export interface ReportKpiMetrics {
  arrivals: number;
  guests: number;
  room_nights: number;
  available_room_nights: number;
  blocked_room_nights: number;
  occupancy: number; // Tỷ lệ công suất %
  alos: number; // Số ngày ở bình quân (Average Length of Stay)
  new_guests: number;
  returning_guests: number;
  cross_branch_guests: number;
  returning_rate: number; // Tỷ lệ khách quay lại %
  cancellations: number;
  cancel_rate: number; // Tỷ lệ hủy %
}

export interface BranchReportKpi {
  branch_id: string;
  branch: string;
  current: ReportKpiMetrics;
  compare?: ReportKpiMetrics | null;
}

export interface ChannelReportKpi {
  channel: string;
  kind: string;
  current: number;
  compare?: number | null;
}

export interface NationalityReportKpi {
  nationality: string;
  guests: number;
}

export interface ReportKpisResponse {
  range: { from: string; to: string };
  compare_range?: {
    from: string;
    to: string;
    mode: string;
    coverage: number;
  } | null;
  current: ReportKpiMetrics;
  compare?: ReportKpiMetrics | null;
  by_branch: BranchReportKpi[];
  by_channel: ChannelReportKpi[];
  by_nationality: NationalityReportKpi[];
}

export interface ReportSeriesPoint {
  idx: number;
  bucket: string;
  cmp_bucket?: string | null;
  cur: ReportKpiMetrics;
  cmp?: ReportKpiMetrics | null;
}

export interface MonthlyReportRow {
  month: string;
  source: string;
  arrivals: number;
  room_nights: number;
  available_room_nights: number;
  occupancy: number;
  room_revenue?: number | null;
  adr?: number | null; // Average Daily Rate (Giá phòng bình quân)
  revpar?: number | null; // Revenue Per Available Room
}

export interface FacilityReportResponse {
  current: {
    created: number;
    completed: number;
    avg_resolve_hours: number;
    on_time_rate: number;
    total_cost: number;
    pm_due: number;
    pm_on_time_rate: number;
    blocked_room_nights: number;
    by_category?: Array<{ category: string; orders: number; cost: number }>;
  };
  compare?: any;
  compare_range?: { from: string; to: string };
}

export interface MonthlyInputFigures {
  arrivals: number | null;
  guests: number | null;
  room_nights: number | null;
  available_room_nights: number | null;
  room_revenue: number | null;
  other_revenue: number | null;
  note: string | null;
  entered_by_name?: string | null;
  entered_at?: string | null;
  locked_at?: string | null;
  locked_by_name?: string | null;
  unlock_reason?: string | null;
}

export interface MonthlyInputCrmFigures {
  arrivals: number;
  guests: number;
  room_nights: number;
}

export interface MonthlyInputBranchRow {
  branch_id: string;
  branch_name: string;
  branch_code: string;
  is_locked: boolean;
  can_input: boolean;
  can_lock: boolean;
  can_unlock: boolean;
  figures: MonthlyInputFigures;
  crm_figures: MonthlyInputCrmFigures;
  suggested_available_room_nights: number;
  active_rooms: number;
  days_in_month: number;
}

