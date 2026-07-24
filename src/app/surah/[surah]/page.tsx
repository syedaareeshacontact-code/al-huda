import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';

import SurahReader from '@/components/quran/surah-reader';
import AyahDetailOverlay from '@/components/quran/ayah-detail-overlay';
import SurahCrawlableContent from '@/components/quran/surah-crawlable-content';
import SurahPageHero from '@/components/quran/surah-page-hero';
import { resolveSurahParam } from '@/lib/quran-index';
import { getSurahDetailById, getSurahMetaById } from '@/lib/quran-server';
import { buildSurahPath } from '@/lib/quran-routing';
import { getAllSurahStaticParams } from '@/lib/quran-static-params';
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

export const dynamic = 'force-static';
export const revalidate = false;
export const dynamicParams = false;
const INITIAL_SURAH_AYAH_LIMIT = 20;

export function generateStaticParams() {
  return getAllSurahStaticParams();
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
  const urduTitle = getSurahUrduTitle(surah);
  const schemas = buildSurahPageSchemas(
    surah,
    getSurahMetaDescription(surah),
    initialSurahDetail?.numberOfAyahs ?? surah.totalAyah
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.book) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.itemList) }} />

      <SurahPageHero
        surahId={surah.id}
        surahName={surah.surahName}
        surahNameArabic={surah.surahNameArabic}
        surahNameTranslation={surah.surahNameTranslation}
        revelationPlace={surah.revelationPlace}
        totalAyah={surah.totalAyah}
        urduTitle={urduTitle}
        surahPath={surahPath}
        downloadPath={buildSurahDownloadPath(surah.id, surah.surahName)}
      />

      <SurhasListProvider>
        <SurahReader
          initialSurahId={surah.id}
          initialSurahDetail={initialSurahDetail}
          initialSurahMeta={initialSurahMeta}
        />
      </SurhasListProvider>
      <Suspense fallback={null}>
        <AyahDetailOverlay
          mode="ayah"
          surahId={surah.id}
          surahName={surah.surahName}
          surahArabicName={surah.surahNameArabic}
          totalAyahs={surah.totalAyah}
          inlineTafsir
        />
      </Suspense>
      <SurahCrawlableContent surah={surah} />
    </>
  );
}
