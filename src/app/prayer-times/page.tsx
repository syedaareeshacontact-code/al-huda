import Link from 'next/link';
import IslamicPageHeader from '@/components/islamic-tools/islamic-page-header';
import CityGrid from '@/components/islamic-tools/city-grid';
import PrayerTimesDisplay from '@/components/prayer-times/prayer-times-display';
import QiblaCompass from '@/components/prayer-times/qibla-compass';
import { getCurrentHijriDate } from '@/lib/aladhan-api';
import { getPrayerTimesByCity } from '@/lib/aladhan-api';
import {
  buildIslamicToolsBreadcrumb,
  buildPrayerTimesMetadata,
  PRAYER_TIMES_FAQ_STATIC,
  buildPrayerTimesFaq,
  buildWebApplicationJsonLd,
} from '@/lib/islamic-tools-seo';

export const revalidate = 3600;

export const metadata = buildPrayerTimesMetadata();

export default async function PrayerTimesPage() {
  const [hijriData, lahoreTimings] = await Promise.all([
    getCurrentHijriDate(),
    getPrayerTimesByCity('Lahore', 'Pakistan'),
  ]);

  const hijriStr = `${hijriData.hijri.day} ${hijriData.hijri.month.en} ${hijriData.hijri.year} AH`;
  const breadcrumb = buildIslamicToolsBreadcrumb([{ name: 'Prayer Times', path: '/prayer-times' }]);
  const faq = buildPrayerTimesFaq('Pakistan');
  const webApp = buildWebApplicationJsonLd({
    name: 'Prayer Times Pakistan',
    description: 'Free Islamic prayer times for Pakistani cities with Qibla direction and Hijri calendar',
    url: '/prayer-times',
    applicationCategory: 'LifestyleApplication',
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
      <IslamicPageHeader
        badge="Prayer Times"
        badgeSecondary="Aladhan API"
        title="Prayer Times Pakistan"
        titleUrdu="نماز کے اوقات"
        description="Accurate namaz timings for 35+ Pakistani cities. Fajr, Dhuhr, Asr, Maghrib & Isha with Qibla direction and Hijri calendar — updated daily."
        meta={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/prayer-times/lahore"
              className="inline-flex items-center rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] px-5 py-2 text-sm font-bold text-[var(--color-accent-foreground)] transition hover:brightness-110"
            >
              Lahore Timings →
            </Link>
            <Link
              href="/mosque-finder"
              className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-sm font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)]"
            >
              Find Nearby Mosque
            </Link>
          </div>
        }
      />

      <section className="mb-12">
        <h2 className="mb-6 font-display text-2xl font-semibold text-[var(--color-heading)]">
          Today&apos;s Timings — Lahore (Sample)
        </h2>
        <PrayerTimesDisplay
          timings={lahoreTimings.timings}
          cityName="Lahore"
          hijriDate={hijriStr}
          gregorianDate={hijriData.gregorian.date}
        />
      </section>

      <section className="mb-12 grid gap-8 md:grid-cols-2">
        <div className="lux-light-card lux-light-card-soft rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 font-display text-xl font-semibold text-[var(--color-heading)]">
            Qibla Direction — Lahore
          </h2>
          <QiblaCompass
            direction={260.37}
            latitude={31.5204}
            longitude={74.3587}
            cityName="Lahore"
          />
        </div>
        <div className="lux-light-card lux-light-card-soft rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 font-display text-xl font-semibold text-[var(--color-heading)]">
            Hijri Calendar
          </h2>
          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--color-surface-2)] p-5 text-center">
              <p className="text-sm text-[var(--color-muted-text)]">Today&apos;s Islamic Date</p>
              <p className="urdu-font mt-2 text-3xl font-bold text-[var(--color-accent-soft)]" dir="rtl">
                {hijriData.hijri.day} {hijriData.hijri.month.ar} {hijriData.hijri.year}
              </p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-heading)]">
                {hijriData.hijri.day} {hijriData.hijri.month.en} {hijriData.hijri.year} AH
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted-text)]">
                {hijriData.hijri.weekday.en} · {hijriData.gregorian.date}
              </p>
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-muted-text)]">
              The Hijri calendar is based on the Umm al-Qura method. Local moon-sighting committees in Pakistan may announce dates one day differently for Ramadan and Eid.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <CityGrid basePath="/prayer-times" label="Namaz Timings by City" />
      </section>

      <section className="mb-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
        <h2 className="mb-6 font-display text-2xl font-semibold text-[var(--color-heading)]">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {[...PRAYER_TIMES_FAQ_STATIC, ...[
            { question: 'Which cities are covered?', answer: 'We cover 35 major Pakistani cities including Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, and more.' },
          ]].map((item) => (
            <details
              key={item.question}
              className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4"
            >
              <summary className="cursor-pointer font-semibold text-[var(--color-heading)] marker:content-none">
                {item.question}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-text)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webApp) }} />
    </div>
  );
}
