import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import type { ArticleSummary } from '@/lib/articles';

import ArticleCard from './ArticleCard';

export interface RelatedArticlesProps {
  articles: ArticleSummary[];
  eyebrow?: string;
  title?: string;
  description?: string;
  headingId?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}

export function RelatedArticles({
  articles,
  eyebrow = 'Continue learning',
  title = 'Related articles',
  description,
  headingId = 'related-articles-heading',
  viewAllHref,
  viewAllLabel = 'Browse all articles',
}: RelatedArticlesProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby={headingId} className="my-12">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
            {eyebrow}
          </p>
          <h2 id={headingId} className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-text)] sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            prefetch={false}
            className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
          >
            {viewAllLabel}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}

export default RelatedArticles;
