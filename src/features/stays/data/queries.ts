import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { InHouseStay } from '../domain/types';

export async function getInHouseStays(branchId?: string): Promise<InHouseStay[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('stays')
      .select(`
        id,
        branch_id,
        branches (name),
        room_id,
        check_in_at,
        expected_check_out_at,
        source_channel_id,
        source_channels (name),
        rooms (number, room_type),
        stay_guests (
          is_primary,
          guests (id, full_name, phone)
        )
      `)
      .eq('status', 'in_house')
      .order('expected_check_out_at', { ascending: true });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (!error && Array.isArray(data)) {
      const now = new Date().toISOString();
      return data.map((s: any) => {
        const primary = s.stay_guests?.find((sg: any) => sg.is_primary)?.guests;
        const branch = Array.isArray(s.branches) ? s.branches[0] : s.branches;
        const room = Array.isArray(s.rooms) ? s.rooms[0] : s.rooms;
        const channel = Array.isArray(s.source_channels) ? s.source_channels[0] : s.source_channels;
        return {
          id: s.id,
          branchId: s.branch_id,
          branchName: branch?.name || '',
          roomId: s.room_id,
          roomNumber: room?.number || '',
          roomType: room?.room_type || 'Standard',
          primaryGuestId: primary?.id || '',
          primaryGuestName: primary?.full_name || 'Khách lưu trú',
          primaryGuestPhone: primary?.phone || null,
          guestCount: s.stay_guests?.length || 1,
          checkInAt: s.check_in_at,
          expectedCheckOutAt: s.expected_check_out_at,
          isOverdue: s.expected_check_out_at < now,
          sourceChannelName: channel?.name || 'Khách vãng lai (Quầy)',
        };
      });
    }
  } catch {
    // Error handling
  }

  return [];
}
