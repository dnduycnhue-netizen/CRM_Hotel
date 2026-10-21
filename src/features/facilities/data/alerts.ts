import { createClient } from '@/lib/supabase/server';

export interface ComplianceAlertItem {
  id: string;
  branch_id: string;
  branch_name: string;
  doc_type_name: string;
  doc_number?: string | null;
  issuer?: string | null;
  asset_name?: string | null;
  issued_on?: string | null;
  expires_on: string;
  days_remaining: number;
  status: 'expired' | 'urgent' | 'warning' | 'good';
  file_paths: string[];
  note?: string | null;
}

export async function getComplianceAlerts(branchId?: string): Promise<ComplianceAlertItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from('compliance_docs')
    .select(`
      id,
      branch_id,
      number,
      issuer,
      issued_on,
      expires_on,
      file_paths,
      note,
      is_current,
      branch:branches(name),
      doc_type:compliance_doc_types(name, remind_days),
      asset:assets(name)
    `)
    .eq('is_current', true)
    .not('expires_on', 'is', null)
    .order('expires_on', { ascending: true });

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return data.map((row: any) => {
    const expDate = new Date(row.expires_on);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status: ComplianceAlertItem['status'] = 'good';
    if (diffDays < 0) {
      status = 'expired';
    } else if (diffDays <= 15) {
      status = 'urgent';
    } else if (diffDays <= (row.doc_type?.remind_days || 30)) {
      status = 'warning';
    }

    return {
      id: row.id,
      branch_id: row.branch_id,
      branch_name: row.branch?.name || '',
      doc_type_name: row.doc_type?.name || 'Hồ sơ pháp lý',
      doc_number: row.number,
      issuer: row.issuer,
      asset_name: row.asset?.name || null,
      issued_on: row.issued_on,
      expires_on: row.expires_on,
      days_remaining: diffDays,
      status,
      file_paths: row.file_paths || [],
      note: row.note,
    };
  });
}
