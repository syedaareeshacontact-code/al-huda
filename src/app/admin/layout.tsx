import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

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
  children: _children,
}: {
  children: React.ReactNode;
}) {
  redirect(process.env.ANALYTICS_DASHBOARD_URL || '/');
}
