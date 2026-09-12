import { serializeJsonLd } from '@/lib/seo/structured-data';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import BreadcrumbNav from '@/components/hadith/BreadcrumbNav';
import ChapterList from '@/components/hadith/ChapterList';
import CollectionHero from '@/components/hadith/CollectionHero';
import PublicContentState from '@/components/errors/public-content-state';
import {
  getAllCollections,
  getCollectionBySlugOrThrow,
  getChaptersByCollectionOrThrow,
} from '@/lib/hadith/collections.service';
import {
  buildHadithCollectionPath,
  buildHadithOgImagePath,
} from '@/lib/hadith/hadith-routing';
import {
  buildBookJsonLd,
  buildBreadcrumbJsonLd,
  buildPageMetadata,
} from '@/lib/seo';

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const collections = await getAllCollections();
    if (collections.length === 0) {
      return [];
    }
    return collections.map((c) => ({ collection: c.bookSlug }));
  } catch (error) {
    console.warn('[hadith] generateStaticParams skipped — API unavailable:', error);
    return [];
  }
}

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const { collection } = await params;
  let book: Awaited<ReturnType<typeof getCollectionBySlugOrThrow>>;
  let chapters: Awaited<ReturnType<typeof getChaptersByCollectionOrThrow>>;
  try {
    book = await getCollectionBySlugOrThrow(collection);
    if (!book) {
      return buildPageMetadata({
        title: 'Hadith Collection Not Found',
        description: 'The requested Hadith collection was not found.',
        path: buildHadithCollectionPath(collection),
        index: false,
      });
    }
    chapters = await getChaptersByCollectionOrThrow(collection);
  } catch {
    return buildPageMetadata({
      title: 'Hadith Collection Temporarily Unavailable',
      description: 'This Hadith collection could not be loaded from the data provider.',
      path: buildHadithCollectionPath(collection),
      index: false,
    });
  }
  const path = buildHadithCollectionPath(collection);
  const title = `${book.bookName} – Read Online (English & Urdu)`;
  const description = `Browse all chapters and hadiths from ${book.bookName} by ${book.writerName}. ${book.hadiths_count.toLocaleString()} hadiths with Arabic, English and Urdu translations.`;

  return buildPageMetadata({
    title,
    description,
    path,
    ogType: 'website',
    imageUrl: buildHadithOgImagePath({ variant: 'collection', bookName: book.bookName }),
    index: chapters.length > 0,
  });
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  let book: Awaited<ReturnType<typeof getCollectionBySlugOrThrow>>;
  let chapters: Awaited<ReturnType<typeof getChaptersByCollectionOrThrow>>;
  try {
    book = await getCollectionBySlugOrThrow(collection);
  } catch {
    return (
      <PublicContentState
        title="This Hadith collection is temporarily unavailable"
        description="The data provider could not load this collection. Please retry shortly; the incomplete page is excluded from indexing."
        primaryHref={buildHadithCollectionPath(collection)}
        primaryLabel="Try collection again"
      />
    );
  }

  if (!book) notFound();

  try {
    chapters = await getChaptersByCollectionOrThrow(collection);
  } catch {
    return (
      <PublicContentState
        title="This Hadith collection is temporarily unavailable"
        description="The data provider could not load this collection. Please retry shortly; the incomplete page is excluded from indexing."
        primaryHref={buildHadithCollectionPath(collection)}
        primaryLabel="Try collection again"
      />
    );
  }

  if (chapters.length === 0) {
    return (
      <PublicContentState
        title="Collection chapters are temporarily unavailable"
        description="No chapters were returned for this collection, so the incomplete page is excluded from indexing."
        primaryHref={buildHadithCollectionPath(collection)}
        primaryLabel="Try collection again"
      />
    );
  }

  const collectionPath = buildHadithCollectionPath(collection);
  const breadcrumbs = buildBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: 'Hadith', item: '/hadith' },
    { name: book.bookName, item: collectionPath },
  ]);
  const bookJsonLd = buildBookJsonLd({
    name: book.bookName,
    description: `Hadith collection compiled by ${book.writerName}.`,
    url: collectionPath,
    author: book.writerName,
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
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(bookJsonLd) }}
      />

      <div className="space-y-8 animate-fade-up">
        <BreadcrumbNav items={navBreadcrumbs} includeSchema={false} />

        <CollectionHero book={book} chapterCount={chapters.length} />

        <p className="max-w-3xl text-sm leading-relaxed text-[var(--color-muted-text)]">
          {book.bookName} by {book.writerName} contains {book.hadiths_count.toLocaleString()} narrations
          organised into {chapters.length} chapters. Read each hadith in Arabic with English and Urdu translations —
          supplied through HadithAPI.com. Grades and source references are shown where the provider supplies them;
          consult qualified scholars and printed critical editions for religious rulings.
        </p>

        <ChapterList collectionSlug={collection} chapters={chapters} />
      </div>
    </>
  );
}
