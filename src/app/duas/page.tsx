import Link from 'next/link';
import IslamicPageHeader from '@/components/islamic-tools/islamic-page-header';
import { DuaCategoryGrid } from '@/components/duas/dua-card';
import PublicContentState from '@/components/errors/public-content-state';
import { getAllDuasOverview } from '@/lib/ummah-api';
import {
  buildDuasMetadata,
  buildDuasFaq,
  buildIslamicToolsBreadcrumb,
  getDuasFaqItems,
} from '@/lib/islamic-tools-seo';

export const revalidate = 86400;

export async function generateMetadata() {
  try {
    const { total, categories } = await getAllDuasOverview();
    return buildDuasMetadata(undefined, undefined, total > 0 && categories.length > 0);
  } catch {
    return buildDuasMetadata(undefined, undefined, false);
  }
}

export default async function DuasPage() {
  let overview: Awaited<ReturnType<typeof getAllDuasOverview>>;
  try {
    overview = await getAllDuasOverview();
  } catch {
    return (
      <PublicContentState
        title="Duas are temporarily unavailable"
        description="The duas data provider could not be reached. Please try this directory again shortly; no incomplete page will be indexed."
        primaryHref="/duas"
        primaryLabel="Try duas again"
      />
    );
  }

  const { total, categories } = overview;
  if (total < 1 || categories.length === 0) {
    return (
      <PublicContentState
        title="Duas are temporarily unavailable"
        description="The provider returned no dua categories, so this incomplete version is not being shown or indexed."
        primaryHref="/duas"
        primaryLabel="Try duas again"
      />
    );
  }
  const breadcrumb = buildIslamicToolsBreadcrumb([{ name: 'Duas', path: '/duas' }]);
  const faqItems = getDuasFaqItems();
  const faq = buildDuasFaq();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
      <IslamicPageHeader
        badge="Duas & Supplications"
        badgeSecondary={`${total} Duas`}
        title="Islamic Duas & Azkar"
        titleUrdu="اسلامی دعائیں"
        description={`Browse ${total} duas and supplications across ${categories.length} categories with Arabic text, transliteration, English translation, and source references where supplied.`}
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
          Duas (supplications) are a fundamental part of a Muslim&apos;s daily life. This directory
          organizes prayers for occasions such as waking, eating, travelling, and hardship.
          Check the source reference shown with an individual dua where the provider supplies one.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 font-display text-xl font-semibold text-[var(--color-heading)]">
          Duas FAQ
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

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
    </div>
  );
}
