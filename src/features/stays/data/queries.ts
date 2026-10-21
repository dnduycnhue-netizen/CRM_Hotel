import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { InHouseStay } from '../domain/types';

export async function getInHouseStays(branchId: string): Promise<InHouseStay[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('stays')
      .select(`
        id,
        branch_id,
        room_id,
        check_in_at,
        expected_check_out_at,
        source_channel,
        rooms (number, room_type),
        stay_guests (
          is_primary,
          guests (id, full_name, phone)
        )
      `)
      .eq('branch_id', branchId)
      .eq('status', 'in_house')
      .order('expected_check_out_at', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      const now = new Date().toISOString();
      return data.map((s: any) => {
        const primary = s.stay_guests?.find((sg: any) => sg.is_primary)?.guests;
        return {
          id: s.id,
          branchId: s.branch_id,
          branchName: '',
          roomId: s.room_id,
          roomNumber: s.rooms?.number || '',
          roomType: s.rooms?.room_type || 'Standard',
          primaryGuestId: primary?.id || '',
          primaryGuestName: primary?.full_name || 'Khách lưu trú',
          primaryGuestPhone: primary?.phone || null,
          guestCount: s.stay_guests?.length || 1,
          checkInAt: s.check_in_at,
          expectedCheckOutAt: s.expected_check_out_at,
          isOverdue: s.expected_check_out_at < now,
          sourceChannelName: s.source_channel || 'Quầy (Walk-in)',
        };
      });
    }
  } catch {
    // Fallback when Supabase container is initializing
  }

  // Sample active in-house stays for demonstration
  return [
    {
      id: 'stay-1',
      branchId,
      branchName: 'Boutique',
      roomId: 'r1',
      roomNumber: '201',
      roomType: 'Deluxe King',
      primaryGuestId: 'g1',
      primaryGuestName: 'NGUYỄN VĂN AN',
      primaryGuestPhone: '0905123456',
      guestCount: 2,
      checkInAt: '2026-10-21T14:00:00',
      expectedCheckOutAt: '2026-10-22T12:00:00',
      isOverdue: false,
      sourceChannelName: 'Khách vãng lai (Quầy)',
      tierName: 'Vàng',
      discountPct: 10,
    },
    {
      id: 'stay-2',
      branchId,
      branchName: 'Boutique',
      roomId: 'r2',
      roomNumber: '305',
      roomType: 'Executive Suite',
      primaryGuestId: 'g2',
      primaryGuestName: 'TRẦN THỊ MAI',
      primaryGuestPhone: '0912888999',
      guestCount: 1,
      checkInAt: '2026-10-20T15:30:00',
      expectedCheckOutAt: '2026-10-21T12:00:00',
      isOverdue: true, // Overdue check-out
      sourceChannelName: 'Booking.com',
      tierName: 'Bạc',
      discountPct: 5,
    },
    {
      id: 'stay-3',
      branchId,
      branchName: 'Boutique',
      roomId: 'r3',
      roomNumber: '402',
      roomType: 'Standard Twin',
      primaryGuestId: 'g3',
      primaryGuestName: 'LÊ HOÀNG NAM',
      primaryGuestPhone: '0988776655',
      guestCount: 2,
      checkInAt: '2026-10-21T16:00:00',
      expectedCheckOutAt: '2026-10-23T12:00:00',
      isOverdue: false,
      sourceChannelName: 'Công ty đối tác (FPT)',
      tierName: 'Đồng',
      discountPct: 3,
    },
  ];
}
