import Link from 'next/link';
import { ArrowUpRight, BookOpenText } from 'lucide-react';

import HadithGrade from '@/components/hadith/HadithGrade';
import { buildHadithDetailPath } from '@/lib/hadith/hadith-routing';
import type { HadithItem } from '@/lib/hadith/types/hadith.types';

interface SuggestedHadithsProps {
  hadiths: HadithItem[];
  bookSlug: string;
}

export default function SuggestedHadiths({ hadiths, bookSlug }: SuggestedHadithsProps) {
  if (hadiths.length === 0) return null;

  return (
    <section
      aria-labelledby="suggested-hadiths-heading"
      className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]"
    >
      <div className="border-b border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-2),transparent_32%)] px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--color-accent),transparent_88%)] text-[var(--color-accent)]">
            <BookOpenText className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              id="suggested-hadiths-heading"
              className="font-display text-lg font-bold leading-tight text-[var(--color-heading)] sm:text-xl"
            >
              Suggested Hadiths
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted-text)]">
              More narrations from this collection
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {hadiths.map((hadith) => {
          const detailUrl = buildHadithDetailPath(bookSlug, hadith.hadithNumber);
          return (
            <article
              key={hadith.hadithNumber}
              className="group bg-[var(--color-surface)] transition-colors hover:bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_96%)]"
            >
              <Link
                href={detailUrl}
                className="grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent)] sm:px-5"
                aria-label={`Read hadith ${hadith.hadithNumber}: ${hadith.chapter.chapterEnglish}`}
              >
                <span className="inline-flex size-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] font-mono text-xs font-bold text-[var(--color-heading)]">
                  {hadith.hadithNumber}
                </span>

                <div className="min-w-0">
                  <div className="mb-1 flex min-w-0 items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-[var(--color-heading)]">
                      {hadith.chapter.chapterEnglish || `Hadith ${hadith.hadithNumber}`}
                    </h3>
                    <span className="hidden shrink-0 sm:inline-flex">
                      <HadithGrade grade={hadith.status} />
                    </span>
                  </div>
                  {hadith.chapter.chapterUrdu ? (
                    <p
                      dir="rtl"
                      lang="ur"
                      className="truncate text-right font-urdu-nastaliq text-sm leading-relaxed text-[var(--color-muted-text)]"
                    >
                      {hadith.chapter.chapterUrdu}
                    </p>
                  ) : (
                    <p className="truncate text-xs text-[var(--color-muted-text)]">
                      {hadith.englishNarrator || 'Related narration'}
                    </p>
                  )}
                </div>

                <ArrowUpRight
                  className="size-4 text-[var(--color-muted-text)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--color-accent)]"
                  aria-hidden="true"
                />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
