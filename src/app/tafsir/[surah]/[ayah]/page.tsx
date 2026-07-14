import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Download, Headphones } from 'lucide-react';

import BreadcrumbNav from '@/components/ui/breadcrumb-nav';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AuthDownloadLink from '@/components/quran/auth-download-link';
import TafsirAyahBottomNav from '@/components/tafsir/TafsirAyahBottomNav';
import StickyScrollNav from '@/components/ui/StickyScrollNav';
import {
  getAyahAudioUrls,
  getAyahContent,
  getUrduTafsirByAyah,
  sanitizeTafsirHtml,
  stripHtml,
} from '@/lib/quran-server';
import { resolveSurahParam } from '@/lib/quran-index';
import { buildAyahPath, buildSurahPath, buildTafsirPath, buildTafsirSurahPath } from '@/lib/quran-routing';
import { getAllTafsirAyahStaticParams } from '@/lib/quran-static-params';
import { buildPageMetadata } from '@/lib/seo';
import { buildTafsirPageSchemas } from '@/lib/seo-schema';
import { getSurahUrduTitle } from '@/lib/surah-seo-content';

interface TafsirPageProps {
  params: Promise<{
    surah: string;
    ayah: string;
  }>;
}

export const dynamic = 'force-static';
export const revalidate = false;
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllTafsirAyahStaticParams();
}

function parseAyahNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function buildLightweightTafsirKeywords(surahId: number, surahName: string, ayahNumber: number) {
  const normalizedSurahName = surahName.toLowerCase();

  return [
    `tafseer ${surahId}:${ayahNumber}`,
    `tafsir ${surahId}:${ayahNumber}`,
    `urdu tafseer ${surahId}:${ayahNumber}`,
    `surah ${normalizedSurahName} ayah ${ayahNumber} tafseer`,
    `tafseer surah ${normalizedSurahName} ayah ${ayahNumber}`,
    `ayah ${surahId}:${ayahNumber} tafseer urdu`,
    `quran ${surahId}:${ayahNumber} explanation`,
    `surah ${normalizedSurahName} verse ${ayahNumber}`,
  ];
}

export async function generateMetadata({
  params,
}: TafsirPageProps): Promise<Metadata> {
  const { surah: surahParam, ayah: ayahParam } = await params;
  const resolved = resolveSurahParam(surahParam);
  const ayahNumber = parseAyahNumber(ayahParam);

  if (!resolved || !ayahNumber || ayahNumber > resolved.surah.totalAyah) {
    return buildPageMetadata({
      title: 'Tafseer Not Found',
      description: 'Requested tafseer page was not found.',
      path: '/surah',
      index: false,
    });
  }

  const surah = resolved.surah;
  const canonicalPath = buildTafsirPath(surah.id, surah.surahName, ayahNumber);
  const title = `Tafseer Ayah ${surah.id}:${ayahNumber} (${surah.surahName} / ${surah.surahNameArabic}) — اردو تفسیر، Arabic & English`;
  const description = `Read Urdu tafseer of Ayah ${surah.id}:${ayahNumber} from Surah ${surah.surahName}, with Arabic text, Urdu translation, English reference, and audio.`;

  return buildPageMetadata({
    title,
    description,
    path: canonicalPath,
    ogType: 'article',
    imageUrl: `/og?kind=tafsir&surah=${surah.id}&ayah=${ayahNumber}`,
    keywords: buildLightweightTafsirKeywords(surah.id, surah.surahName, ayahNumber),
  });
}

export default async function TafsirDetailPage({
  params,
}: TafsirPageProps) {
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
    permanentRedirect(buildTafsirPath(surah.id, surah.surahName, ayahNumber));
  }

  const [ayah, tafsir, audioUrls] = await Promise.all([
    getAyahContent(surah.id, ayahNumber),
    getUrduTafsirByAyah(surah.id, ayahNumber),
    getAyahAudioUrls(surah.id, ayahNumber),
  ]);

  if (!ayah || !tafsir) {
    notFound();
  }

  const safeTafsirHtml = sanitizeTafsirHtml(tafsir.textHtml);
  const surahPath = buildSurahPath(surah.id, surah.surahName);
  const tafsirSurahPath = buildTafsirSurahPath(surah.id, surah.surahName);
  const surahBreadcrumbLabel = `Surah ${surah.surahName}`;
  const ayahPath = buildAyahPath(surah.id, surah.surahName, ayahNumber);
  const canonicalPath = buildTafsirPath(surah.id, surah.surahName, ayahNumber);
  const prevTafsirPath = ayahNumber > 1 
    ? buildTafsirPath(surah.id, surah.surahName, ayahNumber - 1)
    : null;
  const nextTafsirPath = ayahNumber < surah.totalAyah
    ? buildTafsirPath(surah.id, surah.surahName, ayahNumber + 1)
    : null;

  const tafsirPlainText = stripHtml(tafsir.textHtml);
  const schemas = buildTafsirPageSchemas({
    surah,
    ayahNumber,
    tafsirText: tafsirPlainText,
  });

  const tafsirIntro = `Urdu tafseer of Ayah ${surah.id}:${ayahNumber} from ${getSurahUrduTitle(surah)} (Surah ${surah.surahName}). Read the complete commentary with Arabic ayah text, Urdu tarjuma, and English translation reference.`;

  const audioJsonLd = [
    audioUrls.arabic
      ? {
          '@context': 'https://schema.org',
          '@type': 'AudioObject',
          name: `Arabic Audio - Surah ${surah.id} Ayah ${ayahNumber}`,
          inLanguage: 'ar',
          contentUrl: audioUrls.arabic,
        }
      : null,
    audioUrls.urdu
      ? {
          '@context': 'https://schema.org',
          '@type': 'AudioObject',
          name: `Urdu Audio - Surah ${surah.id} Ayah ${ayahNumber}`,
          inLanguage: 'ur',
          contentUrl: audioUrls.urdu,
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="pb-28 pt-10" data-slot="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.article) }}
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
          { label: 'Tafseer Index', href: '/tafsir' },
          { label: surahBreadcrumbLabel, href: surahPath },
          { label: 'Urdu Tafseer', href: tafsirSurahPath },
          { label: `Ayah ${ayahNumber}`, href: ayahPath },
        ]}
        includeSchema={false}
      />

      <section className="mb-6">
        <Badge className="mb-2">Urdu Tafseer</Badge>
        <h1 className="font-display text-4xl text-[var(--color-heading)] sm:text-5xl">
          Tafseer of Ayah {surah.id}:{ayahNumber} • Surah {surah.surahName}
        </h1>
        <p className="urdu-font mt-2 text-xl text-[var(--color-accent-soft)]" dir="rtl" lang="ur">
          {getSurahUrduTitle(surah)} — تفسیر آیت {ayahNumber}
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--color-muted-text)]">
          {tafsirIntro}
        </p>
      </section>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl text-[var(--color-heading)]">
            Arabic + Urdu + English Reference
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <p lang="ar" dir="rtl" className="arabic-font arabic-mushaf text-[var(--color-heading)]">
            {ayah.arabicText}
          </p>
          <p lang="ur" dir="rtl" className="urdu-font text-right text-[var(--color-text)]">
            {ayah.urduTranslation}
          </p>
          <p lang="en" dir="ltr" className="text-left text-[var(--color-text)]">
            {ayah.englishTranslation || 'English translation unavailable.'}
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl text-[var(--color-heading)]">Urdu Tafseer</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div
            className="tafseer-rich urdu-font space-y-4 text-right text-[var(--color-text)]"
            lang="ur"
            dir="rtl"
            dangerouslySetInnerHTML={{ __html: safeTafsirHtml }}
          />
        </CardContent>
      </Card>

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <Headphones className="size-5 text-[var(--color-accent)]" />
              Arabic Audio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {audioUrls.arabic ? (
              <>
                <audio controls preload="none" className="w-full">
                  <source src={audioUrls.arabic} />
                </audio>
                <AuthDownloadLink
                  href={audioUrls.arabic}
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
              Urdu Audio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {audioUrls.urdu ? (
              <>
                <audio controls preload="none" className="w-full">
                  <source src={audioUrls.urdu} />
                </audio>
                <AuthDownloadLink
                  href={audioUrls.urdu}
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

      <TafsirAyahBottomNav
        ayahPath={ayahPath}
        tafsirSurahPath={tafsirSurahPath}
        surahPath={surahPath}
        surahName={surah.surahName}
        prevTafsirPath={prevTafsirPath}
        nextTafsirPath={nextTafsirPath}
      />
      <StickyScrollNav
        position="right"
        minScroll={0}
        compact
        bottomClassName="bottom-[4.75rem] right-2.5 sm:bottom-[5.25rem] sm:right-6"
      />
    </div>
  );
}
