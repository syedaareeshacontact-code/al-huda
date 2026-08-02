import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FolderOpen } from 'lucide-react';
import { notFound } from 'next/navigation';

import { ArticleBreadcrumbs } from '@/components/articles/ArticleBreadcrumbs';
import { ArticleCard } from '@/components/articles/ArticleCard';
import {
  getArticleCategories,
  getArticleCategoryBySlug,
  getArticlesByCategory,
} from '@/lib/articles';
import { buildBreadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';

type CategoryPageProps = {
  params: Promise<{ category: string }>;
};

export const dynamic = 'force-static';
export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return getArticleCategories().map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const category = getArticleCategoryBySlug(categorySlug);

  if (!category) {
    return {};
  }

  const articles = getArticlesByCategory(category.slug);
  const metadata = buildPageMetadata({
    title: `${category.name} Articles & Guides`,
    description: category.description,
    path: `/articles/category/${category.slug}`,
    imageUrl: articles[0]?.coverImage,
  });

  return {
    ...metadata,
    keywords: Array.from(
      new Set([
        category.name,
        `${category.name} articles`,
        ...articles.flatMap((article) => article.keywords),
      ])
    ).slice(0, 20),
  };
}

export default async function ArticleCategoryPage({ params }: CategoryPageProps) {
  const { category: categorySlug } = await params;
  const category = getArticleCategoryBySlug(categorySlug);

  if (!category) {
    notFound();
  }

  const articles = getArticlesByCategory(category.slug);
  const otherCategories = getArticleCategories().filter(
    (entry) => entry.slug !== category.slug
  );
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: 'Articles', item: '/articles' },
    { name: category.name, item: `/articles/category/${category.slug}` },
  ]);

  return (
    <div className="pb-20 pt-6 sm:pt-9" data-slot="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <ArticleBreadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Articles', href: '/articles' },
          { label: category.name },
        ]}
      />

      <header className="relative mt-5 overflow-hidden rounded-[1.75rem] border border-teal-800/15 bg-[linear-gradient(135deg,#042f2e,#0f766e)] px-5 py-9 text-white sm:px-9 sm:py-12">
        <div className="pointer-events-none absolute -right-20 -top-28 size-64 rounded-full border border-white/10" />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-teal-50">
            <FolderOpen className="size-4" aria-hidden="true" />
            {category.count} {category.count === 1 ? 'article' : 'articles'}
          </span>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
            {category.name}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-teal-50/85">
            {category.description}
          </p>
        </div>
      </header>

      <section className="mt-10" aria-labelledby="category-articles-heading">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
              Browse this collection
            </p>
            <h2
              id="category-articles-heading"
              className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)]"
            >
              Latest in {category.name}
            </h2>
          </div>
          <Link
            href="/articles#article-library"
            className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-600 dark:text-teal-300"
          >
            Search all articles
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, index) => (
            <ArticleCard key={article.slug} article={article} priority={index === 0} />
          ))}
        </div>
      </section>

      {otherCategories.length > 0 ? (
        <nav
          className="mt-14 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6"
          aria-label="Other article categories"
        >
          <h2 className="font-display text-2xl font-semibold text-[var(--color-heading)]">
            Explore another category
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {otherCategories.map((entry) => (
              <Link
                key={entry.slug}
                href={`/articles/category/${entry.slug}`}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-sm font-bold text-[var(--color-text)] transition hover:border-teal-600/50 hover:text-teal-700 dark:hover:text-teal-300"
              >
                {entry.name} · {entry.count}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
