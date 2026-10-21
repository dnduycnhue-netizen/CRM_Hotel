'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fail, ok, type ActionResult } from '@/shared/errors';

export async function loginAction(
  formData: FormData
): Promise<ActionResult<{ success: boolean }>> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return fail('VALIDATION');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return fail('UNAUTHENTICATED');
  }

  redirect('/check-in');
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
