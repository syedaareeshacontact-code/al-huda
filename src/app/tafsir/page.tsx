import { serializeJsonLd } from '@/lib/seo/structured-data';
import type { Metadata } from 'next';

import { Badge } from '@/components/ui/badge';
import BreadcrumbNav from '@/components/ui/breadcrumb-nav';
import StickyScrollNav from '@/components/ui/StickyScrollNav';
import { getAllSurahs } from '@/lib/quran-index';
import { getTafsirAyahNumbersBySurah } from '@/lib/tafsir-index';
import { buildBreadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';
import TafsirIndexClient from '@/components/tafsir/TafsirIndexClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Urdu Tafseer Index',
  description:
    'Find available Urdu tafseer by Surah and Ayah. Each commentary page includes the verse, translations and the source returned by the provider.',
  path: '/tafsir',
  ogType: 'website',
  imageUrl: '/og?kind=tafsir-index',
});

export default function TafsirIndexPage() {
  const allSurahs = getAllSurahs();

  const surahsWithTafseer = allSurahs.map((surah) => {
    const tafseerAyahs = getTafsirAyahNumbersBySurah(surah.id);
    return {
      ...surah,
      tafseerAyahs: tafseerAyahs.slice(0, 10),
      tafseerAyahCount: tafseerAyahs.length,
    };
  });

  const breadcrumbs = buildBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: 'Tafseer Index', item: '/tafsir' },
  ]);

  return (
    <div className="pb-20 pt-8 md:pt-12" data-slot="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }}
      />
      <section className="mb-10 animate-fade-up">
        <BreadcrumbNav
          items={[
            { label: 'Home', href: '/' },
            { label: 'Tafseer Index', href: '/tafsir' },
          ]}
          includeSchema={false}
        />

        {/* Header Section */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Badge className="bg-gradient-to-r text-white from-[var(--color-accent)] to-[var(--color-accent-soft)]">
              Read al Quran
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Urdu Tafseer
            </Badge>
          </div>

          <h1 className="font-display text-5xl md:text-6xl font-bold bg-gradient-to-r from-[var(--color-heading)] to-[var(--color-accent)] bg-clip-text text-transparent mb-4">
            Tafseer Index
          </h1>

          <p className="text-base md:text-lg leading-relaxed text-[var(--color-muted-text)] max-w-2xl">
            Browse available Urdu tafseer by Surah. Each entry links to the commentary and its source.
          </p>
        </div>

        {/* Dynamic client-side search and filters */}
        <TafsirIndexClient
          initialSurahs={surahsWithTafseer}
        />
      </section>

      <StickyScrollNav />
    </div>
  );
}
