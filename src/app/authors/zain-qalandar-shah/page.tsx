import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpenCheck,
  CircleUserRound,
  FileCheck2,
  Mail,
  ShieldCheck,
} from 'lucide-react';

import { ArticleBreadcrumbs } from '@/components/articles/ArticleBreadcrumbs';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { PRIMARY_AUTHOR } from '@/lib/author-profile';
import { getAllArticleSummaries } from '@/lib/articles';
import {
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  getSiteName,
  getSiteOrigin,
  toAbsoluteUrl,
} from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Zain Qalandar Shah – Owner, Author & Editor',
  description:
    'Meet Zain Qalandar Shah, owner, author, and content editor of Read al Quran. View his editorial responsibilities, limitations, and published guides.',
  path: PRIMARY_AUTHOR.href,
  author: PRIMARY_AUTHOR.name,
});

const RESPONSIBILITIES = [
  {
    title: 'Research and attribution',
    description:
      'Checks that Quran ayahs, Hadith references, translations, and data providers are identified wherever the available source information permits.',
    icon: BookOpenCheck,
  },
  {
    title: 'Writing and editing',
    description:
      'Writes original guides in clear language, separates sourced claims from explanation, and avoids unsupported guarantees or devotional claims.',
    icon: FileCheck2,
  },
  {
    title: 'Transparency and corrections',
    description:
      'Maintains visible review status, editorial limitations, source policies, and a public route for readers to report corrections.',
    icon: ShieldCheck,
  },
] as const;

export default function ZainQalandarShahAuthorPage() {
  const authoredArticles = getAllArticleSummaries().filter(
    (article) => article.author === PRIMARY_AUTHOR.name
  );
  const updatedAt = authoredArticles.reduce(
    (latest, article) => (article.updatedAt > latest ? article.updatedAt : latest),
    '2026-08-02'
  );
  const authorUrl = toAbsoluteUrl(PRIMARY_AUTHOR.href);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: 'About', item: '/about' },
    { name: PRIMARY_AUTHOR.name, item: PRIMARY_AUTHOR.href },
  ]);
  const authorJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${authorUrl}#person`,
    name: PRIMARY_AUTHOR.name,
    description: PRIMARY_AUTHOR.description,
    jobTitle: PRIMARY_AUTHOR.schemaRole,
    url: authorUrl,
    mainEntityOfPage: authorUrl,
    worksFor: {
      '@type': 'Organization',
      name: getSiteName(),
      url: getSiteOrigin(),
    },
    knowsAbout: [
      'Quran reading guides',
      'Content editing',
      'Source attribution',
      'Editorial transparency',
    ],
  };
  const structuredData = [
    { id: 'author-breadcrumbs', value: breadcrumbJsonLd },
    { id: 'author-profile', value: authorJsonLd },
  ];

  return (
    <div className="pb-20 pt-6 sm:pt-9" data-slot="page-shell">
      {structuredData.map((entry) => (
        <script
          key={entry.id}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(entry.value).replace(/</g, '\\u003c'),
          }}
        />
      ))}

      <ArticleBreadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'About', href: '/about' },
          { label: PRIMARY_AUTHOR.name },
        ]}
      />

      <header className="mt-5 overflow-hidden rounded-[2rem] border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%),var(--color-surface))] p-6 shadow-[var(--shadow-soft)] sm:p-9 lg:p-12">
        <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
          <span className="grid size-24 place-items-center rounded-[1.75rem] border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[var(--color-surface-elevated)] text-[var(--color-accent)] shadow-[var(--shadow-card)]">
            <CircleUserRound className="size-12" aria-hidden="true" />
          </span>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              {PRIMARY_AUTHOR.role}
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-[var(--color-heading)] sm:text-5xl">
              {PRIMARY_AUTHOR.name}
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--color-muted-text)] sm:text-lg">
              Zain owns and maintains Read al Quran and writes and edits the original guides
              published in its learning library. His focus is clear writing, traceable sources,
              accurate attribution, and honest review labels.
            </p>
            <p className="mt-4 text-xs text-[var(--color-muted-text)]">
              Profile and article record last updated:{' '}
              <time dateTime={updatedAt}>{updatedAt}</time>
            </p>
          </div>
        </div>
      </header>

      <section className="mt-12" aria-labelledby="editorial-role-heading">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Editorial responsibilities
          </p>
          <h2
            id="editorial-role-heading"
            className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)]"
          >
            How Zain handles published content
          </h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {RESPONSIBILITIES.map((responsibility) => {
            const Icon = responsibility.icon;
            return (
              <article
                key={responsibility.title}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%)] text-[var(--color-accent)]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-[var(--color-heading)]">
                  {responsibility.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
                  {responsibility.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 sm:p-6" aria-labelledby="author-limitations-heading">
        <h2
          id="author-limitations-heading"
          className="font-display text-2xl font-semibold text-[var(--color-heading)]"
        >
          Qualifications and review limitations
        </h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--color-muted-text)] sm:text-base">
          This profile does not claim that Zain is a qualified Islamic scholar or mufti. Editorial
          checking is not the same as independent scholarly approval. Articles that have not been
          reviewed by a qualified Islamic scholar retain a visible pending-review label, and readers
          should consult a qualified scholar for religious rulings or specialist interpretation.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/editorial-policy"
            className="inline-flex min-h-10 items-center rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[var(--color-accent-foreground)]"
          >
            Read editorial policy
          </Link>
          <Link
            href="/corrections"
            className="inline-flex min-h-10 items-center rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-heading)] hover:border-[var(--color-accent)]"
          >
            Report a correction
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-heading)] hover:border-[var(--color-accent)]"
          >
            <Mail className="size-4" aria-hidden="true" />
            Contact Zain
          </Link>
        </div>
      </section>

      <section className="mt-14" aria-labelledby="authored-articles-heading">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Published work
          </p>
          <h2
            id="authored-articles-heading"
            className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)] sm:text-4xl"
          >
            Articles by {PRIMARY_AUTHOR.name}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted-text)] sm:text-base">
            These original guides show their sources, publication dates, update dates, and Islamic
            review status on the article page.
          </p>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {authoredArticles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>
    </div>
  );
}
