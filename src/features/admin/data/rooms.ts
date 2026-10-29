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

    // Fetch rooms, active stays, room blocks, and recent checkouts (last 6 hours for cleaning state)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    let staysQuery = supabase
      .from("stays")
      .select("room_id")
      .eq("status", "in_house");
    let blocksQuery = supabase
      .from("room_blocks")
      .select("room_id")
      .is("released_at", null);
    let checkoutsQuery = supabase
      .from("stays")
      .select("room_id")
      .eq("status", "checked_out")
      .gte("checked_out_at", sixHoursAgo)
      .is("cleaned_at", null);

    if (branchId) {
      staysQuery = staysQuery.eq("branch_id", branchId);
      blocksQuery = blocksQuery.eq("branch_id", branchId);
      checkoutsQuery = checkoutsQuery.eq("branch_id", branchId);
    }

    const [roomsRes, staysRes, blocksRes, checkoutsRes] = await Promise.all([
      query,
      staysQuery,
      blocksQuery,
      checkoutsQuery,
    ]);

    const { data, error } = roomsRes;
    const occupiedRoomIds = new Set(
      staysRes.data?.map((s: any) => s.room_id) || [],
    );
    const blockedRoomIds = new Set(
      blocksRes.data?.map((b: any) => b.room_id) || [],
    );
    const cleaningRoomIds = new Set(
      checkoutsRes.data
        ?.map((s: any) => s.room_id)
        ?.filter(
          (id: string) => !occupiedRoomIds.has(id) && !blockedRoomIds.has(id),
        ) || [],
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
        isCleaning: cleaningRoomIds.has(r.id),
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
