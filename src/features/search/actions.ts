"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/shared/auth/server";
import { type ActionResult, fail, ok } from "@/shared/errors";
import type { SearchGuestMode, SearchGuestResult } from "./types";

function inferSearchMode(raw: string): SearchGuestMode {
  const q = raw.trim();
  if (q.includes("@")) return "email";

  const digits = q.replace(/\D/g, "");
  if (/^\d{12}$/.test(digits) || /^\d{9}$/.test(digits)) {
    return "cccd";
  }
  if (/^(0\d{9,10}|84\d{9,10})$/.test(digits)) {
    return "phone";
  }
  if (/^\d{4,8}$/.test(digits)) {
    return "phone_suffix";
  }
  return "name";
}

export async function searchGuestsAction(
  query: string,
  explicitMode?: SearchGuestMode,
): Promise<ActionResult<SearchGuestResult[]>> {
  try {
    const q = query.trim();
    if (!q || q.length < 2) {
      return ok([]);
    }

    const hasPerm = await requirePermission("guest.search");
    if (!hasPerm.ok) {
      return hasPerm;
    }

    const mode = explicitMode || inferSearchMode(q);
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("search_guests", {
      p_mode: mode,
      p_query: q,
      p_limit: 20,
    });

    if (error) {
      return fail(error.code);
    }

    return ok(data as SearchGuestResult[]);
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}
