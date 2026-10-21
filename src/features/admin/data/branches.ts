import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type BranchSummary = {
  id: string;
  code: string;
  name: string;
};

export async function getActiveBranches(): Promise<BranchSummary[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('branches')
      .select('id, code, name')
      .eq('is_active', true)
      .order('name');
    if (!error && Array.isArray(data) && data.length > 0) {
      return (data as unknown) as BranchSummary[];
    }
  } catch {
    // Fallback when Supabase local is not yet connected
  }

  // 8 cơ sở từ file gốc của CĐT
  return [
    { id: 'b1', code: 'BOUTIQUE', name: 'Boutique' },
    { id: 'b2', code: 'GRAND', name: 'Grand' },
    { id: 'b3', code: 'XAVIA', name: 'Xavia' },
    { id: 'b4', code: 'ECO', name: 'Eco' },
    { id: 'b5', code: 'NGOMAY', name: 'Ngô Mây' },
    { id: 'b6', code: 'ALOHA', name: 'Aloha' },
    { id: 'b7', code: 'SUN', name: 'Sun' },
    { id: 'b8', code: 'BAIXEP', name: 'Bãi Xếp' },
  ];
}
