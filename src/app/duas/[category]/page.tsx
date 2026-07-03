import Link from 'next/link';
import { notFound } from 'next/navigation';
import IslamicPageHeader from '@/components/islamic-tools/islamic-page-header';
import DuaCard from '@/components/duas/dua-card';
import { getDuasByCategory, getDuaCategories } from '@/lib/ummah-api';
import {
  buildDuasMetadata,
  buildIslamicToolsBreadcrumb,
} from '@/lib/islamic-tools-seo';
import { buildFaqJsonLd } from '@/lib/seo';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  try {
    const categories = await getDuaCategories();
    return categories.map((c) => ({ category: c.id }));
  } catch (error) {
    console.warn('[duas] generateStaticParams skipped — API unavailable:', error);
    return [];
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { category: id } = await params;
  try {
    const { category } = await getDuasByCategory(id);
    return buildDuasMetadata(id, category.name);
  } catch {
    return {};
  }
}

export default async function DuaCategoryPage({ params }: PageProps) {
  const { category: id } = await params;

  let data;
  try {
    data = await getDuasByCategory(id);
  } catch {
    notFound();
  }

  const { category, duas } = data;
  const breadcrumb = buildIslamicToolsBreadcrumb([
    { name: 'Duas', path: '/duas' },
    { name: category.name, path: `/duas/${id}` },
  ]);

  const duaFaq = buildFaqJsonLd([
    {
      question: `How many duas are in ${category.name}?`,
      answer: `This category contains ${duas.length} authentic supplications sourced from the Quran and Sunnah with Arabic text, transliteration, and English translation.`,
    },
    {
      question: 'Can I copy and share these duas?',
      answer: 'Yes, each dua includes a copy button. Share the Arabic text and translation with family and friends.',
    },
  ]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      <IslamicPageHeader
        badge="Duas"
        badgeSecondary={`${duas.length} Duas`}
        title={category.name}
        description={category.description}
        meta={
          <Link href="/duas" className="text-sm text-[var(--color-accent-soft)] hover:underline">
            ← All Categories
          </Link>
        }
      />

      <div className="space-y-4">
        {duas.map((dua) => (
          <DuaCard key={dua.id} dua={dua} />
        ))}
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(duaFaq) }} />
    </div>
  );
}
