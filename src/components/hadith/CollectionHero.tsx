import { BookOpen, ScrollText, User } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { HadithBook } from '@/lib/hadith/types/hadith.types';

interface CollectionHeroProps {
  book: HadithBook;
  chapterCount: number;
}

export default function CollectionHero({ book, chapterCount }: CollectionHeroProps) {
  return (
    <section className="lux-light-card overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-accent),var(--color-surface)_92%),var(--color-surface-elevated))]">
      <div className="p-6 md:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-soft)] text-white">
            Hadith Collection
          </Badge>
          {book.volumes ? (
            <Badge variant="secondary">{book.volumes} volumes</Badge>
          ) : null}
        </div>

        <h1 className="font-display text-3xl font-bold text-[var(--color-heading)] md:text-4xl">
          {book.bookName}
        </h1>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--color-muted-text)]">
          <span className="inline-flex items-center gap-1.5">
            <User className="size-4 text-[var(--color-accent)]" aria-hidden="true" />
            {book.writerName}
            {book.writerDeath ? ` (d. ${book.writerDeath})` : ''}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ScrollText className="size-4 text-[var(--color-accent)]" aria-hidden="true" />
            {book.hadiths_count.toLocaleString()} hadiths
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="size-4 text-[var(--color-accent)]" aria-hidden="true" />
            {chapterCount} chapters
          </span>
        </div>

        {book.aboutWriter ? (
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-[var(--color-text)] md:text-base">
            {book.aboutWriter}
          </p>
        ) : null}
      </div>

      <div className="grid border-t border-[var(--color-border)] sm:grid-cols-3">
        {[
          { label: 'Arabic Text', value: 'Original' },
          { label: 'Translations', value: 'English & Urdu' },
          { label: 'Grading', value: 'Sahih · Hasan · Da\'if' },
        ].map((item) => (
          <div
            key={item.label}
            className="border-b border-[var(--color-border)] p-4 text-center last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-text)]">
              {item.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-heading)]">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
