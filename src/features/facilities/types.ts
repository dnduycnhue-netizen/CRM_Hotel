export type AssetStatus = 'in_use' | 'in_storage' | 'broken' | 'under_repair' | 'disposed';
export type WorkOrderKind = 'corrective' | 'preventive' | 'inspection' | 'request';
export type WorkOrderPriority = 'urgent' | 'high' | 'normal' | 'low';
export type WorkOrderStatus =
  | 'new'
  | 'assigned'
  | 'in_progress'
  | 'on_hold'
  | 'done'
  | 'closed'
  | 'cancelled';

export interface AssetCategory {
  id: string;
  code: string;
  name: string;
  default_life_months?: number | null;
  sort: number;
}

export interface FacilityLocation {
  id: string;
  branch_id: string;
  name: string;
  kind: 'area' | 'floor' | 'technical' | 'outdoor' | 'storage' | 'other';
  is_active: boolean;
}

export interface Asset {
  id: string;
  branch_id: string;
  branch_name?: string;
  code: string;
  name: string;
  category_id: string;
  category_name?: string;
  room_id?: string | null;
  room_number?: string | null;
  location_id?: string | null;
  location_name?: string | null;
  brand?: string | null;
  model?: string | null;
  serial_no?: string | null;
  purchase_date?: string | null;
  purchase_cost?: number | null;
  warranty_until?: string | null;
  quantity: number;
  status: AssetStatus;
  note?: string | null;
}

export interface WorkOrderEvent {
  id: number;
  work_order_id: string;
  at: string;
  actor_name?: string | null;
  from_status?: WorkOrderStatus | null;
  to_status?: WorkOrderStatus | null;
  comment?: string | null;
}

export interface WorkOrder {
  id: string;
  number: number;
  branch_id: string;
  branch_name?: string;
  kind: WorkOrderKind;
  title: string;
  description?: string | null;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  room_id?: string | null;
  room_number?: string | null;
  location_id?: string | null;
  location_name?: string | null;
  asset_id?: string | null;
  asset_name?: string | null;
  blocks_room: boolean;
  reported_by?: string | null;
  reporter_name?: string | null;
  reported_at: string;
  assignee_id?: string | null;
  assignee_name?: string | null;
  vendor_id?: string | null;
  vendor_name?: string | null;
  due_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  closed_at?: string | null;
  resolution?: string | null;
  labor_cost: number;
  parts_cost: number;
  vendor_cost: number;
  total_cost: number;
  photo_paths: string[];
}

export interface RoomBlockItem {
  id: string;
  branch_id: string;
  branch_name: string;
  room_id: string;
  room_number: string;
  reason: string;
  starts_at: string;
  ends_at?: string | null;
  work_order_id?: string | null;
  work_order_number?: number | null;
  created_by_name?: string | null;
}
