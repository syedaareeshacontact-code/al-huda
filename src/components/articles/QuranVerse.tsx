import Link from 'next/link';
import { BookOpenText, ExternalLink } from 'lucide-react';

import { getSurahById } from '@/lib/quran-index';
import { buildAyahPath } from '@/lib/quran-routing';

export interface QuranVerseProps {
  reference: string;
  surahId: number;
  ayahNumber: number;
  arabic: string;
  urdu: string;
  english: string;
  urduSource?: string;
  englishSource?: string;
  sourceUrl?: string;
}

function SourceLink({ href }: { href: string }) {
  const className =
    'inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline dark:text-teal-300';

  if (href.startsWith('/') || href.startsWith('#')) {
    return (
      <Link href={href} prefetch={false} className={className}>
        View source
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      View source
      <ExternalLink className="size-3" aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function QuranVerse({
  reference,
  surahId,
  ayahNumber,
  arabic,
  urdu,
  english,
  urduSource,
  englishSource,
  sourceUrl,
}: QuranVerseProps) {
  const surah = getSurahById(surahId);
  const ayahHref = surah ? buildAyahPath(surah.id, surah.surahName, ayahNumber) : `/surah/${surahId}`;

  return (
    <figure className="my-8 overflow-hidden rounded-2xl border border-emerald-700/20 bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-emerald-500/8 px-4 py-3 sm:px-6">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          <BookOpenText className="size-4" aria-hidden="true" />
          Quran verse
        </span>
        <Link href={ayahHref} prefetch={false} className="text-sm font-semibold text-teal-700 hover:underline dark:text-teal-300">
          {reference}
        </Link>
      </div>

      <blockquote cite={sourceUrl} className="space-y-6 p-5 sm:p-7">
        <p lang="ar" dir="rtl" className="arabic-font text-right text-[var(--color-heading)]">
          {arabic}
        </p>

        <div className="border-t border-[var(--color-border)] pt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted-text)]">
            Urdu translation{urduSource ? ` · ${urduSource}` : ''}
          </p>
          <p lang="ur" dir="rtl" className="urdu-font text-right text-[var(--color-text)]">
            {urdu}
          </p>
        </div>

        <div className="border-t border-[var(--color-border)] pt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted-text)]">
            English translation{englishSource ? ` · ${englishSource}` : ''}
          </p>
          <p lang="en" className="text-base leading-relaxed text-[var(--color-text)] sm:text-lg">
            {english}
          </p>
        </div>
      </blockquote>

      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-xs text-[var(--color-muted-text)] sm:px-6">
        <span>Reference: Quran {reference}</span>
        {sourceUrl ? <SourceLink href={sourceUrl} /> : null}
      </figcaption>
    </figure>
  );
}

export default QuranVerse;
