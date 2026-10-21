import { Metadata } from 'next';
import { requirePermission } from '@/shared/auth/server';
import { redirect } from 'next/navigation';
import { GuestForm } from '@/features/guests';

export const metadata: Metadata = {
  title: 'Thêm hồ sơ khách tiềm năng | CRM Khách Sạn',
};

export default async function NewGuestPage() {
  const hasPerm = await requirePermission('guest.create');
  if (!hasPerm) {
    redirect('/guests');
  }

  return <GuestForm />;
}
