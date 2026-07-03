import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import BreadcrumbNav from '@/components/hadith/BreadcrumbNav';
import ChapterFilterBar from '@/components/hadith/ChapterFilterBar';
import HadithCard from '@/components/hadith/HadithCard';
import HadithPagination from '@/components/hadith/HadithPagination';
import { Badge } from '@/components/ui/badge';
import { getCollectionBySlug, getChaptersByCollection } from '@/lib/hadith/collections.service';
import { getHadiths } from '@/lib/hadith/hadith.service';
import {
  buildHadithBookPath,
  buildHadithCollectionPath,
  buildHadithOgImagePath,
} from '@/lib/hadith/hadith-routing';
import { buildHadithCollectionKeywords } from '@/lib/seo-keywords';
import { buildBreadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string; book: string }>;
  searchParams: Promise<{ page?: string; chapter?: string }>;
}): Promise<Metadata> {
  const { collection } = await params;
  const { page = '1', chapter } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10));

  const [bookData, chapters] = await Promise.all([
    getCollectionBySlug(collection),
    chapter ? getChaptersByCollection(collection) : Promise.resolve([]),
  ]);

  if (!bookData) return {};

  const chapterMeta = chapter
    ? chapters.find((entry) => entry.chapterNumber === chapter)
    : undefined;

  const path = buildHadithBookPath(collection, { chapter, page: currentPage });
  const title = chapterMeta
    ? `${bookData.bookName} – ${chapterMeta.chapterEnglish}${currentPage > 1 ? ` (Page ${currentPage})` : ''}`
    : `${bookData.bookName} – All Hadiths${currentPage > 1 ? ` (Page ${currentPage})` : ''}`;
  const description = chapterMeta
    ? `Read hadiths from ${chapterMeta.chapterEnglish} in ${bookData.bookName} with Arabic, English and Urdu translations.`
    : `Read hadiths from ${bookData.bookName} by ${bookData.writerName} with Arabic, English and Urdu translations.`;

  return buildPageMetadata({
    title,
    description,
    path,
    index: currentPage === 1,
    follow: true,
    ogType: 'article',
    keywords: buildHadithCollectionKeywords(bookData.bookName, bookData.writerName),
    imageUrl: buildHadithOgImagePath({ variant: 'collection', bookName: bookData.bookName }),
  });
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string; book: string }>;
  searchParams: Promise<{ page?: string; chapter?: string }>;
}) {
  const { collection, book } = await params;
  if (book !== collection) notFound();
  const { page = '1', chapter } = await searchParams;

  const currentPage = Math.max(1, parseInt(page, 10));

  const [bookData, hadithsData, allChapters] = await Promise.all([
    getCollectionBySlug(collection),
    getHadiths({ bookSlug: collection, chapterId: chapter, page: currentPage }),
    getChaptersByCollection(collection),
  ]);

  if (!bookData) notFound();

  const chapterMeta = chapter
    ? allChapters.find((entry) => entry.chapterNumber === chapter)
    : undefined;
  const collectionPath = buildHadithCollectionPath(collection);
  const bookPath = buildHadithBookPath(collection, { chapter, page: currentPage });

  const breadcrumbs = buildBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: 'Hadith', item: '/hadith' },
    { name: bookData.bookName, item: collectionPath },
    {
      name: chapterMeta ? chapterMeta.chapterEnglish : 'Hadiths',
      item: bookPath,
    },
  ]);

  const navBreadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Hadith', href: '/hadith' },
    { label: bookData.bookName, href: collectionPath },
    {
      label: chapterMeta ? chapterMeta.chapterEnglish : 'Hadiths',
      href: bookPath,
    },
  ];

  const baseUrl = buildHadithBookPath(collection, { chapter });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="space-y-6 animate-fade-up">
        <BreadcrumbNav items={navBreadcrumbs} includeSchema={false} />

        <header className="space-y-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{bookData.bookName}</Badge>
              {chapterMeta ? (
                <Badge variant="outline">Chapter {chapterMeta.chapterNumber}</Badge>
              ) : null}
            </div>
            <h1 className="font-display text-3xl font-bold text-[var(--color-heading)] md:text-4xl">
              {chapterMeta ? chapterMeta.chapterEnglish : bookData.bookName}
            </h1>
            {chapterMeta?.chapterUrdu ? (
              <p
                dir="rtl"
                lang="ur"
                className="mt-2 font-urdu-nastaliq text-lg text-[var(--color-muted-text)]"
              >
                {chapterMeta.chapterUrdu}
              </p>
            ) : null}
            {chapterMeta?.chapterArabic ? (
              <p
                dir="rtl"
                lang="ar"
                className="mt-1 font-arabic-amiri text-base text-[var(--color-muted-text)]"
              >
                {chapterMeta.chapterArabic}
              </p>
            ) : null}
          </div>

          <p className="text-sm text-[var(--color-muted-text)]">
            Showing {hadithsData.hadiths.from}–{hadithsData.hadiths.to} of{' '}
            {hadithsData.hadiths.total.toLocaleString()} hadiths
            {chapterMeta ? ` in this chapter` : ''}
          </p>

          <ChapterFilterBar
            collectionSlug={collection}
            chapters={allChapters}
            activeChapter={chapter}
          />
        </header>

        <div className="space-y-4">
          {hadithsData.hadiths.data.map((hadith) => (
            <HadithCard key={hadith.id} hadith={hadith} />
          ))}
        </div>

        <HadithPagination
          currentPage={currentPage}
          totalPages={hadithsData.hadiths.last_page}
          baseUrl={baseUrl}
        />
      </div>
    </>
  );
}
