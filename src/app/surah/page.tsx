import type { Metadata } from 'next';

import { Badge } from '@/components/ui/badge';
import BreadcrumbNav from '@/components/ui/breadcrumb-nav';
import StickyScrollNav from '@/components/ui/StickyScrollNav';
import { getAllSurahs } from '@/lib/quran-index';
import { buildBreadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';
import { GENERATED_SURAH_KEYWORDS, MASTER_SEO_KEYWORDS } from '@/lib/seo-keywords';
import SurahIndexClient from '@/components/quran/SurahIndexClient';
import { SurhasListProvider } from '@/context/SurhasListProvider';

export const metadata: Metadata = buildPageMetadata({
  title: 'Surah Index – Read All 114 Surahs with Arabic Text & Urdu Translation',
  description:
    'Browse all 114 surahs of the Quran with Arabic text, Urdu and English translation, ayah links, tafseer access, recitation audio, bookmarks, and likes. Find popular surahs like Yaseen, Rahman, Kahf, Mulk, Waqiah, and more.',
  path: '/surah',
  ogType: 'website',
  imageUrl: '/og?kind=surah-index',
  keywords: Array.from(
    new Set([
      ...GENERATED_SURAH_KEYWORDS.slice(0, 32),
      ...MASTER_SEO_KEYWORDS.slice(0, 18),
    ])
  ),
});

export default function SurahIndexPage() {
  const allSurahs = getAllSurahs();

  const breadcrumbs = buildBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: 'Surah Index', item: '/surah' },
  ]);

  return (
    <div className="pb-20 pt-8 md:pt-12" data-slot="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <section className="mb-10">
        <BreadcrumbNav
          items={[
            { label: 'Home', href: '/' },
            { label: 'Surah Index', href: '/surah' },
          ]}
          includeSchema={false}
        />

        {/* Header Section with Enhanced Design */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Badge className="bg-gradient-to-r text-white from-[var(--color-accent)] to-[var(--color-accent-soft)]">
              Read al Quran
            </Badge>
            <Badge variant="secondary" className="text-xs">
              114 Surahs
            </Badge>
          </div>

          <h1 className="font-display text-5xl md:text-6xl font-bold text-[var(--color-heading)] mb-4">
            Surah Index
          </h1>
          
          <p className="text-base md:text-lg leading-relaxed text-[var(--color-muted-text)] max-w-2xl">
            Complete collection of all 114 surahs with Arabic text, Urdu & English translations, audio recitations, tafseer, and more.
          </p>
        </div>

        {/* Dynamic client-side search and filters */}
        <SurhasListProvider>
          <SurahIndexClient initialSurahs={allSurahs} />
        </SurhasListProvider>
      </section>

      <StickyScrollNav />
    </div>
  );
}
