'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import type { HadithChapter } from '@/lib/hadith/types/hadith.types';
import { buildHadithBookPath } from '@/lib/hadith/hadith-routing';

interface ChapterListProps {
  collectionSlug: string;
  chapters: HadithChapter[];
}

export default function ChapterList({ collectionSlug, chapters }: ChapterListProps) {
  const [query, setQuery] = useState('');

  const filteredChapters = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return chapters;

    return chapters.filter(
      (chapter) =>
        chapter.chapterEnglish.toLowerCase().includes(normalized) ||
        chapter.chapterUrdu?.toLowerCase().includes(normalized) ||
        chapter.chapterArabic?.includes(query.trim()) ||
        chapter.chapterNumber.includes(normalized)
    );
  }, [chapters, query]);

  return (
    <section aria-labelledby="chapters-heading">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="chapters-heading" className="font-display text-2xl font-bold text-[var(--color-heading)]">
            Chapters
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted-text)]">
            {chapters.length} chapters · Browse by topic
          </p>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <label htmlFor="chapter-search" className="sr-only">
            Search chapters
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-text)]"
            aria-hidden="true"
          />
          <input
            id="chapter-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chapters…"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--color-text)] outline-none transition-all focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
          />
        </div>
      </div>

      {filteredChapters.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-[var(--color-muted-text)]">
            No chapters match &ldquo;{query}&rdquo;
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-2">
          {filteredChapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={buildHadithBookPath(collectionSlug, {
                chapter: chapter.chapterNumber,
                page: 1,
              })}
              className="  group flex  min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 transition-all hover:border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_50%)] hover:bg-[var(--color-surface-elevated)] hover:shadow-[var(--shadow-soft)] sm:items-center sm:gap-4  sm:px-4 sm:py-4"
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_90%)] font-mono text-sm font-semibold text-[var(--color-accent-soft)] sm:mt-0">
                {chapter.chapterNumber}
              </span>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate font-medium text-[var(--color-heading)] transition-colors group-hover:text-[var(--color-accent-soft)]">
                  {chapter.chapterEnglish}
                </p>
                {chapter.chapterUrdu ? (
                  <p
                    dir="rtl"
                    lang="ur"
                    className="mt-0.5 truncate font-urdu-nastaliq p-[5px] text-sm text-[var(--color-muted-text)]"
                  >
                    {chapter.chapterUrdu}
                  </p>
                ) : null}
                {chapter.chapterArabic ? (
                  <p
                    dir="rtl"
                    lang="ar"
                    className="mt-0.5 truncate font-arabic-amiri text-sm p-[5px] text-[var(--color-muted-text)]"
                  >
                    {chapter.chapterArabic}
                  </p>
                ) : null}
              </div>
              <ChevronRight
                className="mt-0.5 size-4 shrink-0 text-[var(--color-border)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--color-accent)] sm:mt-0"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
