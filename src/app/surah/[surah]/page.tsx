import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import BreadcrumbNav from '@/components/ui/breadcrumb-nav';
import SurahCrawlableContent from '@/components/quran/surah-crawlable-content';
import QuranReaderPage from '@/components/sidebar';
import { getAllSurahs, resolveSurahParam } from '@/lib/quran-index';
import { getAyahRowsForSurah } from '@/lib/quran-server';
import { buildSurahPath, buildSurahSlug } from '@/lib/quran-routing';
import { buildSurahPageKeywords } from '@/lib/seo-keywords';
import { buildPageMetadata } from '@/lib/seo';
import { buildSurahPageSchemas } from '@/lib/seo-schema';
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

export function generateStaticParams() {
  return getAllSurahs().map((surah) => ({
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

  let ayahRows: Awaited<ReturnType<typeof getAyahRowsForSurah>> = [];
  try {
    ayahRows = await getAyahRowsForSurah(surah.id);
  } catch {
    ayahRows = [];
  }

  const surahPath = buildSurahPath(surah.id, surah.surahName);
  const surahBreadcrumbLabel = `Surah ${surah.surahName}`;
  const urduTitle = getSurahUrduTitle(surah);
  const schemas = buildSurahPageSchemas(surah, getSurahMetaDescription(surah), ayahRows.length);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.book) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.itemList) }} />

      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <BreadcrumbNav
            items={[
              { label: 'Home', href: '/' },
              { label: 'Surah Index', href: '/surah' },
              { label: surahBreadcrumbLabel, href: surahPath },
            ]}
            includeSchema={false}
          />
          <h1 className="font-display text-3xl text-[var(--color-heading)] sm:text-4xl">
            Surah {surah.surahName} ({surah.surahNameArabic})
          </h1>
          <p className="urdu-font mt-2 text-2xl text-[var(--color-accent-soft)]" dir="rtl" lang="ur">
            {urduTitle}
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted-text)]">
            {surah.surahNameTranslation} · {surah.totalAyah} ayahs · {surah.revelationPlace}
          </p>
        </div>
      </section>

      {ayahRows.length > 0 && (
        <SurahCrawlableContent surah={surah} ayahs={ayahRows} />
      )}

      {/* Interactive reader — hydrates on top of crawlable SSR content */}
      <QuranReaderPage />
    </>
  );
}
