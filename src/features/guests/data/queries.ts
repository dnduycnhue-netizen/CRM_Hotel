import { createClient } from '@/lib/supabase/server';
import { GuestProfile, GuestListItem, SalesUser } from '../types';

export async function getGuestProfile(id: string): Promise<GuestProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_guest_profile', {
    p_guest_id: id,
  });

  if (error || !data) {
    return null;
  }

  // Handle merged guest redirection if any
  if (data.redirect_to) {
    return getGuestProfile(data.redirect_to);
  }

  return data as GuestProfile;
}

export async function getGuestsList(options?: {
  tier?: string;
  salesOwnerId?: string;
  tag?: string;
  limit?: number;
}): Promise<GuestListItem[]> {
  const supabase = await createClient();
  const limit = options?.limit || 50;

  // Query guests with stats and sales profile
  let query = supabase
    .from('guests')
    .select(`
      id,
      full_name,
      gender,
      dob,
      phone,
      email,
      tags,
      sales_owner_id,
      sales_owner:profiles!guests_sales_owner_id_fkey(full_name),
      stats:guest_stats(total_stays, total_nights, last_stay_at, last_branch:branches!guest_stats_last_branch_id_fkey(name)),
      documents:guest_documents(doc_number, doc_type)
    `)
    .is('merged_into', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options?.salesOwnerId) {
    query = query.eq('sales_owner_id', options.salesOwnerId);
  }

  if (options?.tag) {
    query = query.contains('tags', [options.tag]);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data.map((g: any) => {
    const stat = Array.isArray(g.stats) ? g.stats[0] : g.stats;
    const doc = Array.isArray(g.documents) ? g.documents[0] : g.documents;
    const sales = Array.isArray(g.sales_owner) ? g.sales_owner[0] : g.sales_owner;

    return {
      id: g.id,
      full_name: g.full_name,
      gender: g.gender,
      birth_year: g.dob ? new Date(g.dob).getFullYear() : null,
      phone: g.phone,
      doc_masked: doc?.doc_number
        ? doc.doc_number.length > 6
          ? `${doc.doc_number.slice(0, 3)}******${doc.doc_number.slice(-3)}`
          : '***'
        : null,
      email: g.email,
      total_stays: stat?.total_stays || 0,
      total_nights: stat?.total_nights || 0,
      last_stay_at: stat?.last_stay_at || null,
      last_branch_name: stat?.last_branch?.name || null,
      tier: null,
      tags: g.tags,
      sales_owner_name: sales?.full_name || null,
      has_blacklist: false,
      has_attention: false,
    };
  });
}

export async function getSalesUsers(): Promise<SalesUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('is_active', true)
    .order('full_name');

  if (error || !data) return [];
  return data as unknown as SalesUser[];
}
