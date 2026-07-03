import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import ArabicText from '@/components/hadith/ArabicText';
import HadithGrade from '@/components/hadith/HadithGrade';
import { Card, CardContent } from '@/components/ui/card';
import { buildHadithDetailPath } from '@/lib/hadith/hadith-routing';
import type { HadithItem } from '@/lib/hadith/types/hadith.types';

interface SuggestedHadithsProps {
  hadiths: HadithItem[];
  bookSlug: string;
}

export default function SuggestedHadiths({ hadiths, bookSlug }: SuggestedHadithsProps) {
  if (hadiths.length === 0) return null;

  return (
    <section aria-labelledby="suggested-hadiths-heading" className="mt-10 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-[var(--color-accent)]" aria-hidden="true" />
        <h2
          id="suggested-hadiths-heading"
          className="font-display text-2xl font-bold text-[var(--color-heading)]"
        >
          More Hadiths You May Find Interesting
        </h2>
      </div>
      <p className="text-sm text-[var(--color-muted-text)]">
        Explore related narrations from the same collection — authentic hadiths with Arabic, English, and Urdu text.
      </p>

      <div className="grid gap-4">
        {hadiths.map((hadith) => {
          const detailUrl = buildHadithDetailPath(bookSlug, hadith.hadithNumber);
          return (
            <Card
              key={hadith.hadithNumber}
              className="overflow-hidden border-[var(--color-border)] transition-shadow hover:shadow-[var(--shadow-card)]"
            >
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={detailUrl}
                    className="inline-flex items-center rounded-lg bg-[var(--color-surface-2)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--color-heading)] hover:text-[var(--color-accent)]"
                  >
                    Hadith #{hadith.hadithNumber}
                  </Link>
                  <HadithGrade grade={hadith.status} />
                </div>

                {hadith.englishNarrator ? (
                  <p className="text-sm font-medium text-[var(--color-accent-soft)]">
                    {hadith.englishNarrator}
                  </p>
                ) : null}

                {hadith.hadithArabic ? (
                  <ArabicText text={hadith.hadithArabic} size="sm" className="text-[var(--color-heading)]" />
                ) : null}

                <p className="line-clamp-3 text-sm leading-relaxed text-[var(--color-text)]">
                  {hadith.hadithEnglish}
                </p>

                <Link
                  href={detailUrl}
                  className="inline-flex text-sm font-semibold text-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                >
                  Read full hadith →
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
