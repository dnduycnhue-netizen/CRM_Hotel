// src/lib/supabase/admin.ts — CHỈ dùng cho mời/khóa tài khoản
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/db/types';

export const supabaseAdmin = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
