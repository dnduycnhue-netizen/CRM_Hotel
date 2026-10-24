import { createClient } from "@/lib/supabase/server";
import type {
  ComplianceDocItem,
  ComplianceDocTypeItem,
  ComplianceHistoryItem,
  ComplianceMatrixData,
} from "../types";

export async function getComplianceMatrix(
  branchId?: string,
): Promise<ComplianceMatrixData> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.rpc("get_compliance_matrix", {
      p_branch_id: branchId || null,
    });

    if (error || !data) {
      return { branches: [], doc_types: [], cells: [] };
    }

    const res = data as any;
    return {
      branches: res.branches || [],
      doc_types: res.doc_types || [],
      cells: res.cells || [],
    };
  } catch {
    return { branches: [], doc_types: [], cells: [] };
  }
}

export async function getComplianceDocsList(
  branchId?: string,
  docTypeId?: string,
  status?: string,
): Promise<ComplianceDocItem[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.rpc("get_compliance_docs_list", {
      p_branch_id: branchId || null,
      p_doc_type_id: docTypeId || null,
      p_status: status || null,
    });

    if (error || !data) return [];
    return data as ComplianceDocItem[];
  } catch {
    return [];
  }
}

export async function getComplianceHistory(
  docId: string,
): Promise<ComplianceHistoryItem[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.rpc("get_compliance_history", {
      p_doc_id: docId,
    });

    if (error || !data) return [];
    return data as ComplianceHistoryItem[];
  } catch {
    return [];
  }
}

export async function getComplianceDocTypes(): Promise<
  ComplianceDocTypeItem[]
> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("compliance_doc_types")
      .select("id, code, name, applies_to, remind_days, sort")
      .order("sort", { ascending: true })
      .order("name", { ascending: true });

    if (error || !data) return [];
    return (data as any[]).map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      applies_to: row.applies_to as "branch" | "asset",
      remind_days: row.remind_days,
      sort: row.sort,
    }));
  } catch {
    return [];
  }
}
