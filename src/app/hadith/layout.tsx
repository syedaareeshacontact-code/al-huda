import type { Metadata } from 'next';
import { Suspense } from 'react';

import HadithSearch from '@/components/hadith/HadithSearch';
import HadithSidebarNav from '@/components/hadith/HadithSidebarNav';
import HadithMobileNav from '@/components/hadith/HadithMobileNav';
import HadithTopSearchShell from '@/components/hadith/HadithTopSearchShell';
import { getAllCollections } from '@/lib/hadith/collections.service';

export const metadata: Metadata = {
  title: {
    template: '%s | Read al Quran',
    default: 'Hadith Collections',
  },
};

export default async function HadithLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const collections = await getAllCollections();
  const totalHadiths = collections.reduce((sum, col) => sum + col.hadiths_count, 0);

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--color-bg)]">
      <HadithTopSearchShell>
        <div className="mx-auto max-w-7xl space-y-3 px-4 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Hadith Library
            </p>
            <p className="text-xs text-[var(--color-muted-text)]">
              {collections.length} collections · {totalHadiths.toLocaleString()} hadiths
            </p>
          </div>
          <Suspense>
            <HadithSearch />
          </Suspense>
          <HadithMobileNav collections={collections} />
        </div>
      </HadithTopSearchShell>

      <div className="mx-auto flex max-w-7xl items-start gap-0 px-4 py-6 lg:gap-8 lg:py-8">
        <aside
          className="sticky top-[calc(var(--site-header-visible-offset,0px)_+_var(--hadith-top-search-visible-offset,0px)_+_1rem)] hidden max-h-[calc(100dvh_-_var(--site-header-visible-offset,0px)_-_var(--hadith-top-search-visible-offset,0px)_-_2rem)] w-64 shrink-0 overflow-y-auto overscroll-contain lg:block"
          aria-label="Hadith collections sidebar"
        >
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-soft)]">
            <HadithSidebarNav collections={collections} />
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-16">
          {children}
        </div>
      </div>
    </div>
  );
}
