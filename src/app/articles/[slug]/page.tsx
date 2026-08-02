import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ArticleBreadcrumbs } from '@/components/articles/ArticleBreadcrumbs';
import { ArticleHeader } from '@/components/articles/ArticleHeader';
import { ArticleMdx } from '@/components/articles/article-mdx';
import { ArticleShareButtons } from '@/components/articles/ArticleShareButtons';
import { ArticleTableOfContents } from '@/components/articles/ArticleTableOfContents';
import { RelatedArticles } from '@/components/articles/RelatedArticles';
import { RelatedSurahs } from '@/components/articles/RelatedSurahs';
import {
  getAllArticleSummaries,
  getArticleBySlug,
  getRelatedArticles,
  type Article,
} from '@/lib/articles';
import {
  buildBreadcrumbJsonLd,
  getSiteName,
  getSiteOrigin,
  toAbsoluteUrl,
} from '@/lib/seo';

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-static';
export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return getAllArticleSummaries().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Article not found',
      robots: { index: false, follow: false },
    };
  }

  const canonicalUrl = toAbsoluteUrl(article.href);
  const imageUrl = toAbsoluteUrl(article.coverImage);

  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    authors: [{ name: article.author }],
    creator: article.author,
    publisher: getSiteName(),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'article',
      url: canonicalUrl,
      siteName: getSiteName(),
      locale: 'en_US',
      title: article.title,
      description: article.description,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      section: article.category,
      tags: article.keywords,
      authors: [article.author],
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: article.coverAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    other: {
      'article:published_time': article.publishedAt,
      'article:modified_time': article.updatedAt,
      'article:section': article.category,
      'content-reviewer': article.reviewer,
      'content-last-reviewed': article.reviewedAt ?? 'pending',
    },
  };
}

function buildArticleJsonLd(article: Article) {
  const pageUrl = toAbsoluteUrl(article.href);
  const imageUrl = toAbsoluteUrl(article.coverImage);
  const siteOrigin = getSiteOrigin();

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${pageUrl}#article`,
    headline: article.title,
    description: article.description,
    image: {
      '@type': 'ImageObject',
      url: imageUrl,
      width: 1200,
      height: 630,
      caption: article.coverAlt,
    },
    author: {
      '@type': 'Organization',
      name: article.author,
      url: siteOrigin,
    },
    publisher: {
      '@type': 'Organization',
      name: getSiteName(),
      url: siteOrigin,
      logo: {
        '@type': 'ImageObject',
        url: toAbsoluteUrl('/logos/logo1.png'),
      },
    },
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
    url: pageUrl,
    articleSection: article.category,
    keywords: article.keywords.join(', '),
    inLanguage: ['en', 'ur', 'ar'],
    isAccessibleForFree: true,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = getRelatedArticles(article.relatedArticles, 3);
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Articles', href: '/articles' },
    {
      label: article.category,
      href: `/articles/category/${article.categorySlug}`,
    },
    { label: article.title },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: 'Articles', item: '/articles' },
    {
      name: article.category,
      item: `/articles/category/${article.categorySlug}`,
    },
    { name: article.title, item: article.href },
  ]);
  const articleJsonLd = buildArticleJsonLd(article);

  return (
    <div className="pb-20 pt-6 sm:pt-9" data-slot="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <ArticleBreadcrumbs items={breadcrumbItems} />

      <article itemScope itemType="https://schema.org/Article">
        <ArticleHeader article={article} />

        <div className="mx-auto max-w-6xl">
          <div className="mb-8 lg:hidden">
            <ArticleTableOfContents
              headings={article.headings}
              headingId="article-table-of-contents-mobile"
            />
          </div>

          <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start xl:gap-14">
            <div className="min-w-0">
              <ArticleMdx source={article.body} />
              <RelatedSurahs surahIds={article.relatedSurahs} />
              <ArticleShareButtons
                title={article.title}
                url={toAbsoluteUrl(article.href)}
              />
            </div>

            <aside className="hidden lg:sticky lg:top-24 lg:block" aria-label="Article navigation">
              <ArticleTableOfContents
                headings={article.headings}
                headingId="article-table-of-contents-desktop"
              />
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4 text-xs leading-5 text-[var(--color-muted-text)]">
                <p className="font-bold text-amber-800 dark:text-amber-200">
                  Islamic review status
                </p>
                <p className="mt-1">{article.reviewer}</p>
                <p className="mt-2">
                  Source links and reported grades are shown so readers can verify context.
                </p>
              </div>
            </aside>
          </div>

          <RelatedArticles articles={relatedArticles} />
        </div>
      </article>
    </div>
  );
}
