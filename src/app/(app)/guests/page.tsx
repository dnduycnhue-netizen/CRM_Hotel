import { Metadata } from 'next';
import { requirePermission } from '@/shared/auth/server';
import { redirect } from 'next/navigation';
import { getGuestsList, getSalesUsers, GuestListTable } from '@/features/guests';

export const metadata: Metadata = {
  title: 'Hồ sơ khách hàng & Sales | CRM Khách Sạn',
};

export default async function GuestsPage() {
  const hasPerm = await requirePermission('guest.search');
  if (!hasPerm) {
    redirect('/');
  }

  const [guests, salesUsers] = await Promise.all([
    getGuestsList({ limit: 100 }),
    getSalesUsers(),
  ]);

  return <GuestListTable initialGuests={guests} salesUsers={salesUsers} />;
}
