import { serializeJsonLd } from '@/lib/seo/structured-data';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import IslamicPageHeader from '@/components/islamic-tools/islamic-page-header';
import MosqueFinderClient from '@/components/mosque-finder/mosque-finder-client';
import CityGrid from '@/components/islamic-tools/city-grid';
import { getCityBySlug, getAllCitySlugs } from '@/lib/islamic-cities';
import {
  buildMosqueFinderMetadata,
  buildMosqueFinderFaq,
  buildIslamicToolsBreadcrumb,
  getMosqueFinderFaqItems,
} from '@/lib/islamic-tools-seo';

interface PageProps {
  params: Promise<{ city: string }>;
}

export const dynamicParams = true;

import { POPULAR_CITY_SLUGS } from '@/lib/ssg-config';

export async function generateStaticParams() {
  return POPULAR_CITY_SLUGS.map((city) => ({ city }));
}

export async function generateMetadata({ params }: PageProps) {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return {};
  return buildMosqueFinderMetadata(city.name);
}

export default async function CityMosqueFinderPage({ params }: PageProps) {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  const breadcrumb = buildIslamicToolsBreadcrumb([
    { name: 'Mosque Finder', path: '/mosque-finder' },
    { name: `Mosques in ${city.name}`, path: `/mosque-finder/${city.slug}` },
  ]);
  const faqItems = getMosqueFinderFaqItems(city.name);
  const faq = buildMosqueFinderFaq(city.name);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
      <IslamicPageHeader
        badge="Mosque Finder"
        badgeSecondary={city.province}
        title={`Mosques in ${city.name}`}
        titleUrdu={`${city.nameUrdu} میں مساجد`}
        description={`Find mosques and masjids near ${city.name}, ${city.province}. ${city.localContext} Notable mosques: ${city.notableMosques.slice(0, 3).join(', ')}.`}
        meta={
          <Link
            href={`/prayer-times/${city.slug}`}
            className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-sm font-semibold transition hover:border-[var(--color-accent-soft)]"
          >
            {city.name} Prayer Times →
          </Link>
        }
      />

      <MosqueFinderClient
        defaultLat={city.latitude}
        defaultLon={city.longitude}
        cityName={city.name}
      />

      <section className="mt-10">
        <CityGrid basePath="/mosque-finder" label="Other Cities" />
      </section>

      <section className="mt-10 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 font-display text-xl font-semibold text-[var(--color-heading)]">
          Mosques in {city.name} FAQ
        </h2>
        <div className="space-y-3">
          {faqItems.map((item) => (
            <details
              key={item.question}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4"
            >
              <summary className="cursor-pointer font-semibold text-[var(--color-heading)]">
                {item.question}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-text)]">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faq) }} />
    </div>
  );
}
