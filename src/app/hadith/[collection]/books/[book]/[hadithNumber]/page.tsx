import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

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
  const { collection, hadithNumber } = await params;

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

      <article className="mx-auto max-w-3xl space-y-6 animate-fade-up">
        <BreadcrumbNav items={navBreadcrumbs} includeSchema={false} />

        <header className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{hadith.book.bookName}</Badge>
                <Badge variant="outline">#{hadithNumber}</Badge>
              </div>
              <h1 className="font-display text-3xl font-bold text-[var(--color-heading)]">
                Hadith {hadithNumber}
              </h1>
              {hadith.chapter.chapterUrdu ? (
                <p dir="rtl" lang="ur" className="font-urdu-nastaliq text-lg text-[var(--color-accent-soft)]">
                  {hadith.chapter.chapterUrdu}
                </p>
              ) : null}
              <p className="text-sm text-[var(--color-muted-text)]">
                {hadith.chapter.chapterEnglish}
              </p>
              <p className="max-w-2xl text-sm leading-relaxed text-[var(--color-muted-text)]">
                {intro}
              </p>
            </div>
            <HadithGrade grade={hadith.status} />
          </div>

          {hadith.englishNarrator ? (
            <p className="text-sm font-medium text-[var(--color-accent-soft)]">
              Narrated by: {hadith.englishNarrator}
            </p>
          ) : null}
          {hadith.urduNarrator ? (
            <p dir="rtl" lang="ur" className="font-urdu-nastaliq text-sm text-[var(--color-muted-text)]">
              {hadith.urduNarrator}
            </p>
          ) : null}
        </header>

        {hadith.hadithArabic ? (
          <Card className="overflow-hidden border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)]">
            <CardContent className="border-r-4 border-r-[var(--color-accent)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_94%)] p-6 md:p-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                Arabic Text
              </p>
              <ArabicText text={hadith.hadithArabic} size="lg" className="text-[var(--color-heading)]" />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="space-y-3 p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              English Translation
            </p>
            <p className="text-lg leading-relaxed text-[var(--color-text)]">{hadith.hadithEnglish}</p>
          </CardContent>
        </Card>

        {hadith.hadithUrdu ? (
          <Card>
            <CardContent className="space-y-3 p-6 md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                Urdu Translation
              </p>
              <p
                dir="rtl"
                lang="ur"
                className="text-right font-urdu-nastaliq text-xl leading-loose text-[var(--color-text)]"
              >
                {hadith.hadithUrdu}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-sm text-[var(--color-muted-text)]">
            Source: {hadith.book.bookName} · {hadith.book.writerName}
          </p>
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
