import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RoomItem } from "../domain/types";
import { SEED_BRANCHES } from "./branches";

export async function getRooms(branchId?: string | null): Promise<RoomItem[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("rooms")
      .select(
        "id, branch_id, number, floor, room_type, is_active, branches(id, code, name)",
      )
      .order("floor", { ascending: false })
      .order("number");

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    // Fetch rooms, active stays and room blocks to determine room availability
    const [roomsRes, staysRes, blocksRes] = await Promise.all([
      query,
      supabase.from("stays").select("room_id").eq("status", "in_house"),
      supabase.from("room_blocks").select("room_id").is("released_at", null),
    ]);

    const { data, error } = roomsRes;
    const occupiedRoomIds = new Set(
      staysRes.data?.map((s: any) => s.room_id) || [],
    );
    const blockedRoomIds = new Set(
      blocksRes.data?.map((b: any) => b.room_id) || [],
    );

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((r: any) => ({
        id: r.id,
        branchId: r.branch_id,
        branchCode: r.branches?.code || "",
        branchName: r.branches?.name || "",
        number: r.number,
        floor: r.floor,
        roomType: r.room_type || "Standard",
        isActive: r.is_active,
        isOccupied: occupiedRoomIds.has(r.id),
        isBlocked: blockedRoomIds.has(r.id),
      }));
    }
  } catch {
    // Continue to fallback
  }

  // Generate fallback rooms from seed specifications (240 rooms total)
  const fallbackRooms: RoomItem[] = [];
  SEED_BRANCHES.forEach((b) => {
    if (branchId && b.id !== branchId) return;
    const total = b.roomsCount || 20;
    const floors = Math.max(3, Math.ceil(total / 5));
    let roomIdx = 1;
    for (let f = floors; f >= 1; f--) {
      for (let num = 1; num <= 5; num++) {
        if (roomIdx > total) break;
        const roomNum = `${f}${num.toString().padStart(2, "0")}`;
        fallbackRooms.push({
          id: `room-${b.code}-${roomNum}`,
          branchId: b.id,
          branchCode: b.code,
          branchName: b.name,
          number: roomNum,
          floor: f,
          roomType: f >= floors - 1 ? "Suite / Deluxe" : "Standard",
          isActive: true,
        });
        roomIdx++;
      }
    }
  });

  return fallbackRooms;
}
