import { serializeJsonLd } from '@/lib/seo/structured-data';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Download, FileText, Headphones } from 'lucide-react';

import BreadcrumbNav from '@/components/ui/breadcrumb-nav';
import { Badge } from '@/components/ui/badge';
import { getAllSurahs } from '@/lib/quran-index';
import { buildSurahDownloadPath } from '@/lib/surah-download';
import {
  getDownloadIndexDescription,
  getDownloadIndexTitle,
} from '@/lib/surah-download-seo';
import { buildDownloadIndexSchemas } from '@/lib/seo-schema';
import { buildPageMetadata } from '@/lib/seo';
import { getSurahUrduTitle } from '@/lib/surah-seo-content';

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: getDownloadIndexTitle(),
    description: getDownloadIndexDescription(),
    path: '/download',
    ogType: 'website',
    imageUrl: '/og?kind=surah-index',
  });
}

export default function DownloadIndexPage() {
  const surahs = getAllSurahs();
  const schemas = buildDownloadIndexSchemas(surahs.length);

  const popularIds = new Set([1, 2, 18, 36, 55, 67, 112, 113, 114]);
  const popularSurahs = surahs.filter((s) => popularIds.has(s.id));
  const otherSurahs = surahs.filter((s) => !popularIds.has(s.id));

  return (
    <div className="pb-20 pt-8" data-slot="page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schemas.breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schemas.webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schemas.itemList) }} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <BreadcrumbNav
          items={[
            { label: 'Home', href: '/' },
            { label: 'Quran Downloads', href: '/download' },
          ]}
          includeSchema={false}
        />

        <section className="mb-10">
          <Badge className="mb-3">Free · All 114 Surahs</Badge>
          <h1 className="font-display text-4xl font-bold text-[var(--color-heading)] sm:text-5xl">
            Download Quran PDF & Audio
          </h1>
          <p className="urdu-font mt-3 text-2xl text-[var(--color-accent-soft)]" dir="rtl" lang="ur">
            قرآن PDF اور آڈیو ڈاؤن لوڈ — عربی اور اردو
          </p>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--color-muted-text)]">
            Download any surah as a free PDF (Arabic-only or Arabic with Urdu tarjuma) or MP3/OGG audio
            (Arabic tilawat by Mishari al-Afasy and other reciters, plus Urdu translation audio). All 114
            surahs available. A free account is required to start a protected download.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <FileText className="mb-2 size-5 text-[var(--color-accent)]" />
              <p className="font-semibold text-[var(--color-heading)]">Arabic PDF</p>
              <p className="text-sm text-[var(--color-muted-text)]">Uthmani script, printable</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <FileText className="mb-2 size-5 text-[var(--color-accent)]" />
              <p className="font-semibold text-[var(--color-heading)]">Arabic + Urdu PDF</p>
              <p className="text-sm text-[var(--color-muted-text)]">With Fatah Jalandhari tarjuma</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <Headphones className="mb-2 size-5 text-[var(--color-accent)]" />
              <p className="font-semibold text-[var(--color-heading)]">Audio MP3 / OGG</p>
              <p className="text-sm text-[var(--color-muted-text)]">Arabic tilawat & Urdu audio</p>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 font-display text-2xl font-bold text-[var(--color-heading)]">
            Popular Surah Downloads
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {popularSurahs.map((surah) => (
              <Link
                key={surah.id}
                href={buildSurahDownloadPath(surah.id, surah.surahName)}
                className="group flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)]"
              >
                <div>
                  <p className="font-semibold text-[var(--color-heading)] group-hover:text-[var(--color-accent)]">
                    {surah.id}. {surah.surahName}
                  </p>
                  <p className="urdu-font text-xs text-[var(--color-muted-text)]" dir="rtl">
                    {getSurahUrduTitle(surah)}
                  </p>
                </div>
                <Download className="size-4 shrink-0 text-[var(--color-accent)] opacity-60 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 font-display text-2xl font-bold text-[var(--color-heading)]">
            All 114 Surahs — PDF & Audio Download
          </h2>
          <nav aria-label="All surah download links">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {otherSurahs.map((surah) => (
                <Link
                  key={surah.id}
                  href={buildSurahDownloadPath(surah.id, surah.surahName)}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm transition hover:border-[var(--color-accent-soft)]"
                >
                  <span className="font-medium text-[var(--color-heading)]">
                    {surah.id}. {surah.surahName}
                  </span>
                  <span className="text-xs text-[var(--color-muted-text)]">PDF · Audio</span>
                </Link>
              ))}
            </div>
          </nav>
        </section>
      </div>
    </div>
  );
}
