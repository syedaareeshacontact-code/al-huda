import Link from 'next/link';
import {
  ArrowRight,
  BookCheck,
  BookOpenText,
  CircleUserRound,
  Headphones,
  Languages,
  LibraryBig,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { ArticleCard } from '@/components/articles/ArticleCard';
import { getLatestArticles, getPopularSurahGuides } from '@/lib/articles';

const UNIQUE_BENEFITS = [
  {
    title: 'Read and listen together',
    description:
      'Arabic text, Urdu and English translation, recitation audio, and ayah navigation stay in one focused reading flow.',
    icon: Headphones,
  },
  {
    title: 'Return without losing your place',
    description:
      'Bookmarks, favourites, and last-read progress help you continue a regular Quran routine across visits.',
    icon: BookCheck,
  },
  {
    title: 'Sources stay visible',
    description:
      'Translations, Tafseer, Hadith references, review status, and correction routes are shown instead of hidden.',
    icon: SearchCheck,
  },
] as const;

const LEARNING_RESOURCES = [
  {
    title: 'Quran reader',
    description: 'Read all 114 Surahs with translation, audio, bookmarks, and reading controls.',
    href: '/surah',
    label: 'Open the Quran',
    icon: BookOpenText,
  },
  {
    title: 'Urdu Tafseer',
    description: 'Move from translation into ayah-by-ayah Urdu commentary and source context.',
    href: '/tafsir',
    label: 'Study Tafseer',
    icon: Languages,
  },
  {
    title: 'Duas and Azkar',
    description: 'Browse Arabic supplications, translations, categories, and available source references.',
    href: '/duas',
    label: 'Browse Duas',
    icon: Sparkles,
  },
  {
    title: 'Learning library',
    description: 'Find original Quran guides, Surah studies, and source-aware practical articles.',
    href: '/articles',
    label: 'View all guides',
    icon: LibraryBig,
  },
] as const;

const REVIEW_STEPS = [
  {
    title: 'Start with identifiable sources',
    description:
      'Quran ayahs, Hadith references, translations, and reported grades are linked or attributed where available.',
  },
  {
    title: 'Write for clarity, not certainty beyond evidence',
    description:
      'Original guidance is written in plain language and avoids presenting unsupported devotional claims as established facts.',
  },
  {
    title: 'Show review status honestly',
    description:
      'Editorial checks and pending Islamic scholarly review are labelled separately; a pending review is never presented as approval.',
  },
  {
    title: 'Keep corrections open',
    description:
      'Readers can report source, translation, attribution, or wording problems through the public corrections process.',
  },
] as const;

export default function HomeEditorialSections() {
  const latestArticles = getLatestArticles(4);
  const originalGuides = latestArticles.filter((article) => !article.featured).slice(0, 2);
  const displayedGuides = originalGuides.length > 0 ? originalGuides : latestArticles.slice(0, 2);
  const featuredStudies = getPopularSurahGuides(2);

  return (
    <>
      <section
        className="mt-10 sm:mt-14"
        data-slot="page-shell"
        aria-labelledby="unique-benefits-heading"
      >
        <div className="rounded-[1.75rem] border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-accent),var(--color-surface)_95%),var(--color-surface))] p-5 shadow-[var(--shadow-soft)] sm:p-7 lg:p-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent-soft)]">
              More than a text viewer
            </p>
            <h2
              id="unique-benefits-heading"
              className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)] sm:text-4xl"
            >
              A focused Quran companion
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted-text)] sm:text-base">
              Read al Quran combines study tools, personal reading continuity, and visible source
              information so visitors can read, revisit, and verify in one place.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {UNIQUE_BENEFITS.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-elevated),transparent_4%)] p-5"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)] text-[var(--color-accent)]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-[var(--color-heading)]">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="mt-12 sm:mt-16"
        data-slot="page-shell"
        aria-labelledby="latest-guides-heading"
      >
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent-soft)]">
              Written for Read al Quran
            </p>
            <h2
              id="latest-guides-heading"
              className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)] sm:text-4xl"
            >
              Latest original guides
            </h2>
          </div>
          <Link
            href="/articles"
            prefetch={false}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--color-accent-soft)] hover:underline"
          >
            All guides <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {displayedGuides.map((article) => (
            <ArticleCard key={article.slug} article={article} featured />
          ))}
        </div>
      </section>

      <section
        className="mt-12 sm:mt-16"
        data-slot="page-shell"
        aria-labelledby="featured-studies-heading"
      >
        <div className="mb-5 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent-soft)]">
            Read with context
          </p>
          <h2
            id="featured-studies-heading"
            className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)] sm:text-4xl"
          >
            Featured Quran studies
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
            Source-aware Surah introductions separate the Quran’s clear themes from popular claims
            that require stronger evidence.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {featuredStudies.map((article) => (
            <ArticleCard key={article.slug} article={article} featured />
          ))}
        </div>
      </section>

      <section
        className="mt-12 sm:mt-16"
        data-slot="page-shell"
        aria-labelledby="learning-resources-heading"
      >
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent-soft)]">
            Start where you need
          </p>
          <h2
            id="learning-resources-heading"
            className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)] sm:text-4xl"
          >
            Popular learning resources
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LEARNING_RESOURCES.map(({ title, description, href, label, icon: Icon }) => (
            <Link
              key={title}
              href={href}
              prefetch={false}
              className="group flex min-h-56 flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:border-[var(--color-accent-soft)] hover:shadow-[var(--shadow-card)]"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)] text-[var(--color-accent)]">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold text-[var(--color-heading)]">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
                {description}
              </p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-bold text-[var(--color-accent-soft)]">
                {label}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section
        className="mt-12 sm:mt-16"
        data-slot="page-shell"
        aria-labelledby="editorial-trust-heading"
      >
        <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
          <article
            id="author-zain-qalandar-shah"
            className="rounded-[1.75rem] border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_55%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-accent),var(--color-surface)_93%),var(--color-surface))] p-6 shadow-[var(--shadow-soft)] sm:p-7"
          >
            <span className="flex size-14 items-center justify-center rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[var(--color-surface-elevated)] text-[var(--color-accent)]">
              <CircleUserRound className="size-7" aria-hidden="true" />
            </span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent-soft)]">
              Author &amp; Content Editor
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)]">
              Zain Qalandar Shah
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted-text)]">
              Zain writes and edits the original guides published on Read al Quran. His editorial
              checks focus on clear wording, visible citations, accurate attribution, and honest
              review status.
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted-text)]">
              He does not claim Islamic scholarly authority. Questions requiring a religious
              ruling or specialist verification should be taken to a qualified scholar.
            </p>
            <Link
              href="/authors/zain-qalandar-shah"
              className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[var(--color-accent-foreground)]"
            >
              View author profile
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>

          <article className="rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] sm:p-7">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)] text-[var(--color-accent)]">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent-soft)]">
                  Editorial transparency
                </p>
                <h2
                  id="editorial-trust-heading"
                  className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)]"
                >
                  How our content is reviewed
                </h2>
              </div>
            </div>

            <ol className="mt-6 grid gap-3 sm:grid-cols-2">
              {REVIEW_STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4"
                >
                  <span className="text-xs font-bold text-[var(--color-accent)]">
                    Step {index + 1}
                  </span>
                  <h3 className="mt-1 font-semibold text-[var(--color-heading)]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/editorial-policy"
                className="inline-flex min-h-10 items-center rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[var(--color-accent-foreground)]"
              >
                Read editorial policy
              </Link>
              <Link
                href="/corrections"
                className="inline-flex min-h-10 items-center rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-heading)] hover:border-[var(--color-accent-soft)]"
              >
                Report a correction
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
