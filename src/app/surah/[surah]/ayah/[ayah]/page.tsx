import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { ChevronLeft, ChevronRight, Download, FileText, Headphones } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AuthDownloadLink from '@/components/quran/auth-download-link';
import AyahSidebar from '@/components/ayah-sidebar';
import BreadcrumbNav from '@/components/ui/breadcrumb-nav';
import { buildAyahAudioDownloadUrl } from '@/lib/download-routes';
import {
  getAyahAudioUrls,
  getAyahContent,
  getUrduTafsirByAyah,
  stripHtml,
} from '@/lib/quran-server';
import { resolveSurahParam } from '@/lib/quran-index';
import {
  buildAyahPath,
  buildSurahPath,
  buildTafsirPath,
} from '@/lib/quran-routing';
import { getFeaturedAyahStaticParams } from '@/lib/quran-static-params';
import { formatQuranArabicForDisplay } from '@/lib/arabic-utils';
import { buildPageMetadata } from '@/lib/seo';
import { buildAyahPageSchemas } from '@/lib/seo-schema';
import { getSurahUrduTitle } from '@/lib/surah-seo-content';

interface AyahPageProps {
  params: Promise<{
    surah: string;
    ayah: string;
  }>;
}

export const dynamic = 'force-static';
export const revalidate = false;
export const dynamicParams = true;

export function generateStaticParams() {
  return getFeaturedAyahStaticParams();
}

function parseAyahNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function buildLightweightAyahKeywords(surahId: number, surahName: string, ayahNumber: number) {
  const normalizedSurahName = surahName.toLowerCase();

  return [
    `ayah ${surahId}:${ayahNumber}`,
    `surah ${normalizedSurahName} ayah ${ayahNumber}`,
    `quran ${surahId}:${ayahNumber}`,
    `ayah ${surahId}:${ayahNumber} urdu translation`,
    `ayah ${surahId}:${ayahNumber} english translation`,
    `ayah ${surahId}:${ayahNumber} tafseer`,
    `ayah ${surahId}:${ayahNumber} audio`,
    `surah ${normalizedSurahName} verse ${ayahNumber}`,
  ];
}

export async function generateMetadata({
  params,
}: AyahPageProps): Promise<Metadata> {
  const { surah: surahParam, ayah: ayahParam } = await params;
  const resolved = resolveSurahParam(surahParam);
  const ayahNumber = parseAyahNumber(ayahParam);

  if (!resolved || !ayahNumber || ayahNumber > resolved.surah.totalAyah) {
    return buildPageMetadata({
      title: 'Ayah Not Found',
      description: 'Requested ayah was not found.',
      path: '/surah',
      index: false,
    });
  }

  const surah = resolved.surah;
  const canonicalPath = buildAyahPath(surah.id, surah.surahName, ayahNumber);

  return buildPageMetadata({
    title: `Quran ${surah.id}:${ayahNumber} — ${surah.surahName} in Arabic, Urdu & English`,
    description: `Read Ayah ${surah.id}:${ayahNumber} of Surah ${surah.surahName} with Arabic text, Urdu translation, English translation, audio, and tafseer link.`,
    path: canonicalPath,
    ogType: 'article',
    imageUrl: `/og?kind=ayah&surah=${surah.id}&ayah=${ayahNumber}`,
    keywords: buildLightweightAyahKeywords(surah.id, surah.surahName, ayahNumber),
  });
}

export default async function AyahDetailPage({
  params,
}: AyahPageProps) {
  const { surah: surahParam, ayah: ayahParam } = await params;
  const resolved = resolveSurahParam(surahParam);
  const ayahNumber = parseAyahNumber(ayahParam);

  if (!resolved || !ayahNumber) {
    notFound();
  }

  const { surah, isCanonicalSlug } = resolved;

  if (ayahNumber > surah.totalAyah) {
    notFound();
  }

  if (!isCanonicalSlug) {
    permanentRedirect(buildAyahPath(surah.id, surah.surahName, ayahNumber));
  }

  const ayah = await getAyahContent(surah.id, ayahNumber);
  if (!ayah) {
    throw new Error('Ayah content is temporarily unavailable.');
  }

  const [audioUrls, tafsir] = await Promise.all([
    getAyahAudioUrls(surah.id, ayahNumber),
    getUrduTafsirByAyah(surah.id, ayahNumber),
  ]);
  const canOpenTafsir = Boolean(tafsir);
  const arabicTextForDisplay = formatQuranArabicForDisplay(ayah.arabicText || '');

  const surahPath = buildSurahPath(surah.id, surah.surahName);
  const surahBreadcrumbLabel = `Surah ${surah.surahName}`;
  const tafsirPath = buildTafsirPath(surah.id, surah.surahName, ayahNumber);
  const canonicalPath = buildAyahPath(surah.id, surah.surahName, ayahNumber);
  const prevAyahPath =
    ayahNumber > 1
      ? buildAyahPath(surah.id, surah.surahName, ayahNumber - 1)
      : null;
  const nextAyahPath =
    ayahNumber < surah.totalAyah
      ? buildAyahPath(surah.id, surah.surahName, ayahNumber + 1)
      : null;

  const breadcrumbs = buildAyahPageSchemas({
    surah,
    ayahNumber,
    arabicText: ayah.arabicText || '',
    urduTranslation: ayah.urduTranslation || '',
    englishTranslation: ayah.englishTranslation || '',
    hasTafsir: canOpenTafsir,
  });

  const ayahIntro = `Ayah ${surah.id}:${ayahNumber} of ${getSurahUrduTitle(surah)} (Surah ${surah.surahName}) — read the Arabic text with Urdu tarjuma and English translation. ${
    canOpenTafsir ? 'Full Urdu tafseer commentary is available for this ayah.' : ''
  }`;

  const audioJsonLd = [
    audioUrls.arabic
      ? {
          '@context': 'https://schema.org',
          '@type': 'AudioObject',
          name: `Ayah ${surah.id}:${ayahNumber} Arabic Audio`,
          inLanguage: 'ar',
          contentUrl: audioUrls.arabic,
        }
      : null,
    audioUrls.urdu
      ? {
          '@context': 'https://schema.org',
          '@type': 'AudioObject',
          name: `Ayah ${surah.id}:${ayahNumber} Urdu Audio`,
          inLanguage: 'ur',
          contentUrl: audioUrls.urdu,
        }
      : null,
  ].filter(Boolean);

  const tafsirSnippet = tafsir ? stripHtml(tafsir.textHtml).slice(0, 280) : null;


  return (
    <div className="pb-16 pt-10" data-slot="page-shell">
      <AyahSidebar
        surahId={surah.id}
        surahName={surah.surahName.toLocaleLowerCase()}
        ayahNumber={ayahNumber}
        totalAyah={surah.totalAyah}
        arabicText={arabicTextForDisplay}
        urduTranslation={ayah.urduTranslation || ''}
        englishTranslation={ayah.englishTranslation || ''}
        tafsirPath={canOpenTafsir ? tafsirPath : undefined}
        surahPath={surahPath}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs.breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs.article) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs.webPage) }}
      />
      {audioJsonLd.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(audioJsonLd) }}
        />
      ) : null}

      <BreadcrumbNav
        items={[
          { label: 'Home', href: '/' },
          { label: surahBreadcrumbLabel, href: surahPath },
          { label: `Ayah ${ayahNumber}`, href: canonicalPath },
        ]}
        includeSchema={false}
      />

      <section className="mb-6">
        <Badge className="mb-2">Ayah {surah.id}:{ayahNumber}</Badge>
        <h1 className="font-display text-4xl text-[var(--color-heading)] sm:text-5xl">
          Ayah {surah.id}:{ayahNumber} • Surah {surah.surahName}
        </h1>
        <p className="urdu-font mt-2 text-xl text-[var(--color-accent-soft)]" dir="rtl" lang="ur">
          {getSurahUrduTitle(surah)} — آیت {ayahNumber}
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--color-muted-text)] sm:text-base">
          {ayahIntro}
        </p>
      </section>

      <Card className="mb-6">
        <CardContent className="space-y-4 p-5">
          <p lang="ar" dir="rtl" className="arabic-font quran-script arabic-mushaf text-[var(--color-heading)]">
            {arabicTextForDisplay || 'Arabic text unavailable.'}
          </p>
          <p lang="ur" dir="rtl" className="urdu-font text-right text-[var(--color-text)]">
            {ayah.urduTranslation || 'Urdu translation unavailable.'}
          </p>
          <p lang="en" dir="ltr" className="text-left text-[var(--color-text)]">
            {ayah.englishTranslation || 'English translation unavailable.'}
          </p>
        </CardContent>
      </Card>

      <p className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm leading-relaxed text-[var(--color-muted-text)]">
        Quran text and translations are supplied through Quran.com. English uses Sahih
        International and Urdu uses Fatah Muhammad Jalandhari. Please report any alignment issue
        through the corrections page.
      </p>

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <Headphones className="size-5 text-[var(--color-accent)]" />
              Arabic Ayah Audio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {audioUrls.arabic ? (
              <>
                <audio
                  controls
                  controlsList="nodownload"
                  preload="none"
                  className="w-full"
                >
                  <source src={audioUrls.arabic} />
                </audio>
                <AuthDownloadLink
                  href={buildAyahAudioDownloadUrl(
                    surah.id,
                    ayahNumber,
                    'arabic'
                  )}
                  fileName={`surah-${surah.id}-ayah-${ayahNumber}-arabic-audio`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-soft)]"
                >
                  <Download className="size-4" />
                  Download Arabic Audio
                </AuthDownloadLink>
              </>
            ) : (
              <p className="text-sm text-[var(--color-muted-text)]">Audio unavailable.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <Headphones className="size-5 text-[var(--color-info)]" />
              Urdu Ayah Audio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {audioUrls.urdu ? (
              <>
                <audio
                  controls
                  controlsList="nodownload"
                  preload="none"
                  className="w-full"
                >
                  <source src={audioUrls.urdu} />
                </audio>
                <AuthDownloadLink
                  href={buildAyahAudioDownloadUrl(
                    surah.id,
                    ayahNumber,
                    'urdu'
                  )}
                  fileName={`surah-${surah.id}-ayah-${ayahNumber}-urdu-audio`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-soft)]"
                >
                  <Download className="size-4" />
                  Download Urdu Audio
                </AuthDownloadLink>
              </>
            ) : (
              <p className="text-sm text-[var(--color-muted-text)]">Audio unavailable.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-display text-2xl text-[var(--color-heading)]">Urdu Tafseer</h2>
        {tafsir ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <p className="text-sm leading-relaxed text-[var(--color-text)]" lang="ur" dir="rtl">
                {tafsirSnippet}
                {tafsirSnippet && tafsirSnippet.length >= 280 ? '...' : ''}
              </p>
              <Link
                href={tafsirPath}
                prefetch={false}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-soft)]"
              >
                <FileText className="size-4" />
                Open Complete Urdu Tafseer
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-5 text-sm text-[var(--color-muted-text)]">
              Tafseer is not available for this ayah yet.
            </CardContent>
          </Card>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {prevAyahPath ? (
            <Link
              href={prevAyahPath}
              prefetch={false}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:border-[var(--color-accent-soft)]"
            >
              <ChevronLeft className="size-4" />
              Previous Ayah
            </Link>
          ) : null}
          {nextAyahPath ? (
            <Link
              href={nextAyahPath}
              prefetch={false}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:border-[var(--color-accent-soft)]"
            >
              Next Ayah
              <ChevronRight className="size-4" />
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={surahPath}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:border-[var(--color-accent-soft)]"
          >
            Back to Surah
          </Link>
          {canOpenTafsir ? (
            <Link
              href={tafsirPath}
              prefetch={false}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:border-[var(--color-accent-soft)]"
            >
              Tafseer Page
            </Link>
          ) : (
            <span className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted-text)]">
              Tafseer unavailable
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
