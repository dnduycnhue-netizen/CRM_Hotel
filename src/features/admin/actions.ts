'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function selectBranchAction(branchId: string) {
  const cookieStore = await cookies();
  cookieStore.set('branch_id', branchId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  revalidatePath('/', 'layout');
}
