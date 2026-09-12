import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BookOpen, Hash, Languages, Quote, UserRound } from 'lucide-react';

import ArabicText from '@/components/hadith/ArabicText';
import BreadcrumbNav from '@/components/hadith/BreadcrumbNav';
import HadithActions from '@/components/hadith/HadithActions';
import HadithGrade from '@/components/hadith/HadithGrade';
import HadithNavigation from '@/components/hadith/HadithNavigation';
import HadithQuranNudge from '@/components/hadith/HadithQuranNudge';
import SuggestedHadiths from '@/components/hadith/SuggestedHadiths';
import { HadithDetailSchema, HadithBreadcrumbsSchema } from '@/components/hadith/HadithSchema';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getCollectionBySlugOrThrow } from '@/lib/hadith/collections.service';
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
import { getSurahById } from '@/lib/quran-index';
import { buildSurahPath } from '@/lib/quran-routing';
import { buildPageMetadata } from '@/lib/seo';

export const revalidate = false;

const QURAN_NUDGE_SURAH_IDS = [18, 36, 67] as const;

function getQuranNudgeLinks() {
  return QURAN_NUDGE_SURAH_IDS.flatMap((surahId) => {
    const surah = getSurahById(surahId);
    if (!surah) {
      return [];
    }

    return [
      {
        label: surah.surahName,
        arabicLabel: surah.surahNameArabic,
        href: buildSurahPath(surah.id, surah.surahName),
      },
    ];
  });
}

function formatHadithUrdu(text: string) {
  const withoutQuotes = text.replace(/["“”„‟«»]/g, '').trim();
  const colonIndex = withoutQuotes.indexOf(':');

  if (colonIndex === -1) return [withoutQuotes];

  const intro = withoutQuotes.slice(0, colonIndex).trim();
  const body = withoutQuotes.slice(colonIndex + 1).trim();

  return body ? [`${intro} :`, body] : [`${intro} :`];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string; book: string; hadithNumber: string }>;
}): Promise<Metadata> {
  const { collection, hadithNumber } = await params;
  if (!/^\d+$/.test(hadithNumber)) {
    return buildPageMetadata({
      title: 'Hadith Not Found',
      description: 'The requested Hadith number was not found.',
      path: buildHadithDetailPath(collection, hadithNumber),
      index: false,
    });
  }

  let hadith: Awaited<ReturnType<typeof getHadithByNumber>>;
  try {
    hadith = await getHadithByNumber(collection, hadithNumber);
  } catch {
    return buildPageMetadata({
      title: 'Hadith Temporarily Unavailable',
      description: 'This Hadith could not be loaded from the data provider.',
      path: buildHadithDetailPath(collection, hadithNumber),
      index: false,
    });
  }
  if (!hadith) return {};

  const description = getHadithMetaDescription(hadith);
  const path = buildHadithDetailPath(collection, hadithNumber);
  const title = getHadithMetaTitle(hadith);

  return buildPageMetadata({
    title,
    description,
    path,
    ogType: 'website',
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

  if (book !== collection || !/^\d+$/.test(hadithNumber)) notFound();

  const [hadith, bookData] = await Promise.all([
    getHadithByNumber(collection, hadithNumber),
    getCollectionBySlugOrThrow(collection),
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
  const quranNudgeLinks = getQuranNudgeLinks();
  const formattedHadithUrdu = hadith.hadithUrdu ? formatHadithUrdu(hadith.hadithUrdu) : [];

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
        inLanguage={['ar', 'en', 'ur']}
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

        {hadith.hadithArabic || hadith.hadithUrdu ? (
          <Card className="group relative overflow-hidden rounded-2xl border-[color-mix(in_oklab,var(--color-border),var(--color-accent)_12%)] bg-[var(--color-surface)] shadow-[0_18px_45px_-36px_rgb(0_0_0_/_0.55)] transition-[border-color,box-shadow,transform] duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_55%)]">
            <span
              className="absolute inset-y-0 right-0 z-10 w-1 bg-[linear-gradient(to_bottom,transparent,var(--color-accent),transparent)] opacity-75"
              aria-hidden="true"
            />
            <CardContent className="p-0">
              {hadith.hadithArabic ? (
                <section aria-labelledby="hadith-arabic-heading">
                  <div className="flex min-h-11 items-center justify-between gap-3 border-b border-[color-mix(in_oklab,var(--color-border),transparent_18%)] bg-[color-mix(in_oklab,var(--color-surface-2),transparent_38%)] px-4 py-2 sm:px-5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_84%)] text-[var(--color-accent-soft)]">
                        <Languages className="size-3.5" aria-hidden="true" />
                      </span>
                      <h2
                        id="hadith-arabic-heading"
                        className="truncate text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-heading)]"
                      >
                        Arabic Text
                      </h2>
                    </div>
                    <span
                      dir="rtl"
                      lang="ar"
                      className="shrink-0 font-arabic text-base leading-none text-[var(--color-accent-soft)] sm:text-lg"
                    >
                      النص العربي
                    </span>
                  </div>

                  <div className="relative bg-[linear-gradient(110deg,transparent,color-mix(in_oklab,var(--color-accent),var(--color-surface)_96%))] px-4 py-4 sm:px-7 sm:py-5">
                    <div
                      className="pointer-events-none absolute right-0 top-0 size-32 rounded-full bg-[color-mix(in_oklab,var(--color-accent),transparent_92%)] blur-3xl"
                      aria-hidden="true"
                    />
                    <ArabicText
                      text={hadith.hadithArabic}
                      size="md"
                      className="quran-script relative m-0 ml-auto w-full max-w-[48rem] text-pretty text-[var(--color-heading)]"
                    />
                  </div>
                </section>
              ) : null}

              {hadith.hadithUrdu ? (
                <section
                  aria-labelledby="hadith-urdu-heading"
                  className={`${
                    hadith.hadithArabic
                      ? 'border-t border-[color-mix(in_oklab,var(--color-border),transparent_12%)]'
                      : ''
                  } relative overflow-hidden bg-[radial-gradient(circle_at_100%_0%,color-mix(in_oklab,var(--color-accent),transparent_91%),transparent_42%),color-mix(in_oklab,var(--color-surface-2),transparent_45%)] px-4 py-4 sm:px-7 sm:py-5`}
                >
                  <div className="relative mb-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)] text-[var(--color-accent)]">
                        <Languages className="size-3.5" aria-hidden="true" />
                      </span>
                      <h2
                        id="hadith-urdu-heading"
                        className="truncate text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-heading)]"
                      >
                        Urdu Translation
                      </h2>
                    </div>
                    <span
                      dir="rtl"
                      lang="ur"
                      className="inline-flex h-9 pb-[10px] shrink-0 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_52%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%)] px-3 font-urdu-nastaliq text-sm leading-none text-[var(--color-accent-soft)]"
                    >
                      <span className="translate-y-0.5 min-[380px]:hidden">اردو</span>
                      <span className="hidden translate-y-0.5 min-[380px]:inline">اردو ترجمہ</span>
                    </span>
                  </div>
                  <p
                    dir="rtl"
                    lang="ur"
                    className="urdu-font relative ml-auto max-w-[48rem] text-right text-[var(--color-text)]"
                  >
                    {formattedHadithUrdu.map((line, index) => (
                      <span key={`${index}-${line}`} className="block">
                        {line}
                      </span>
                    ))}
                  </p>
                </section>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card className="overflow-hidden border-[color-mix(in_oklab,var(--color-border),var(--color-accent)_8%)] bg-[var(--color-surface)] shadow-[0_18px_45px_-36px_rgb(0_0_0_/_0.5)]">
          <CardContent className="p-0">
            <div className="flex min-h-11 items-center gap-2.5 border-b border-[color-mix(in_oklab,var(--color-border),transparent_18%)] bg-[color-mix(in_oklab,var(--color-surface-2),transparent_42%)] px-4 py-2 sm:px-5">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%)] text-[var(--color-accent)]">
                <Quote className="size-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-heading)]">
                  English Translation
                </h2>
                <p className="text-[0.68rem] text-[var(--color-muted-text)]">Meaning of the narration</p>
              </div>
            </div>
            <div className="px-4 py-4 sm:px-7 sm:py-5">
              <p className="max-w-[68ch] text-base leading-7 text-[var(--color-text)] sm:text-[1.05rem] sm:leading-8">
                {hadith.hadithEnglish || 'English translation is not available for this narration.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-accent)]">
              <BookOpen className="size-4" aria-hidden="true" />
            </span>
            <p className="min-w-0 text-sm leading-relaxed text-[var(--color-muted-text)]">
              <span className="font-semibold text-[var(--color-heading)]">Source</span>
              <span className="mx-1.5">·</span>
              {hadith.book.bookName} by {hadith.book.writerName}
              <span className="mx-1.5">·</span>
              Data supplied through HadithAPI.com; verify disputed grades or rulings with qualified scholars.
            </p>
          </div>
          <HadithActions hadith={hadith} shareUrl={detailPath} variant="full" />
        </div>

        <HadithNavigation
          bookSlug={collection}
          currentNumber={parseInt(hadithNumber, 10)}
          totalHadiths={bookData.hadiths_count}
        />

        <HadithQuranNudge links={quranNudgeLinks} />

        <SuggestedHadiths hadiths={suggestedHadiths} bookSlug={collection} />
      </article>
    </>
  );
}
