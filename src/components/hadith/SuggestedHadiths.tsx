import Link from 'next/link';
import { ArrowRight, BookOpenText } from 'lucide-react';

import ArabicText from '@/components/hadith/ArabicText';
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
      className="mt-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]"
    >
      <div className="border-b border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-2),transparent_28%)] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent),transparent_88%)] text-[var(--color-accent)]">
            <BookOpenText className="size-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              id="suggested-hadiths-heading"
              className="font-display text-xl font-bold leading-tight text-[var(--color-heading)] sm:text-2xl"
            >
              Suggested Hadiths
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted-text)]">
              Related narrations from the same collection.
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
              className="group bg-[var(--color-surface)] px-4 py-4 transition-colors hover:bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_97%)] sm:px-5"
            >
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div className="min-w-0 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-lg bg-[var(--color-surface-2)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--color-heading)]">
                      #{hadith.hadithNumber}
                    </span>
                    <HadithGrade grade={hadith.status} />
                  </div>

                  {hadith.englishNarrator ? (
                    <p className="line-clamp-1 text-sm font-medium text-[var(--color-accent-soft)]">
                      {hadith.englishNarrator}
                    </p>
                  ) : null}

                  {hadith.hadithArabic ? (
                    <div className="rounded-xl border border-[color-mix(in_oklab,var(--color-border),var(--color-accent)_16%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_97%)] px-3 py-2">
                      <ArabicText
                        text={hadith.hadithArabic}
                        size="sm"
                        className="line-clamp-2 text-[var(--color-heading)] [line-height:1.95]"
                      />
                    </div>
                  ) : null}

                  <p className="line-clamp-2 text-sm leading-relaxed text-[var(--color-text)]">
                    {hadith.hadithEnglish}
                  </p>
                </div>

                <div className="flex md:justify-end">
                  <Link
                    href={detailUrl}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-accent-soft)] hover:border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] hover:text-[var(--color-accent)] md:mt-0"
                    aria-label={`Read hadith ${hadith.hadithNumber}`}
                  >
                    Read
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
