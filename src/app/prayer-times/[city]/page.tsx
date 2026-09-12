import { serializeJsonLd } from '@/lib/seo/structured-data';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import IslamicPageHeader from '@/components/islamic-tools/islamic-page-header';
import PrayerTimesDisplay from '@/components/prayer-times/prayer-times-display';
import PrayerDataUnavailable from '@/components/prayer-times/prayer-data-unavailable';
import QiblaCompass from '@/components/prayer-times/qibla-compass';
import CityGrid from '@/components/islamic-tools/city-grid';
import {
  getPrayerTimesByCity,
  getQiblaDirection,
  getMonthlyPrayerCalendar,
} from '@/lib/aladhan-api';
import { getCityBySlug, getAllCitySlugs, type IslamicCity } from '@/lib/islamic-cities';
import {
  buildIslamicToolsBreadcrumb,
  buildPrayerTimesMetadata,
  buildPrayerTimesJsonLd,
  buildPrayerTimesFaq,
  getPrayerTimesFaqItems,
} from '@/lib/islamic-tools-seo';

export const revalidate = 3600;

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
  return buildPrayerTimesMetadata(city.name, city.nameUrdu);
}

export default async function CityPrayerTimesPage({ params }: PageProps) {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  const now = new Date();

  const [prayerData, qiblaData] = await Promise.all([
    getPrayerTimesByCity(city.name, city.country),
    getQiblaDirection(city.latitude, city.longitude),
  ]);

  let monthlyData: Awaited<ReturnType<typeof getMonthlyPrayerCalendar>> = [];
  try {
    monthlyData = await getMonthlyPrayerCalendar(city.name, city.country, now.getFullYear(), now.getMonth() + 1);
  } catch {
    // Monthly calendar is optional — page still renders daily timings
  }

  const hijriStr = prayerData.available
    ? `${prayerData.date.hijri.day} ${prayerData.date.hijri.month.en} ${prayerData.date.hijri.year} AH`
    : '';
  const breadcrumb = buildIslamicToolsBreadcrumb([
    { name: 'Prayer Times', path: '/prayer-times' },
    { name: `${city.name} Timings`, path: `/prayer-times/${city.slug}` },
  ]);
  const faqItems = getPrayerTimesFaqItems(city.name);
  const faq = buildPrayerTimesFaq(city.name);
  const prayerJsonLd = prayerData.available
    ? buildPrayerTimesJsonLd(
        city.name,
        prayerData.timings as unknown as Record<string, string>,
        prayerData.requestedDate
      )
    : null;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
      <IslamicPageHeader
        badge="Prayer Times"
        badgeSecondary={city.province}
        title={`${city.name} Namaz Timings`}
        titleUrdu={`نماز کے اوقات ${city.nameUrdu}`}
        description={`Today's calculated prayer times for ${city.name}, ${city.province}, verified against the requested date. Compare with your local mosque where schedules differ. ${city.localContext}`}
        meta={
          <Link
            href="/mosque-finder"
            className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-sm font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)]"
          >
            Find Mosques in {city.name} →
          </Link>
        }
      />

      {prayerData.available ? (
        <PrayerTimesDisplay
          timings={prayerData.timings}
          cityName={city.name}
          hijriDate={hijriStr}
          gregorianDate={prayerData.date.readable}
        />
      ) : (
        <PrayerDataUnavailable cityName={city.name} />
      )}

      <section className="mt-10 grid gap-8 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 font-display text-xl font-semibold text-[var(--color-heading)]">
            Qibla Direction — {city.name}
          </h2>
          <QiblaCompass
            direction={qiblaData.direction}
            latitude={city.latitude}
            longitude={city.longitude}
            cityName={city.name}
          />
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 font-display text-xl font-semibold text-[var(--color-heading)]">
            About {city.name}
          </h2>
          <CityInfoPanel city={city} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-semibold text-[var(--color-heading)]">
          {city.name} Monthly Prayer Timetable — {now.toLocaleString('en', { month: 'long', year: 'numeric' })}
        </h2>
        <MonthlyTimetable data={monthlyData} cityName={city.name} />
      </section>

      <section className="mt-10">
        <CityGrid basePath="/prayer-times" label="Other Cities" />
      </section>

      <section className="mt-10 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 font-display text-xl font-semibold text-[var(--color-heading)]">
          {city.name} Prayer Times FAQ
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
      {prayerJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(prayerJsonLd) }} />
      ) : null}
    </div>
  );
}

function CityInfoPanel({ city }: { city: IslamicCity }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-[var(--color-muted-text)]">
      <p>{city.localContext}</p>
      <div>
        <p className="font-semibold text-[var(--color-heading)]">Notable Mosques</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {city.notableMosques.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-semibold text-[var(--color-heading)]">Calculation Method</p>
        <p className="mt-1">{city.prayerMethodNote}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
          <p className="text-xs text-[var(--color-muted-text)]">Province</p>
          <p className="font-semibold text-[var(--color-heading)]">{city.province}</p>
        </div>
        <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
          <p className="text-xs text-[var(--color-muted-text)]">Population</p>
          <p className="font-semibold text-[var(--color-heading)]">{city.population}</p>
        </div>
      </div>
    </div>
  );
}

function MonthlyTimetable({
  data,
  cityName,
}: {
  data: Awaited<ReturnType<typeof getMonthlyPrayerCalendar>>;
  cityName: string;
}) {
  if (data.length === 0) {
    return (
      <p className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-muted-text)]">
        The monthly timetable is temporarily unavailable. No estimated timings are shown.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
      <table className="w-full min-w-[600px] text-sm">
        <caption className="sr-only">{cityName} monthly prayer timetable</caption>
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
            {['Date', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((h) => (
              <th key={h} className="px-3 py-3 text-left font-semibold text-[var(--color-heading)]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((day, i) => (
            <tr
              key={i}
              className="border-b border-[var(--color-border)] transition hover:bg-[var(--color-surface-2)]"
            >
              <td className="px-3 py-2 font-medium text-[var(--color-heading)]">
                {day.date.gregorian.date.split('-')[0]}
              </td>
              <td className="px-3 py-2 tabular-nums">{day.timings.Fajr}</td>
              <td className="px-3 py-2 tabular-nums">{day.timings.Dhuhr}</td>
              <td className="px-3 py-2 tabular-nums">{day.timings.Asr}</td>
              <td className="px-3 py-2 tabular-nums">{day.timings.Maghrib}</td>
              <td className="px-3 py-2 tabular-nums">{day.timings.Isha}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
