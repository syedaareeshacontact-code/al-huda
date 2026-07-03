import Link from 'next/link';
import IslamicPageHeader from '@/components/islamic-tools/islamic-page-header';
import NamesGrid from '@/components/duas/names-grid';
import { getAsmaUlHusna } from '@/lib/ummah-api';
import {
  build99NamesMetadata,
  buildIslamicToolsBreadcrumb,
} from '@/lib/islamic-tools-seo';

export const revalidate = 86400;

export const metadata = build99NamesMetadata();

export default async function NamesOfAllahPage() {
  const names = await getAsmaUlHusna();
  const breadcrumb = buildIslamicToolsBreadcrumb([
    { name: '99 Names of Allah', path: '/99-names-of-allah' },
  ]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
      <IslamicPageHeader
        badge="Asma ul Husna"
        badgeSecondary="99 Names"
        title="99 Names of Allah"
        titleUrdu="اللہ کے نام"
        description="Learn the 99 Beautiful Names of Allah (Asma ul Husna) with Arabic calligraphy, transliteration, English meaning, and detailed explanations."
        meta={
          <Link href="/duas" className="text-sm text-[var(--color-accent-soft)] hover:underline">
            ← Islamic Duas
          </Link>
        }
      />

      <NamesGrid names={names} />

      <section className="mt-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-[var(--color-heading)]">
          About Asma ul Husna
        </h2>
        <p className="text-sm leading-relaxed text-[var(--color-muted-text)]">
          Allah has ninety-nine names, one hundred minus one. Whoever memorises and understands them will enter Paradise. (Sahih Bukhari 6410) These names describe the attributes and qualities of Allah — His mercy, power, wisdom, and perfection. Reciting and reflecting on these names brings a believer closer to understanding their Creator.
        </p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </div>
  );
}
