import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

import AyahDetailOverlay from '@/components/quran/ayah-detail-overlay';
import { AyahPopupLinkScope } from '@/components/quran/ayah-popup-navigation';
import BreadcrumbNav from '@/components/ui/breadcrumb-nav';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StickyScrollNav from '@/components/ui/StickyScrollNav';
import { resolveSurahParam, getAllSurahs } from '@/lib/quran-index';
import {
  buildSurahPath,
  buildTafsirPopupPath,
  buildTafsirSurahPath,
} from '@/lib/quran-routing';
import { getAllTafsirSurahStaticParams } from '@/lib/quran-static-params';
import { buildTafsirPageKeywords } from '@/lib/seo-keywords';
import { buildPageMetadata } from '@/lib/seo';
import { buildTafsirSurahPageSchemas } from '@/lib/seo-schema';
import {
  getPrevNextSurah,
  getRelatedLinks,
  getSurahUrduTitle,
  getTafsirSurahIntro,
  getTafsirSurahMetaDescription,
  getTafsirSurahMetaTitle,
} from '@/lib/surah-seo-content';
import { getTafsirAyahNumbersBySurah } from '@/lib/tafsir-index';

interface TafsirSurahPageProps {
  params: Promise<{ surah: string }>;
}

export const dynamic = 'force-static';
export const revalidate = false;
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllTafsirSurahStaticParams();
}

export async function generateMetadata({ params }: TafsirSurahPageProps): Promise<Metadata> {
  const { surah: surahParam } = await params;
  const resolved = resolveSurahParam(surahParam);

  if (!resolved) {
    return buildPageMetadata({
      title: 'Tafseer Not Found',
      description: 'Requested tafseer page was not found.',
      path: '/tafsir',
      index: false,
    });
  }

  const surah = resolved.surah;
  const ayahNumbers = getTafsirAyahNumbersBySurah(surah.id);

  if (ayahNumbers.length === 0) {
    return buildPageMetadata({
      title: `Tafseer ${surah.surahName} Not Available`,
      description: 'Tafseer content is not available for this surah yet.',
      path: buildSurahPath(surah.id, surah.surahName),
      index: false,
    });
  }

  const canonicalPath = buildTafsirSurahPath(surah.id, surah.surahName);

  return buildPageMetadata({
    title: getTafsirSurahMetaTitle(surah),
    description: getTafsirSurahMetaDescription(surah, ayahNumbers.length),
    path: canonicalPath,
    ogType: 'article',
    imageUrl: `/og?kind=tafsir&surah=${surah.id}`,
    keywords: buildTafsirPageKeywords({
      surahId: surah.id,
      surahName: surah.surahName,
      ayahNumber: 1,
    }),
  });
}

export default async function TafsirSurahPage({ params }: TafsirSurahPageProps) {
  const { surah: surahParam } = await params;
  const resolved = resolveSurahParam(surahParam);

  if (!resolved) {
    notFound();
  }

  const { surah, isCanonicalSlug } = resolved;
  const ayahNumbers = getTafsirAyahNumbersBySurah(surah.id);

  if (ayahNumbers.length === 0) {
    notFound();
  }

  if (!isCanonicalSlug) {
    permanentRedirect(buildTafsirSurahPath(surah.id, surah.surahName));
  }

  const surahPath = buildSurahPath(surah.id, surah.surahName);
  const tafsirSurahPath = buildTafsirSurahPath(surah.id, surah.surahName);
  const intro = getTafsirSurahIntro(surah, ayahNumbers.length);
  const urduTitle = getSurahUrduTitle(surah);
  const allSurahs = getAllSurahs();
  const { prev, next } = getPrevNextSurah(surah.id, allSurahs);
  const relatedLinks = getRelatedLinks(surah);
  const schemas = buildTafsirSurahPageSchemas({ surah, intro, ayahNumbers });

  return (
    <div className="pb-16 pt-10" data-slot="page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.itemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.webPage) }} />

      <BreadcrumbNav
        items={[
          { label: 'Home', href: '/' },
          { label: 'Tafseer Index', href: '/tafsir' },
          { label: `Surah ${surah.surahName}`, href: surahPath },
          { label: 'Urdu Tafseer', href: tafsirSurahPath },
        ]}
        includeSchema={false}
      />

      <section className="mb-8">
        <Badge className="mb-2">Urdu Tafseer</Badge>
        <h1 className="font-display text-4xl text-[var(--color-heading)] sm:text-5xl">
          Surah {surah.surahName} — Complete Urdu Tafseer
        </h1>
        <p className="urdu-font mt-2 text-2xl text-[var(--color-accent-soft)]" dir="rtl" lang="ur">
          {urduTitle} — مکمل اردو تفسیر
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted-text)]">
          {surah.surahNameTranslation} · {ayahNumbers.length} ayahs with tafseer · {surah.revelationPlace}
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--color-muted-text)] sm:text-base">
          {intro}
        </p>
      </section>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-xl">
            <FileText className="size-5 text-[var(--color-accent)]" />
            Ayah-by-Ayah Urdu Tafseer — Surah {surah.surahName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <nav aria-label={`Tafseer links for Surah ${surah.surahName}`}>
            <AyahPopupLinkScope className="flex flex-wrap gap-2">
              {ayahNumbers.map((ayahNumber) => (
                <a
                  key={ayahNumber}
                  href={buildTafsirPopupPath(surah.id, surah.surahName, ayahNumber)}
                  className="inline-flex min-w-[4.5rem] items-center justify-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-accent)] transition hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)]"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {surah.id}:{ayahNumber}
                </a>
              ))}
            </AyahPopupLinkScope>
          </nav>
        </CardContent>
      </Card>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <Link
          href={surahPath}
          className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent-soft)]"
        >
          <BookOpen className="size-5 text-[var(--color-accent)]" />
          <div>
            <p className="font-semibold text-[var(--color-heading)]">Read Surah {surah.surahName}</p>
            <p className="text-xs text-[var(--color-muted-text)]">Arabic text, Urdu tarjuma & audio</p>
          </div>
        </Link>
        <Link
          href="/tafsir"
          className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent-soft)]"
        >
          <FileText className="size-5 text-[var(--color-accent)]" />
          <div>
            <p className="font-semibold text-[var(--color-heading)]">All Surahs Tafseer</p>
            <p className="text-xs text-[var(--color-muted-text)]">Browse tafseer index</p>
          </div>
        </Link>
      </section>

      <nav aria-label="Surah navigation" className="mb-8 flex flex-wrap items-center justify-between gap-3">
        {prev ? (
          <Link
            href={buildTafsirSurahPath(prev.id, prev.surahName)}
            prefetch={false}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--color-accent-soft)]"
          >
            <ChevronLeft className="h-4 w-4" />
            {prev.surahName} Tafseer
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={buildTafsirSurahPath(next.id, next.surahName)}
            prefetch={false}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--color-accent-soft)]"
          >
            {next.surahName} Tafseer
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <aside className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-text)]">
          Related Islamic Resources
        </h2>
        <div className="flex flex-wrap gap-2">
          {relatedLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </aside>

      <StickyScrollNav position="right" minScroll={0} compact />
      <Suspense fallback={null}>
        <AyahDetailOverlay
          mode="tafsir"
          surahId={surah.id}
          surahName={surah.surahName}
          surahArabicName={surah.surahNameArabic}
          totalAyahs={surah.totalAyah}
        />
      </Suspense>
    </div>
  );
}
