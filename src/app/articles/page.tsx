import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Layers3,
  Search,
  Sparkles,
} from 'lucide-react';

import { ArticleBreadcrumbs } from '@/components/articles/ArticleBreadcrumbs';
import { ArticleCard } from '@/components/articles/ArticleCard';
import {
  getArticleCategories,
  getFeaturedArticles,
  getLatestArticles,
  queryArticles,
} from '@/lib/articles';
import { getSurahById } from '@/lib/quran-index';
import { buildSurahPath } from '@/lib/quran-routing';
import { buildBreadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';

const PAGE_SIZE = 8;
const POPULAR_SURAH_IDS = [36, 18, 55, 67] as const;

const ARTICLES_METADATA = {
  title: 'Quran Articles, Surah Guides & Authentic Duas',
  description:
    'Explore source-aware Quran articles, Surah guides, authentic duas, and practical reading advice with visible references and review status.',
  path: '/articles',
  imageUrl:
    '/images/articles/how-to-start-reading-the-quran/beginner-quran-reading-guide-cover.webp',
} as const;

const ARTICLES_KEYWORDS = [
  'Quran articles',
  'Surah guides',
  'Islamic duas',
  'learn Quran',
  'Quran reading guide',
  'Read al Quran articles',
];

export async function generateMetadata({ searchParams }: ArticlesPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const search = getStringParam(resolvedSearchParams.q).trim();
  const requestedPage = Number.parseInt(getStringParam(resolvedSearchParams.page), 10);
  const hasFilteredView = Boolean(search) || (Number.isFinite(requestedPage) && requestedPage > 1);

  return buildPageMetadata({
    ...ARTICLES_METADATA,
    keywords: ARTICLES_KEYWORDS,
    index: !hasFilteredView,
    follow: true,
  });
}

type ArticlesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function buildArticlesHref(search: string, page: number) {
  const params = new URLSearchParams();
  if (search) {
    params.set('q', search);
  }
  if (page > 1) {
    params.set('page', String(page));
  }
  const query = params.toString();
  return query ? `/articles?${query}#article-library` : '/articles#article-library';
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const resolvedSearchParams = await searchParams;
  const search = getStringParam(resolvedSearchParams.q).trim().slice(0, 100);
  const requestedPage = Number.parseInt(getStringParam(resolvedSearchParams.page), 10);
  const [featuredArticles, latestArticles, categories] = [
    getFeaturedArticles(2),
    getLatestArticles(4),
    getArticleCategories(),
  ];
  const results = queryArticles({
    search,
    page: Number.isFinite(requestedPage) ? requestedPage : 1,
    pageSize: PAGE_SIZE,
  });
  const popularSurahs = POPULAR_SURAH_IDS.map(getSurahById).filter(
    (surah): surah is NonNullable<ReturnType<typeof getSurahById>> => Boolean(surah)
  );
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: 'Articles', item: '/articles' },
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
        items={[{ label: 'Home', href: '/' }, { label: 'Articles' }]}
      />

      <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-teal-800/15 bg-[linear-gradient(135deg,#042f2e_0%,#115e59_56%,#047857_100%)] px-5 py-10 text-white shadow-[0_28px_70px_-38px_rgba(13,148,136,0.75)] sm:px-9 sm:py-14 lg:px-14">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-32 right-20 size-64 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100 backdrop-blur">
            <BookOpenText className="size-4" aria-hidden="true" />
            Read · Reflect · Verify
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.02] text-white sm:text-5xl lg:text-6xl">
            Quran guidance with sources in view
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-teal-50/85 sm:text-lg">
            Explore practical Quran reading guides, Surah introductions, and referenced duas.
            Every article shows its sources, update date, and Islamic review status clearly.
          </p>
          <a
            href="#article-library"
            className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold !text-teal-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
          >
            Browse the library
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="mt-14" aria-labelledby="featured-articles-heading">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
              Editor&apos;s selection
            </p>
            <h2
              id="featured-articles-heading"
              className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)] sm:text-4xl"
            >
              Featured articles
            </h2>
          </div>
          <Sparkles className="hidden size-7 text-teal-600 sm:block" aria-hidden="true" />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {featuredArticles.map((article, index) => (
            <ArticleCard
              key={article.slug}
              article={article}
              featured
              priority={index === 0}
            />
          ))}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="article-categories-heading">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
            <Layers3 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
              Find your topic
            </p>
            <h2
              id="article-categories-heading"
              className="font-display text-3xl font-semibold text-[var(--color-heading)]"
            >
              Article categories
            </h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/articles/category/${category.slug}`}
              className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:border-teal-600/45 hover:shadow-[var(--shadow-card)]"
            >
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-teal-700 dark:text-teal-300">
                {category.count} {category.count === 1 ? 'article' : 'articles'}
              </span>
              <h3 className="mt-3 font-display text-2xl font-semibold text-[var(--color-heading)] transition group-hover:text-teal-700 dark:group-hover:text-teal-300">
                {category.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
                {category.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-teal-700 dark:text-teal-300">
                Explore category
                <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section
        id="article-library"
        className="mt-16 scroll-mt-24"
        aria-labelledby="article-library-heading"
      >
        <div className="rounded-[1.75rem] border border-teal-800/15 bg-[linear-gradient(145deg,rgba(13,148,136,0.10),var(--color-surface))] p-5 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[1fr_30rem] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
                Search the collection
              </p>
              <h2
                id="article-library-heading"
                className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)] sm:text-4xl"
              >
                {search ? 'Search results' : 'All articles'}
              </h2>
              <p className="mt-2 text-sm text-[var(--color-muted-text)]">
                {results.totalItems}{' '}
                {results.totalItems === 1 ? 'article matches' : 'articles match'}
                {search ? ` “${search}”` : ' your search'}.
              </p>
            </div>
            <form action="/articles" method="get" role="search" className="flex gap-2">
              <label htmlFor="article-search" className="sr-only">
                Search articles
              </label>
              <span className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-text)]"
                  aria-hidden="true"
                />
                <input
                  id="article-search"
                  name="q"
                  type="search"
                  defaultValue={search}
                  placeholder="Search Surahs, duas, topics…"
                  maxLength={100}
                  className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-heading)] outline-none transition placeholder:text-[var(--color-muted-text)] focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                />
              </span>
              <button
                type="submit"
                className="min-h-11 shrink-0 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        {results.items.length > 0 ? (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.items.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-12 text-center">
            <h3 className="font-display text-2xl font-semibold text-[var(--color-heading)]">
              No articles found
            </h3>
            <p className="mt-2 text-sm text-[var(--color-muted-text)]">
              Try a broader term, or return to the complete article library.
            </p>
            <Link
              href="/articles#article-library"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-teal-700/30 px-4 py-2 text-sm font-bold text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/30"
            >
              Clear search
            </Link>
          </div>
        )}

        {results.totalPages > 1 ? (
          <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Article pagination">
            <Link
              href={buildArticlesHref(search, Math.max(1, results.page - 1))}
              aria-disabled={!results.hasPreviousPage}
              tabIndex={results.hasPreviousPage ? undefined : -1}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-bold transition ${
                results.hasPreviousPage
                  ? 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-teal-600/50'
                  : 'pointer-events-none border-[var(--color-border)] opacity-45'
              }`}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Previous
            </Link>
            {getVisiblePages(results.page, results.totalPages).map((page) => (
              <Link
                key={page}
                href={buildArticlesHref(search, page)}
                aria-current={page === results.page ? 'page' : undefined}
                className={`flex size-10 items-center justify-center rounded-xl border text-sm font-bold transition ${
                  page === results.page
                    ? 'border-teal-700 bg-teal-700 text-white'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-teal-600/50'
                }`}
              >
                {page}
              </Link>
            ))}
            <Link
              href={buildArticlesHref(search, Math.min(results.totalPages, results.page + 1))}
              aria-disabled={!results.hasNextPage}
              tabIndex={results.hasNextPage ? undefined : -1}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-bold transition ${
                results.hasNextPage
                  ? 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-teal-600/50'
                  : 'pointer-events-none border-[var(--color-border)] opacity-45'
              }`}
            >
              Next
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </nav>
        ) : null}
      </section>

      <section className="mt-16" aria-labelledby="latest-articles-heading">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
              Recently published
            </p>
            <h2
              id="latest-articles-heading"
              className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)] sm:text-4xl"
            >
              Latest articles
            </h2>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {latestArticles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>

      <section className="mt-16" aria-labelledby="popular-surah-guides-heading">
        <div className="overflow-hidden rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] sm:p-7">
          <div className="mb-6 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
              Continue reading
            </p>
            <h2
              id="popular-surah-guides-heading"
              className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)] sm:text-4xl"
            >
              Popular Surah guides
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
              Open the full Arabic text with Urdu and English translations, recitation, and
              verse-by-verse tools.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {popularSurahs.map((surah) => (
              <Link
                key={surah.id}
                href={buildSurahPath(surah.id, surah.surahName)}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 transition hover:border-teal-600/45 hover:bg-teal-50 dark:hover:bg-teal-950/25"
              >
                <span className="min-w-0">
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                    Surah {surah.id} · {surah.totalAyah} Ayahs
                  </span>
                  <span className="mt-1 block truncate font-semibold text-[var(--color-heading)]">
                    {surah.surahName}
                  </span>
                </span>
                <span
                  className="surah-arabic-name shrink-0 text-xl text-[var(--color-heading)]"
                  lang="ar"
                  dir="rtl"
                >
                  {surah.surahNameArabic}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
