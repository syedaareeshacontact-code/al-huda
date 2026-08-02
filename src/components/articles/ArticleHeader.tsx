import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, CheckCircle2, Clock3, ShieldCheck, UserRound } from 'lucide-react';

import type { Article } from '@/lib/articles';
import { PRIMARY_AUTHOR } from '@/lib/author-profile';

const DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const PENDING_REVIEW_PATTERN = /pending|not yet reviewed|review required|unverified/i;

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMATTER.format(date);
}

export interface ArticleHeaderProps {
  article: Article;
}

export function ArticleHeader({ article }: ArticleHeaderProps) {
  const reviewPending = PENDING_REVIEW_PATTERN.test(article.reviewer);

  return (
    <header className="mb-10">
      <Link
        href={`/articles/category/${article.categorySlug}`}
        prefetch={false}
        className="mb-5 inline-flex rounded-full border border-teal-600/20 bg-teal-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-teal-700 transition hover:border-teal-600/40 hover:bg-teal-500/15 dark:text-teal-300"
      >
        {article.category}
      </Link>

      <div className="relative aspect-[1200/630] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] shadow-[var(--shadow-card)] sm:rounded-3xl">
        <Image
          src={article.coverImage}
          alt={article.coverAlt}
          fill
          priority
          sizes="(max-width: 1279px) calc(100vw - 2rem), 1200px"
          className="object-cover"
        />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      </div>

      <div className="mx-auto mt-7 max-w-4xl sm:mt-9">
        <h1 className="font-display text-4xl font-semibold leading-[1.06] tracking-tight text-[var(--color-heading)] sm:text-5xl lg:text-6xl">
          {article.title}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-[var(--color-muted-text)] sm:text-lg">
          {article.description}
        </p>

        <dl className="mt-7 grid gap-3 border-y border-[var(--color-border)] py-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-3">
            <UserRound className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-300" aria-hidden="true" />
            <div>
              <dt className="text-xs text-[var(--color-muted-text)]">Written by</dt>
              <dd className="mt-0.5 font-semibold text-[var(--color-heading)]">
                <Link
                  href={PRIMARY_AUTHOR.href}
                  className="underline-offset-4 hover:text-teal-700 hover:underline dark:hover:text-teal-300"
                >
                  {article.author}
                </Link>
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3">
            {reviewPending ? (
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
            )}
            <div>
              <dt className="text-xs text-[var(--color-muted-text)]">Islamic reviewer</dt>
              <dd
                className={`mt-0.5 font-semibold ${
                  reviewPending ? 'text-amber-700 dark:text-amber-300' : 'text-[var(--color-heading)]'
                }`}
              >
                {article.reviewer}
              </dd>
              <dd className="mt-1 text-xs text-[var(--color-muted-text)]">
                Last reviewed:{' '}
                {article.reviewedAt ? (
                  <time dateTime={article.reviewedAt}>{formatDate(article.reviewedAt)}</time>
                ) : (
                  'Not yet reviewed'
                )}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-300" aria-hidden="true" />
            <div>
              <dt className="text-xs text-[var(--color-muted-text)]">Last content update</dt>
              <dd className="mt-0.5 font-semibold text-[var(--color-heading)]">
                <time dateTime={article.updatedAt}>{formatDate(article.updatedAt)}</time>
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-300" aria-hidden="true" />
            <div>
              <dt className="text-xs text-[var(--color-muted-text)]">Reading time</dt>
              <dd className="mt-0.5 font-semibold text-[var(--color-heading)]">
                {article.readingTime.text}
              </dd>
            </div>
          </div>
        </dl>

        <p className="mt-3 text-xs text-[var(--color-muted-text)]">
          First published <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
        </p>
      </div>
    </header>
  );
}

export default ArticleHeader;
