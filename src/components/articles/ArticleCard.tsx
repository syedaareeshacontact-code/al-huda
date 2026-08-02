import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Clock3 } from 'lucide-react';

import type { ArticleSummary } from '@/lib/articles';

const DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMATTER.format(date);
}

export interface ArticleCardProps {
  article: ArticleSummary;
  featured?: boolean;
  priority?: boolean;
}

export function ArticleCard({
  article,
  featured = false,
  priority = false,
}: ArticleCardProps) {
  const imageSizes = featured
    ? '(max-width: 1023px) calc(100vw - 2rem), (max-width: 1279px) 50vw, 600px'
    : '(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) 50vw, 400px';

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-[var(--shadow-card)] ${
        featured ? 'ring-1 ring-white/5' : ''
      }`}
    >
      <Link
        href={article.href}
        prefetch={false}
        aria-label={`Read ${article.title}`}
        className="relative block aspect-[1200/630] overflow-hidden bg-[var(--color-surface-2)]"
      >
        <Image
          src={article.coverImage}
          alt={article.coverAlt}
          fill
          priority={priority}
          sizes={imageSizes}
          className="object-cover transition duration-500 motion-safe:group-hover:scale-[1.035]"
        />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
      </Link>

      <div className={`flex min-w-0 flex-1 flex-col ${featured ? 'p-5 sm:p-6' : 'p-5'}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <Link
            href={`/articles/category/${article.categorySlug}`}
            prefetch={false}
            className="rounded-full border border-teal-600/20 bg-teal-500/10 px-2.5 py-1 font-semibold text-teal-700 transition hover:border-teal-600/40 hover:bg-teal-500/15 dark:text-teal-300"
          >
            {article.category}
          </Link>
          <time dateTime={article.publishedAt} className="text-[var(--color-muted-text)]">
            {formatDate(article.publishedAt)}
          </time>
        </div>

        <h3
          className={`mt-4 font-display font-semibold leading-tight text-[var(--color-heading)] ${
            featured ? 'text-2xl sm:text-[1.7rem]' : 'text-xl'
          }`}
        >
          <Link href={article.href} prefetch={false} className="hover:text-emerald-700 dark:hover:text-emerald-300">
            {article.title}
          </Link>
        </h3>

        <p
          className={`mt-3 text-sm leading-relaxed text-[var(--color-muted-text)] ${
            featured ? 'line-clamp-3 sm:text-base' : 'line-clamp-3'
          }`}
        >
          {article.description}
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5 text-xs text-[var(--color-muted-text)]">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-3.5 text-teal-600 dark:text-teal-300" aria-hidden="true" />
            {article.readingTime.text}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
            Read article
            <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  );
}

export default ArticleCard;
