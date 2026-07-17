'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';

import type { HadithBook } from '@/lib/hadith/types/hadith.types';

interface HadithMobileNavProps {
  collections: HadithBook[];
}

export default function HadithMobileNav({ collections }: HadithMobileNavProps) {
  const pathname = usePathname();

  const activeCollection = useMemo(() => {
    const match = pathname.match(/^\/hadith\/([^/]+)/);
    if (!match) return null;
    return collections.find((col) => col.bookSlug === match[1]) ?? null;
  }, [collections, pathname]);

  return (
    <div className="lg:hidden">
      <label htmlFor="hadith-mobile-collection" className="sr-only">
        Jump to hadith collection
      </label>
      <div className="relative">
        <BookOpen
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-text)]"
          aria-hidden="true"
        />
        <select
          id="hadith-mobile-collection"
          value={activeCollection?.bookSlug ?? ''}
          onChange={(event) => {
            const slug = event.target.value;
            if (slug) {
              window.location.href = `/hadith/${slug}`;
            }
          }}
          className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-10 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
        >
          <option value="">Browse collections…</option>
          {collections.map((col) => (
            <option key={col.bookSlug} value={col.bookSlug}>
              {col.bookName}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-text)]"
          aria-hidden="true"
        />
      </div>
      {activeCollection ? (
        <p className="mt-2 text-xs text-[var(--color-muted-text)]">
          Viewing{' '}
          <Link
            href={`/hadith/${activeCollection.bookSlug}`}
            className="font-medium text-[var(--color-accent-soft)] hover:underline"
          >
            {activeCollection.bookName}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
