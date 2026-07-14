import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import BreadcrumbNav from '@/components/ui/breadcrumb-nav';
import SurahDownloadHub from '@/components/quran/surah-download-hub';
import { resolveSurahParam } from '@/lib/quran-index';
import { buildSurahPath } from '@/lib/quran-routing';
import { getAllSurahStaticParams } from '@/lib/quran-static-params';
import { buildPageMetadata } from '@/lib/seo';
import { buildSurahDownloadSchemas } from '@/lib/seo-schema';
import {
  buildSurahDownloadOptions,
  buildSurahDownloadPath,
  getAllSurahAudioSources,
} from '@/lib/surah-download';
import {
  buildDownloadPageKeywords,
  getDownloadPageDescription,
  getDownloadPageTitle,
} from '@/lib/surah-download-seo';

interface SurahDownloadPageProps {
  params: Promise<{ surah: string }>;
}

export const dynamic = 'force-static';
export const revalidate = false;
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSurahStaticParams();
}

export async function generateMetadata({ params }: SurahDownloadPageProps): Promise<Metadata> {
  const { surah: surahParam } = await params;
  const resolved = resolveSurahParam(surahParam);

  if (!resolved) {
    return buildPageMetadata({
      title: 'Download Not Found',
      description: 'Requested surah download page was not found.',
      path: '/download',
      index: false,
    });
  }

  const surah = resolved.surah;
  const canonicalPath = buildSurahDownloadPath(surah.id, surah.surahName);

  return buildPageMetadata({
    title: getDownloadPageTitle(surah),
    description: getDownloadPageDescription(surah),
    path: canonicalPath,
    ogType: 'website',
    imageUrl: `/og?kind=surah&surah=${surah.id}`,
    keywords: buildDownloadPageKeywords(surah),
  });
}

export default async function SurahDownloadPage({ params }: SurahDownloadPageProps) {
  const { surah: surahParam } = await params;
  const resolved = resolveSurahParam(surahParam);

  if (!resolved) {
    notFound();
  }

  const { surah, isCanonicalSlug } = resolved;

  if (!isCanonicalSlug) {
    permanentRedirect(buildSurahDownloadPath(surah.id, surah.surahName));
  }

  const surahPath = buildSurahPath(surah.id, surah.surahName);
  const downloadPath = buildSurahDownloadPath(surah.id, surah.surahName);
  const audioSources = await getAllSurahAudioSources(surah.id);
  const options = buildSurahDownloadOptions(surah, audioSources);
  const schemas = buildSurahDownloadSchemas(surah, options, downloadPath);

  return (
    <div className="pb-16 pt-8" data-slot="page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.itemList) }} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <BreadcrumbNav
          items={[
            { label: 'Home', href: '/' },
            { label: 'Downloads', href: '/download' },
            { label: 'Surah Index', href: '/surah' },
            { label: `Surah ${surah.surahName}`, href: surahPath },
            { label: 'Download', href: downloadPath },
          ]}
          includeSchema={false}
        />

        <SurahDownloadHub surah={surah} audioSources={audioSources} />
      </div>
    </div>
  );
}
