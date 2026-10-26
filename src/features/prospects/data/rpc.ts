import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface RpcError {
  code?: string;
  message: string;
  details?: string | null;
}

// supabase-js chưa có kiểu cho các RPC mới (types sinh bằng `pnpm db:types`)
export async function callRpc<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<{ data: T | null; error: RpcError | null }> {
  const supabase = await createClient();
  const res = await (
    supabase.rpc as unknown as (
      fn: string,
      params: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: RpcError | null }>
  )(name, args);
  return { data: res.data as T | null, error: res.error };
}
