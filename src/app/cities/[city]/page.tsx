import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { buildCityPageSchema, buildPageMetadata } from '@/lib/seo';
import { getCityBySlug, getAllCitySlugs } from '@/lib/islamic-cities';
import { CITY_KEYWORDS, GENERATED_CITY_KEYWORDS } from '@/lib/seo-keywords';

interface CityPageProps {
  params: Promise<{ city: string }>;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return {};

  const keywords = Array.from(
    new Set([
      ...(CITY_KEYWORDS[slug as keyof typeof CITY_KEYWORDS] || []),
      ...GENERATED_CITY_KEYWORDS.filter((keyword) => keyword.includes(slug)),
      `read quran ${city.name.toLowerCase()}`,
      `quran online ${city.nameUrdu}`,
      `نماز کے اوقات ${city.nameUrdu}`,
    ])
  );

  return buildPageMetadata({
    title: `Read Quran Online in ${city.name} — ${city.nameUrdu} | Read al Quran Pakistan`,
    description: `Read al Quran available in ${city.name} (${city.nameUrdu}). Free Quran with Urdu tarjuma, ayah-wise tafseer, audio tilawat, and prayer times for ${city.province}, Pakistan. ${city.localContext.slice(0, 80)}…`,
    path: `/cities/${slug}`,
    keywords,
    imageUrl: '/og?kind=surah-index',
  });
}

export default async function CityPage({ params }: CityPageProps) {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  const citySchema = buildCityPageSchema(city.name, city.country, slug);

  const features = [
    { icon: '📖', title: 'Free', description: 'Completely free Quran app' },
    { icon: '🎧', title: 'Audio', description: 'Listen to recitations' },
    { icon: '🔤', title: 'Tafseer', description: 'Urdu translation & tafseer' },
  ];

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-soft)]">
            Local Reading · Pakistan
          </p>
          <h1 className="mb-2 font-display text-4xl font-bold text-[var(--color-heading)] sm:text-5xl">
            Read al Quran in {city.name}
          </h1>
          <p className="urdu-font mb-4 text-2xl text-[var(--color-accent-soft)]" dir="rtl" lang="ur">
            {city.nameUrdu} میں قرآن آن لائن پڑھیں
          </p>
          <p className="mb-4 text-lg text-[var(--color-muted-text)] sm:text-xl">
            Free Quran reader for {city.population} in {city.name}, {city.province}
          </p>
          <p className="mb-10 max-w-2xl text-sm leading-relaxed text-[var(--color-muted-text)]">
            {city.localContext}
          </p>

          <div className="mb-10 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)]"
              >
                <h3 className="mb-2 text-lg font-semibold text-[var(--color-accent-soft)]">
                  {feature.icon} {feature.title}
                </h3>
                <p className="text-sm text-[var(--color-muted-text)]">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] px-8 py-3 font-bold text-[var(--color-accent-foreground)] shadow-[0_4px_14px_-6px_color-mix(in_oklab,var(--color-accent),transparent_30%)] transition hover:brightness-110"
            >
              Open Read al Quran
            </Link>
            <Link
              href="/surah"
              className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-3 font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)]"
            >
              Browse Surahs
            </Link>
            <Link
              href={`/prayer-times/${city.slug}`}
              className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-3 font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)]"
            >
              {city.name} Prayer Times
            </Link>
          </div>
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(citySchema) }} />
    </main>
  );
}

export function generateStaticParams() {
  return getAllCitySlugs().map((city) => ({ city }));
}
