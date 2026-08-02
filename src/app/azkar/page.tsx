import Link from 'next/link';
import IslamicPageHeader from '@/components/islamic-tools/islamic-page-header';
import DuaCard from '@/components/duas/dua-card';
import PublicContentState from '@/components/errors/public-content-state';
import { getDuasByCategory, AZKAR_CATEGORY_IDS } from '@/lib/ummah-api';
import {
  buildAzkarMetadata,
  buildIslamicToolsBreadcrumb,
} from '@/lib/islamic-tools-seo';

export const revalidate = 86400;

type AzkarSection = Awaited<ReturnType<typeof getDuasByCategory>>;

async function getAzkarSections() {
  const results = await Promise.all(
    AZKAR_CATEGORY_IDS.slice(0, 4).map(async (id) => {
      try {
        return await getDuasByCategory(id);
      } catch {
        return null;
      }
    })
  );

  return results.filter(
    (section): section is AzkarSection => Boolean(section && section.duas.length > 0)
  );
}

export async function generateMetadata() {
  const sections = await getAzkarSections();
  return buildAzkarMetadata(sections.length > 0);
}

export default async function AzkarPage() {
  const validData = await getAzkarSections();
  if (validData.length === 0) {
    return (
      <PublicContentState
        title="Azkar are temporarily unavailable"
        description="The daily remembrance data could not be loaded. Please retry shortly; an empty content page will not be indexed."
        primaryHref="/azkar"
        primaryLabel="Try azkar again"
      />
    );
  }
  const breadcrumb = buildIslamicToolsBreadcrumb([{ name: 'Azkar', path: '/azkar' }]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      <IslamicPageHeader
        badge="Daily Azkar"
        badgeSecondary="Adhkar"
        title="Morning & Evening Azkar"
        titleUrdu="اذکارِ صبح و شام"
        description="Protect yourself with daily morning and evening remembrances (adhkar) from the Sunnah. Recite these after Fajr and before Maghrib for spiritual protection."
        meta={
          <div className="flex flex-wrap gap-3">
            <Link href="/duas/morning" className="inline-flex items-center rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] px-5 py-2 text-sm font-bold text-[var(--color-accent-foreground)] transition hover:brightness-110">
              All Morning Azkar →
            </Link>
            <Link href="/duas/evening" className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-sm font-semibold transition hover:border-[var(--color-accent-soft)]">
              All Evening Azkar →
            </Link>
          </div>
        }
      />

      {validData.map((section) =>
        (
          <section key={section.category.id} className="mb-10">
            <h2 className="mb-4 font-display text-xl font-semibold text-[var(--color-heading)]">
              {section.category.name}
            </h2>
            <div className="space-y-4">
              {section.duas.map((dua) => (
                <DuaCard key={dua.id} dua={dua} />
              ))}
            </div>
            <Link
              href={`/duas/${section.category.id}`}
              className="mt-4 inline-block text-sm font-semibold text-[var(--color-accent-soft)] hover:underline"
            >
              View all {section.category.count} →
            </Link>
          </section>
        )
      )}

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-[var(--color-heading)]">
          Benefits of Daily Azkar
        </h2>
        <p className="text-sm leading-relaxed text-[var(--color-muted-text)]">
          The Prophet (ﷺ) said: &quot;Whoever recites the morning and evening adhkar, they will suffice him against all harm.&quot; (Abu Dawud) Morning azkar are recited after Fajr prayer until sunrise, and evening azkar after Asr until Maghrib.
        </p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </div>
  );
}
