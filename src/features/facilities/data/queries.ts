import { createClient } from "@/lib/supabase/server";
import type {
  Asset,
  FacilityLocation,
  RoomBlockItem,
  WorkOrder,
  WorkOrderEvent,
} from "../types";

export async function getWorkOrders(options?: {
  branchId?: string;
  status?: string;
  limit?: number;
}): Promise<WorkOrder[]> {
  const supabase = await createClient();
  const limit = options?.limit || 50;

  let query = supabase
    .from("work_orders")
    .select(`
      id,
      number,
      branch_id,
      branch:branches(name),
      kind,
      title,
      description,
      priority,
      status,
      room_id,
      room:rooms(number),
      location_id,
      location:facility_locations(name),
      asset_id,
      asset:assets(name),
      blocks_room,
      reported_by,
      reporter:profiles!work_orders_reported_by_fkey(full_name),
      reported_at,
      assignee_id,
      assignee:profiles!work_orders_assignee_id_fkey(full_name),
      vendor_id,
      due_at,
      started_at,
      completed_at,
      closed_at,
      resolution,
      labor_cost,
      parts_cost,
      vendor_cost,
      total_cost,
      photo_paths
    `)
    .order("reported_at", { ascending: false })
    .limit(limit);

  if (options?.branchId) {
    query = query.eq("branch_id", options.branchId);
  }

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[getWorkOrders error]", error);
    return [];
  }
  if (!data) return [];

  return data.map((w: any) => {
    const branch = Array.isArray(w.branch) ? w.branch[0] : w.branch;
    const room = Array.isArray(w.room) ? w.room[0] : w.room;
    const location = Array.isArray(w.location) ? w.location[0] : w.location;
    const asset = Array.isArray(w.asset) ? w.asset[0] : w.asset;
    const reporter = Array.isArray(w.reporter) ? w.reporter[0] : w.reporter;
    const assignee = Array.isArray(w.assignee) ? w.assignee[0] : w.assignee;

    return {
      id: w.id,
      number: w.number,
      branch_id: w.branch_id,
      branch_name: branch?.name,
      kind: w.kind,
      title: w.title,
      description: w.description,
      priority: w.priority,
      status: w.status,
      room_id: w.room_id,
      room_number: room?.number,
      location_id: w.location_id,
      location_name: location?.name,
      asset_id: w.asset_id,
      asset_name: asset?.name,
      blocks_room: w.blocks_room,
      reported_by: w.reported_by,
      reporter_name: reporter?.full_name,
      reported_at: w.reported_at,
      assignee_id: w.assignee_id,
      assignee_name: assignee?.full_name,
      vendor_id: w.vendor_id,
      due_at: w.due_at,
      started_at: w.started_at,
      completed_at: w.completed_at,
      closed_at: w.closed_at,
      resolution: w.resolution,
      labor_cost: Number(w.labor_cost) || 0,
      parts_cost: Number(w.parts_cost) || 0,
      vendor_cost: Number(w.vendor_cost) || 0,
      total_cost: Number(w.total_cost) || 0,
      photo_paths: w.photo_paths || [],
    };
  });
}

export async function getWorkOrderEvents(
  workOrderId: string,
): Promise<WorkOrderEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_order_events")
    .select(`
      id,
      work_order_id,
      at,
      actor_id,
      actor:profiles!work_order_events_actor_id_fkey(full_name),
      from_status,
      to_status,
      comment
    `)
    .eq("work_order_id", workOrderId)
    .order("at", { ascending: true });

  if (error || !data) return [];

  return data.map((e: any) => {
    const actor = Array.isArray(e.actor) ? e.actor[0] : e.actor;
    return {
      id: e.id,
      work_order_id: e.work_order_id,
      at: e.at,
      actor_name: actor?.full_name || "Hệ thống",
      from_status: e.from_status,
      to_status: e.to_status,
      comment: e.comment,
    };
  });
}

export async function getRoomBlocks(
  branchId?: string,
): Promise<RoomBlockItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("room_blocks")
    .select(`
      id,
      branch_id,
      branch:branches(name),
      room_id,
      room:rooms(number),
      reason,
      starts_at,
      ends_at,
      work_order_id,
      work_order:work_orders(number),
      created_by,
      creator:profiles!room_blocks_created_by_fkey(full_name)
    `)
    .is("released_at", null)
    .order("starts_at", { ascending: false });

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[getRoomBlocks error]", error);
    return [];
  }
  if (!data) return [];

  return data.map((b: any) => {
    const branch = Array.isArray(b.branch) ? b.branch[0] : b.branch;
    const room = Array.isArray(b.room) ? b.room[0] : b.room;
    const wo = Array.isArray(b.work_order) ? b.work_order[0] : b.work_order;
    const creator = Array.isArray(b.creator) ? b.creator[0] : b.creator;

    return {
      id: b.id,
      branch_id: b.branch_id,
      branch_name: branch?.name || "",
      room_id: b.room_id,
      room_number: room?.number || "",
      reason: b.reason,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      work_order_id: b.work_order_id,
      work_order_number: wo?.number,
      created_by_name: creator?.full_name,
    };
  });
}

export async function getAssets(options?: {
  branchId?: string;
  roomId?: string;
  limit?: number;
}): Promise<Asset[]> {
  const supabase = await createClient();
  const limit = options?.limit || 100;

  let query = supabase
    .from("assets")
    .select(`
      id,
      branch_id,
      branch:branches(name),
      code,
      name,
      category_id,
      category:asset_categories(name),
      room_id,
      room:rooms(number),
      location_id,
      location:facility_locations(name),
      brand,
      model,
      serial_no,
      purchase_date,
      purchase_cost,
      warranty_until,
      quantity,
      status,
      note
    `)
    .order("code")
    .limit(limit);

  if (options?.branchId) {
    query = query.eq("branch_id", options.branchId);
  }

  if (options?.roomId) {
    query = query.eq("room_id", options.roomId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((a: any) => {
    const branch = Array.isArray(a.branch) ? a.branch[0] : a.branch;
    const cat = Array.isArray(a.category) ? a.category[0] : a.category;
    const room = Array.isArray(a.room) ? a.room[0] : a.room;
    const loc = Array.isArray(a.location) ? a.location[0] : a.location;

    return {
      id: a.id,
      branch_id: a.branch_id,
      branch_name: branch?.name,
      code: a.code,
      name: a.name,
      category_id: a.category_id,
      category_name: cat?.name,
      room_id: a.room_id,
      room_number: room?.number,
      location_id: a.location_id,
      location_name: loc?.name,
      brand: a.brand,
      model: a.model,
      serial_no: a.serial_no,
      purchase_date: a.purchase_date,
      purchase_cost: a.purchase_cost,
      warranty_until: a.warranty_until,
      quantity: a.quantity,
      status: a.status,
      note: a.note,
    };
  });
}

export async function getFacilityLocations(
  branchId?: string,
): Promise<FacilityLocation[]> {
  const supabase = await createClient();
  let query = supabase
    .from("facility_locations")
    .select("id, branch_id, name, kind, is_active")
    .eq("is_active", true)
    .order("name");

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as FacilityLocation[];
}

export async function getRoomsForBranch(
  branchId: string,
): Promise<Array<{ id: string; number: string; type: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("id, number, room_type")
    .eq("branch_id", branchId)
    .eq("is_active", true)
    .order("number");

  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    id: r.id,
    number: r.number,
    type: r.room_type || "Standard",
  }));
}

export async function getStaffForBranch(
  _branchId: string,
): Promise<Array<{ id: string; full_name: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("is_active", true)
    .order("full_name");

  if (error || !data) return [];
  return data as unknown as Array<{ id: string; full_name: string }>;
}
