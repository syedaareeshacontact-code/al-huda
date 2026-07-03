import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import BreadcrumbNav from '@/components/hadith/BreadcrumbNav';
import ChapterList from '@/components/hadith/ChapterList';
import CollectionHero from '@/components/hadith/CollectionHero';
import {
  getAllCollections,
  getCollectionBySlug,
  getChaptersByCollection,
} from '@/lib/hadith/collections.service';
import {
  buildHadithCollectionPath,
  buildHadithOgImagePath,
} from '@/lib/hadith/hadith-routing';
import { buildHadithCollectionKeywords } from '@/lib/seo-keywords';
import {
  buildBookJsonLd,
  buildBreadcrumbJsonLd,
  buildPageMetadata,
} from '@/lib/seo';

export const revalidate = 3600;

export async function generateStaticParams() {
  const collections = await getAllCollections();
  if (collections.length === 0) {
    return [];
  }

  return collections.map((c) => ({ collection: c.bookSlug }));
}

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const { collection } = await params;
  const book = await getCollectionBySlug(collection);
  if (!book) return {};

  const path = buildHadithCollectionPath(collection);
  const title = `${book.bookName} – Read Online (English & Urdu)`;
  const description = `Browse all chapters and hadiths from ${book.bookName} by ${book.writerName}. ${book.hadiths_count.toLocaleString()} hadiths with Arabic, English and Urdu translations.`;

  return buildPageMetadata({
    title,
    description,
    path,
    ogType: 'article',
    keywords: buildHadithCollectionKeywords(book.bookName, book.writerName),
    imageUrl: buildHadithOgImagePath({ variant: 'collection', bookName: book.bookName }),
  });
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  const [book, chapters] = await Promise.all([
    getCollectionBySlug(collection),
    getChaptersByCollection(collection),
  ]);

  if (!book) notFound();

  const collectionPath = buildHadithCollectionPath(collection);
  const breadcrumbs = buildBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: 'Hadith', item: '/hadith' },
    { name: book.bookName, item: collectionPath },
  ]);
  const bookJsonLd = buildBookJsonLd({
    name: book.bookName,
    description: `Authentic hadith collection compiled by ${book.writerName}.`,
    path: collectionPath,
    author: book.writerName,
    numberOfPages: book.hadiths_count,
    inLanguage: ['ar', 'en', 'ur'],
  });

  const navBreadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Hadith', href: '/hadith' },
    { label: book.bookName, href: collectionPath },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bookJsonLd) }}
      />

      <div className="space-y-8 animate-fade-up">
        <BreadcrumbNav items={navBreadcrumbs} includeSchema={false} />

        <CollectionHero book={book} chapterCount={chapters.length} />

        <p className="max-w-3xl text-sm leading-relaxed text-[var(--color-muted-text)]">
          {book.bookName} by {book.writerName} contains {book.hadiths_count.toLocaleString()} authenticated narrations
          organised into {chapters.length} chapters. Read each hadith in Arabic with English and Urdu translations —
          sourced from HadithAPI.com and cross-referenced with standard Islamic scholarship.
        </p>

        <ChapterList collectionSlug={collection} chapters={chapters} />
      </div>
    </>
  );
}
