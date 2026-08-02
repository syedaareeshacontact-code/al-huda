import Link from 'next/link';
import { ArrowUpRight, BookOpenText } from 'lucide-react';

import { getSurahById } from '@/lib/quran-index';
import { buildSurahPath } from '@/lib/quran-routing';

export interface RelatedSurahsProps {
  surahIds: number[];
}

export function RelatedSurahs({ surahIds }: RelatedSurahsProps) {
  const surahs = Array.from(new Set(surahIds)).flatMap((surahId) => {
    const surah = getSurahById(surahId);
    return surah ? [surah] : [];
  });

  if (surahs.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="related-surahs-heading" className="my-10 rounded-2xl border border-emerald-700/15 bg-emerald-500/5 p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl border border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <BookOpenText className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
            Read in the Quran
          </p>
          <h2 id="related-surahs-heading" className="font-display text-2xl font-semibold text-[var(--color-heading)]">
            Related Surahs
          </h2>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {surahs.map((surah) => (
          <Link
            key={surah.id}
            href={buildSurahPath(surah.id, surah.surahName)}
            prefetch={false}
            className="group flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:-translate-y-0.5 hover:border-emerald-600/30 hover:shadow-[var(--shadow-soft)]"
          >
            <span className="min-w-0">
              <span className="block font-semibold text-[var(--color-heading)]">Surah {surah.surahName}</span>
              <span className="mt-1 block text-xs text-[var(--color-muted-text)]">
                {surah.surahNameTranslation} · {surah.totalAyah} ayahs
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span lang="ar" dir="rtl" className="surah-arabic-name text-xl text-emerald-800 dark:text-emerald-300">
                {surah.surahNameArabicUthmani || surah.surahNameArabic}
              </span>
              <ArrowUpRight className="size-4 text-[var(--color-muted-text)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-700 dark:group-hover:text-emerald-300" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default RelatedSurahs;
