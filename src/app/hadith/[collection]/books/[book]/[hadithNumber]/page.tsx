import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BookOpen, Hash, Languages, Quote, UserRound } from 'lucide-react';

import ArabicText from '@/components/hadith/ArabicText';
import BreadcrumbNav from '@/components/hadith/BreadcrumbNav';
import HadithActions from '@/components/hadith/HadithActions';
import HadithGrade from '@/components/hadith/HadithGrade';
import HadithNavigation from '@/components/hadith/HadithNavigation';
import SuggestedHadiths from '@/components/hadith/SuggestedHadiths';
import { HadithDetailSchema, HadithBreadcrumbsSchema } from '@/components/hadith/HadithSchema';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getCollectionBySlug } from '@/lib/hadith/collections.service';
import { getHadithByNumber, getSuggestedHadiths } from '@/lib/hadith/hadith.service';
import {
  getHadithMetaDescription,
  getHadithMetaTitle,
  getHadithSeoIntro,
} from '@/lib/hadith-seo-content';
import {
  buildHadithCollectionPath,
  buildHadithDetailPath,
  buildHadithOgImagePath,
} from '@/lib/hadith/hadith-routing';
import { buildHadithDetailKeywords } from '@/lib/seo-keywords';
import { buildPageMetadata } from '@/lib/seo';

export const revalidate = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string; book: string; hadithNumber: string }>;
}): Promise<Metadata> {
  const { collection, hadithNumber } = await params;
  const hadith = await getHadithByNumber(collection, hadithNumber);
  if (!hadith) return {};

  const description = getHadithMetaDescription(hadith);
  const path = buildHadithDetailPath(collection, hadithNumber);
  const title = getHadithMetaTitle(hadith);

  return buildPageMetadata({
    title,
    description,
    path,
    ogType: 'article',
    keywords: buildHadithDetailKeywords({
      bookName: hadith.book.bookName,
      writerName: hadith.book.writerName,
      hadithNumber,
      chapterEnglish: hadith.chapter.chapterEnglish,
      grade: hadith.status,
    }),
    author: hadith.englishNarrator || hadith.book.writerName,
    imageUrl: buildHadithOgImagePath({
      variant: 'detail',
      bookName: hadith.book.bookName,
      hadithNumber,
    }),
  });
}

export default async function HadithDetailPage({
  params,
}: {
  params: Promise<{ collection: string; book: string; hadithNumber: string }>;
}) {
  const { collection, book, hadithNumber } = await params;

  if (book !== collection) notFound();

  const [hadith, bookData] = await Promise.all([
    getHadithByNumber(collection, hadithNumber),
    getCollectionBySlug(collection),
  ]);

  if (!hadith || !bookData) notFound();

  const suggestedHadiths = await getSuggestedHadiths(
    collection,
    hadithNumber,
    hadith.chapter.chapterNumber,
    4
  );

  const detailPath = buildHadithDetailPath(collection, hadithNumber);
  const collectionPath = buildHadithCollectionPath(collection);
  const description = getHadithMetaDescription(hadith);
  const intro = getHadithSeoIntro(hadith);

  const navBreadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Hadith', href: '/hadith' },
    { label: bookData.bookName, href: collectionPath },
    { label: `Hadith ${hadithNumber}`, href: detailPath },
  ];

  return (
    <>
      <HadithBreadcrumbsSchema
        collectionName={bookData.bookName}
        collectionSlug={collection}
        chapterNumber={hadith.chapter.chapterNumber}
        chapterName={hadith.chapter.chapterEnglish}
        hadithNumber={hadithNumber}
        hadithPath={detailPath}
      />
      <HadithDetailSchema
        hadithNumber={hadithNumber}
        bookName={hadith.book.bookName}
        writerName={hadith.book.writerName}
        chapterEnglish={hadith.chapter.chapterEnglish}
        content={hadith.hadithEnglish}
        path={detailPath}
        description={description}
        datePublished="2024-01-01T00:00:00Z"
        inLanguage={['Arabic', 'English', 'Urdu']}
        imageUrl={buildHadithOgImagePath({
          variant: 'detail',
          bookName: hadith.book.bookName,
          hadithNumber,
        })}
      />

      <article className="mx-auto max-w-4xl space-y-5 animate-fade-up">
        <BreadcrumbNav items={navBreadcrumbs} includeSchema={false} />

        <header className="relative overflow-hidden rounded-3xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_72%)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--color-accent),transparent_84%),transparent_65%)]"
            aria-hidden="true"
          />

          <div className="relative p-5 sm:p-7 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="normal-case tracking-normal">
                  <BookOpen className="mr-1.5 size-3" aria-hidden="true" />
                  {hadith.book.bookName}
                </Badge>
                <Badge variant="outline" className="font-mono tracking-normal">
                  <Hash className="mr-0.5 size-3" aria-hidden="true" />
                  {hadithNumber}
                </Badge>
              </div>
              <HadithGrade grade={hadith.status} />
            </div>

            <div className="mt-5 max-w-3xl">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Hadith {hadithNumber}
              </p>
              <h1 className="mt-2 text-balance font-display text-3xl font-bold leading-tight text-[var(--color-heading)] sm:text-4xl">
                {hadith.chapter.chapterEnglish || `${hadith.book.bookName} Hadith ${hadithNumber}`}
              </h1>
              {hadith.chapter.chapterUrdu ? (
                <p
                  dir="rtl"
                  lang="ur"
                  className="mt-3 text-right font-urdu-nastaliq text-lg leading-loose text-[var(--color-accent-soft)] sm:text-xl"
                >
                  {hadith.chapter.chapterUrdu}
                </p>
              ) : null}
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted-text)]">
                {intro}
              </p>
            </div>

            {hadith.englishNarrator || hadith.urduNarrator ? (
              <div className="mt-6 grid gap-2.5 rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-2),transparent_24%)] p-3.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-3 sm:p-4">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--color-accent),transparent_88%)] text-[var(--color-accent)]">
                  <UserRound className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  {hadith.englishNarrator ? (
                    <p className="text-sm font-medium leading-relaxed text-[var(--color-heading)]">
                      <span className="text-[var(--color-muted-text)]">Narrated by </span>
                      {hadith.englishNarrator}
                    </p>
                  ) : null}
                  {hadith.urduNarrator ? (
                    <p
                      dir="rtl"
                      lang="ur"
                      className="mt-1 text-right font-urdu-nastaliq text-sm leading-loose text-[var(--color-muted-text)]"
                    >
                      {hadith.urduNarrator}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        {hadith.hadithArabic ? (
          <Card className="overflow-hidden border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_62%)] shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-soft)]">
            <CardContent className="p-0">
              <div className="flex items-center gap-2.5 border-b border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_72%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_95%)] px-4 py-3 sm:px-6">
                <span className="inline-flex size-7 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--color-accent),transparent_86%)] text-[var(--color-accent)]">
                  <Languages className="size-3.5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-heading)]">
                    Arabic Text
                  </h2>
                  <p className="mt-0.5 text-[0.68rem] text-[var(--color-muted-text)]">Original narration</p>
                </div>
              </div>
              <div className="border-r-2 border-r-[var(--color-accent)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_97%)] px-4 py-4 sm:px-6 sm:py-5 md:px-7">
                <ArabicText text={hadith.hadithArabic} size="md" className="m-0 text-[var(--color-heading)]" />
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="hover:shadow-[var(--shadow-soft)]">
          <CardContent className="p-5 sm:p-6 md:p-7">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-accent)]">
                <Quote className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-heading)]">
                  English Translation
                </h2>
                <p className="mt-0.5 text-[0.68rem] text-[var(--color-muted-text)]">Meaning of the narration</p>
              </div>
            </div>
            <p className="text-base leading-7 text-[var(--color-text)] sm:text-[1.05rem] sm:leading-8">
              {hadith.hadithEnglish}
            </p>
          </CardContent>
        </Card>

        {hadith.hadithUrdu ? (
          <Card className="hover:shadow-[var(--shadow-soft)]">
            <CardContent className="p-5 sm:p-6 md:p-7">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-heading)]">
                    Urdu Translation
                  </h2>
                  <p className="mt-0.5 text-[0.68rem] text-[var(--color-muted-text)]">اردو ترجمہ</p>
                </div>
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[var(--color-surface-2)] font-urdu-nastaliq text-sm text-[var(--color-accent)]">
                  اردو
                </span>
              </div>
              <p
                dir="rtl"
                lang="ur"
                className="text-right font-urdu-nastaliq text-lg leading-[2.15] text-[var(--color-text)] sm:text-xl"
              >
                {hadith.hadithUrdu}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-accent)]">
              <BookOpen className="size-4" aria-hidden="true" />
            </span>
            <p className="min-w-0 text-sm leading-relaxed text-[var(--color-muted-text)]">
              <span className="font-semibold text-[var(--color-heading)]">Source</span>
              <span className="mx-1.5">·</span>
              {hadith.book.bookName} by {hadith.book.writerName}
            </p>
          </div>
          <HadithActions hadith={hadith} shareUrl={detailPath} variant="full" />
        </div>

        <HadithNavigation
          bookSlug={collection}
          currentNumber={parseInt(hadithNumber, 10)}
          totalHadiths={bookData.hadiths_count}
        />

        <SuggestedHadiths hadiths={suggestedHadiths} bookSlug={collection} />
      </article>
    </>
  );
}
