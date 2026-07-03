import Link from 'next/link';
import IslamicPageHeader from '@/components/islamic-tools/islamic-page-header';
import { DuaCategoryGrid } from '@/components/duas/dua-card';
import { getAllDuasOverview } from '@/lib/ummah-api';
import {
  buildDuasMetadata,
  buildDuasFaq,
  buildIslamicToolsBreadcrumb,
} from '@/lib/islamic-tools-seo';

export const revalidate = 86400;

export const metadata = buildDuasMetadata();

export default async function DuasPage() {
  const { total, categories } = await getAllDuasOverview();
  const breadcrumb = buildIslamicToolsBreadcrumb([{ name: 'Duas', path: '/duas' }]);
  const faq = buildDuasFaq();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
      <IslamicPageHeader
        badge="Duas & Supplications"
        badgeSecondary={`${total} Duas`}
        title="Islamic Duas & Azkar"
        titleUrdu="اسلامی دعائیں"
        description="126 authentic duas and supplications from the Quran and Sunnah across 27 categories. Arabic text, transliteration, and English translation."
        meta={
          <div className="flex flex-wrap gap-3">
            <Link href="/azkar" className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-sm font-semibold transition hover:border-[var(--color-accent-soft)]">
              Morning & Evening Azkar →
            </Link>
            <Link href="/99-names-of-allah" className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-sm font-semibold transition hover:border-[var(--color-accent-soft)]">
              99 Names of Allah →
            </Link>
          </div>
        }
      />

      <DuaCategoryGrid categories={categories} />

      <section className="mt-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 font-display text-xl font-semibold text-[var(--color-heading)]">
          About Islamic Duas
        </h2>
        <p className="text-sm leading-relaxed text-[var(--color-muted-text)]">
          Duas (supplications) are a fundamental part of a Muslim&apos;s daily life. The Prophet Muhammad (ﷺ) taught specific duas for every occasion — waking up, eating, travelling, and facing hardship. All duas on this page are sourced from authentic hadith collections including Sahih Bukhari, Sahih Muslim, Abu Dawud, and others.
        </p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
    </div>
  );
}
