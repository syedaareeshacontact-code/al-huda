import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  BookOpenCheck,
  Bookmark,
  Download,
  FileText,
  Headphones,
  Settings2,
} from 'lucide-react';

import BreadcrumbNav from '@/components/ui/breadcrumb-nav';
import QuranReaderPage from '@/components/sidebar';
import { getAllSurahs, resolveSurahParam } from '@/lib/quran-index';
import { getSurahDetailById, getSurahMetaById } from '@/lib/quran-server';
import { buildSurahPath, buildSurahSlug } from '@/lib/quran-routing';
import { POPULAR_SURAH_IDS } from '@/lib/ssg-config';
import { buildSurahDownloadPath } from '@/lib/surah-download';
import { buildSurahPageKeywords } from '@/lib/seo-keywords';
import { buildPageMetadata } from '@/lib/seo';
import { buildSurahPageSchemas } from '@/lib/seo-schema';
import { SurhasListProvider } from '@/context/SurhasListProvider';
import {
  getSurahMetaTitle,
  getSurahMetaDescription,
  getSurahUrduTitle,
} from '@/lib/surah-seo-content';

interface SurahPageProps {
  params: Promise<{
    surah: string;
  }>;
}

export const revalidate = 86400;
export const dynamicParams = true;
const INITIAL_SURAH_AYAH_LIMIT = 20;

export function generateStaticParams() {
  return getAllSurahs()
    .filter((surah) => POPULAR_SURAH_IDS.some((id) => id === surah.id))
    .map((surah) => ({
      surah: buildSurahSlug(surah.id, surah.surahName),
    }));
}

export async function generateMetadata({ params }: SurahPageProps): Promise<Metadata> {
  const { surah: surahParam } = await params;
  const resolved = resolveSurahParam(surahParam);

  if (!resolved) {
    return buildPageMetadata({
      title: 'Surah Not Found',
      description: 'Requested surah was not found.',
      path: '/surah',
      index: false,
    });
  }

  const surah = resolved.surah;
  const canonicalPath = buildSurahPath(surah.id, surah.surahName);

  return buildPageMetadata({
    title: getSurahMetaTitle(surah),
    description: getSurahMetaDescription(surah),
    path: canonicalPath,
    ogType: 'article',
    imageUrl: `/og?kind=surah&surah=${surah.id}`,
    keywords: buildSurahPageKeywords({
      surahId: surah.id,
      surahName: surah.surahName,
      surahNameArabic: surah.surahNameArabic,
      surahNameTranslation: surah.surahNameTranslation,
    }),
  });
}

export default async function SurahDetailPage({ params }: SurahPageProps) {
  const { surah: surahParam } = await params;
  const resolved = resolveSurahParam(surahParam);

  if (!resolved) {
    notFound();
  }

  const { surah, isCanonicalSlug } = resolved;
  if (!isCanonicalSlug) {
    permanentRedirect(buildSurahPath(surah.id, surah.surahName));
  }

  let initialSurahDetail: Awaited<ReturnType<typeof getSurahDetailById>> | null = null;
  let initialSurahMeta: Awaited<ReturnType<typeof getSurahMetaById>> | null = null;
  try {
    const [detail, meta] = await Promise.all([
      getSurahDetailById(surah.id),
      getSurahMetaById(surah.id),
    ]);
    initialSurahDetail = {
      ...detail,
      ayahs: detail.ayahs.slice(0, INITIAL_SURAH_AYAH_LIMIT),
    };
    // Keep the initial document useful while avoiding the full chapter in the
    // hydration payload. Remaining ayahs are loaded after explicit reader intent.
    initialSurahMeta = {
      ...meta,
      english: meta.english?.slice(0, INITIAL_SURAH_AYAH_LIMIT),
      urdu: meta.urdu?.slice(0, INITIAL_SURAH_AYAH_LIMIT),
      arabic1: [],
      audio: {},
    };
  } catch {
    initialSurahDetail = null;
    initialSurahMeta = null;
  }

  const surahPath = buildSurahPath(surah.id, surah.surahName);
  const surahBreadcrumbLabel = `Surah ${surah.surahName}`;
  const urduTitle = getSurahUrduTitle(surah);
  const schemas = buildSurahPageSchemas(
    surah,
    getSurahMetaDescription(surah),
    initialSurahDetail?.numberOfAyahs ?? surah.totalAyah
  );
  const featureItems = [
    {
      label: 'Read',
      description: `${surah.totalAyah} ayahs with translation`,
      icon: BookOpenCheck,
    },
    {
      label: 'Audio',
      description: 'Arabic and Urdu listening modes',
      icon: Headphones,
    },
    {
      label: 'Tafseer',
      description: 'Ayah-wise Urdu tafseer',
      icon: FileText,
    },
    {
      label: 'Bookmarks',
      description: 'Save ayahs after login',
      icon: Bookmark,
    },
    {
      label: 'Settings',
      description: 'Font, theme, and reading mode',
      icon: Settings2,
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.book) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.itemList) }} />

      <section className="border-b border-[var(--color-border)] bg-[linear-gradient(145deg,var(--color-surface),color-mix(in_oklab,var(--color-accent),var(--color-surface)_94%))] px-4 py-6 sm:px-6 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <BreadcrumbNav
            items={[
              { label: 'Home', href: '/' },
              { label: 'Surah Index', href: '/surah' },
              { label: surahBreadcrumbLabel, href: surahPath },
            ]}
            includeSchema={false}
          />
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Surah {surah.id}
              </p>
              <h1 className="mt-2 font-display text-4xl leading-tight text-[var(--color-heading)] sm:text-5xl">
                Surah {surah.surahName}
              </h1>
              <p
                className="arabic-font mt-3 text-4xl leading-relaxed text-[var(--color-heading)] sm:text-5xl"
                dir="rtl"
                lang="ar"
              >
                {surah.surahNameArabic}
              </p>
              <p className="font-arabic mt-2 text-2xl text-[var(--color-accent-soft)]" dir="rtl" lang="ur">
                {urduTitle}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--color-muted-text)]">
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1">
                  {surah.surahNameTranslation}
                </span>
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1">
                  {surah.totalAyah} ayahs
                </span>
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1">
                  {surah.revelationPlace}
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="#interactive-reader"
                  className="inline-flex items-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_38%)] bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] px-4 py-2.5 text-sm font-bold text-[var(--color-accent-foreground)] shadow-[var(--shadow-soft)]"
                >
                  <BookOpenCheck className="size-4" />
                  Start Reading
                </a>
                <Link
                  href={buildSurahDownloadPath(surah.id, surah.surahName)}
                  prefetch={false}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2.5 text-sm font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)]"
                >
                  <Download className="size-4" />
                  PDF & Audio
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
              {featureItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-xl border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-elevated),transparent_4%)] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)] text-[var(--color-accent)]">
                        <Icon className="size-4" />
                      </span>
                      <p className="font-semibold text-[var(--color-heading)]">{item.label}</p>
                    </div>
                    <p className="mt-1 text-xs leading-snug text-[var(--color-muted-text)]">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Interactive reader is the only visible ayah list to avoid duplicate ayahs. */}
      <SurhasListProvider>
        <QuranReaderPage
          initialSurahId={surah.id}
          initialSurahDetail={initialSurahDetail}
          initialSurahMeta={initialSurahMeta}
        />
      </SurhasListProvider>
    </>
  );
}
