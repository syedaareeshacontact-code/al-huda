import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getCurrentAdminUser } from '@/lib/auth/current-user';

export const metadata: Metadata = {
  title: {
    default: 'Admin',
    template: '%s | Admin | Read al Quran',
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  alternates: {
    canonical: '/admin',
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminUser = await getCurrentAdminUser();
  if (!adminUser) {
    notFound();
  }

  return <>{children}</>;
}
