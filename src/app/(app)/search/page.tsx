import { Metadata } from 'next';
import { requirePermission } from '@/shared/auth/server';
import { redirect } from 'next/navigation';
import { SearchView } from '@/features/search';

export const metadata: Metadata = {
  title: 'Tra cứu khách hàng | CRM Khách Sạn',
};

export default async function SearchPage() {
  const hasPerm = await requirePermission('guest.search');
  if (!hasPerm.ok) {
    redirect('/');
  }

  return <SearchView />;
}
