import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Branch } from '../domain/types';

export const SEED_BRANCHES: Branch[] = [
  {
    id: 'b1',
    code: 'BOUTIQUE',
    name: 'Boutique Hotel',
    address: 'Quy Nhơn, Bình Định',
    phone: '0256 3812 345',
    googleReviewUrl: 'https://g.page/r/boutique-hotel',
    nightCutoff: '06:00',
    defaultCheckoutTime: '12:00',
    idleLogoutMinutes: 15,
    isActive: true,
    roomsCount: 31,
  },
  {
    id: 'b2',
    code: 'GRAND',
    name: 'Grand Hotel',
    address: 'Quy Nhơn, Bình Định',
    phone: '0256 3812 346',
    googleReviewUrl: 'https://g.page/r/grand-hotel',
    nightCutoff: '06:00',
    defaultCheckoutTime: '12:00',
    idleLogoutMinutes: 15,
    isActive: true,
    roomsCount: 43,
  },
  {
    id: 'b3',
    code: 'XAVIA',
    name: 'Xavia Hotel',
    address: 'Quy Nhơn, Bình Định',
    phone: '0256 3812 347',
    googleReviewUrl: 'https://g.page/r/xavia-hotel',
    nightCutoff: '06:00',
    defaultCheckoutTime: '12:00',
    idleLogoutMinutes: 15,
    isActive: true,
    roomsCount: 40,
  },
  {
    id: 'b4',
    code: 'ECO',
    name: 'Eco Hotel',
    address: 'Quy Nhơn, Bình Định',
    phone: '0256 3812 348',
    googleReviewUrl: 'https://g.page/r/eco-hotel',
    nightCutoff: '06:00',
    defaultCheckoutTime: '12:00',
    idleLogoutMinutes: 15,
    isActive: true,
    roomsCount: 18,
  },
  {
    id: 'b5',
    code: 'NGOMAY',
    name: 'Ngô Mây Hotel',
    address: 'Quy Nhơn, Bình Định',
    phone: '0256 3812 349',
    googleReviewUrl: 'https://g.page/r/ngomay-hotel',
    nightCutoff: '06:00',
    defaultCheckoutTime: '12:00',
    idleLogoutMinutes: 15,
    isActive: true,
    roomsCount: 22,
  },
  {
    id: 'b6',
    code: 'ALOHA',
    name: 'Aloha Hotel',
    address: 'Quy Nhơn, Bình Định',
    phone: '0256 3812 350',
    googleReviewUrl: 'https://g.page/r/aloha-hotel',
    nightCutoff: '06:00',
    defaultCheckoutTime: '12:00',
    idleLogoutMinutes: 15,
    isActive: true,
    roomsCount: 28,
  },
  {
    id: 'b7',
    code: 'SUN',
    name: 'Sun Hotel',
    address: 'Quy Nhơn, Bình Định',
    phone: '0256 3812 351',
    googleReviewUrl: 'https://g.page/r/sun-hotel',
    nightCutoff: '06:00',
    defaultCheckoutTime: '12:00',
    idleLogoutMinutes: 15,
    isActive: true,
    roomsCount: 38,
  },
  {
    id: 'b8',
    code: 'BAIXEP',
    name: 'Bãi Xếp Resort & Hotel',
    address: 'Bãi Xếp, Quy Nhơn, Bình Định',
    phone: '0256 3812 352',
    googleReviewUrl: 'https://g.page/r/baixep-hotel',
    nightCutoff: '06:00',
    defaultCheckoutTime: '12:00',
    idleLogoutMinutes: 15,
    isActive: true,
    roomsCount: 20,
  },
];

export async function getActiveBranches(): Promise<Branch[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('branches')
      .select('id, code, name, address, phone, google_review_url, night_cutoff, default_checkout_time, idle_logout_minutes, is_active')
      .order('code');

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((b: any) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        address: b.address,
        phone: b.phone,
        googleReviewUrl: b.google_review_url,
        nightCutoff: b.night_cutoff || '06:00',
        defaultCheckoutTime: b.default_checkout_time || '12:00',
        idleLogoutMinutes: b.idle_logout_minutes || 15,
        isActive: b.is_active,
        roomsCount: SEED_BRANCHES.find((sb) => sb.code === b.code)?.roomsCount || 0,
      }));
    }
  } catch {
    // Fallback when local Supabase container is initializing
  }

  return SEED_BRANCHES;
}
