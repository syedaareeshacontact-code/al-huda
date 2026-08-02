import type { ArticleSummary } from '@/lib/articles';

import ArticleCard from './ArticleCard';

export interface RelatedArticlesProps {
  articles: ArticleSummary[];
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="related-articles-heading" className="my-12">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
          Continue learning
        </p>
        <h2 id="related-articles-heading" className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)]">
          Related articles
        </h2>
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
