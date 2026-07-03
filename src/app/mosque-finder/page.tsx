import Link from 'next/link';
import IslamicPageHeader from '@/components/islamic-tools/islamic-page-header';
import CityGrid from '@/components/islamic-tools/city-grid';
import MosqueFinderClient from '@/components/mosque-finder/mosque-finder-client';
import {
  buildMosqueFinderMetadata,
  buildMosqueFinderFaq,
  buildIslamicToolsBreadcrumb,
} from '@/lib/islamic-tools-seo';

export const metadata = buildMosqueFinderMetadata();

export default function MosqueFinderPage() {
  const breadcrumb = buildIslamicToolsBreadcrumb([
    { name: 'Mosque Finder', path: '/mosque-finder' },
  ]);
  const faq = buildMosqueFinderFaq();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
      <IslamicPageHeader
        badge="Mosque Finder"
        badgeSecondary="OpenStreetMap"
        title="Find Nearby Mosques & Masjids"
        titleUrdu="قریبی مسجد تلاش کریں"
        description="Locate mosques and masjids near you in Pakistan. Free mosque finder powered by OpenStreetMap community data with directions and distance."
        meta={
          <Link
            href="/prayer-times"
            className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-sm font-semibold transition hover:border-[var(--color-accent-soft)]"
          >
            Prayer Times →
          </Link>
        }
      />

      <MosqueFinderClient />

      <section className="mt-12">
        <CityGrid basePath="/mosque-finder" label="Find Mosques by City" />
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
    </div>
  );
}
