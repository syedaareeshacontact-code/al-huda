import Link from 'next/link';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AyahContentEntry } from '@/lib/quran-server';
import type { SurahIndexEntry } from '@/lib/quran-index';
import { buildAyahPath, buildSurahPath, buildTafsirPath, buildTafsirSurahPath } from '@/lib/quran-routing';
import { buildSurahDownloadPath, buildSurahPdfPublicPath } from '@/lib/surah-download';
import { hasTafsirForAyah } from '@/lib/tafsir-index';
import {
  getSurahSeoIntro,
  getSurahUrduTitle,
  getRelatedLinks,
  getPrevNextSurah,
  getSsrAyahFullTextLimit,
} from '@/lib/surah-seo-content';
import { getAllSurahs } from '@/lib/quran-index';

interface SurahCrawlableContentProps {
  surah: SurahIndexEntry;
  ayahs: AyahContentEntry[];
}

export default function SurahCrawlableContent({ surah, ayahs }: SurahCrawlableContentProps) {
  const intro = getSurahSeoIntro(surah);
  const urduTitle = getSurahUrduTitle(surah);
  const relatedLinks = getRelatedLinks(surah);
  const allSurahs = getAllSurahs();
  const { prev, next } = getPrevNextSurah(surah.id, allSurahs);
  const fullTextLimit = getSsrAyahFullTextLimit(surah.totalAyah);
  const fullTextAyahs = ayahs.slice(0, fullTextLimit);

  return (
    <section
      className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 py-6 sm:px-6"
      aria-label={`Surah ${surah.surahName} full text and navigation`}
    >
      <div className="mx-auto max-w-4xl">
        {/* SEO intro — unique per surah */}
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--color-muted-text)] sm:text-base">
          {intro}
        </p>

        {/* Ayah index — crawlable links to ALL ayahs (critical for Google) */}
        <nav aria-label={`All ${surah.totalAyah} ayahs of Surah ${surah.surahName}`} className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            All Ayahs — Surah {surah.surahName}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: surah.totalAyah }, (_, i) => {
              const n = i + 1;
              const ayahPath = buildAyahPath(surah.id, surah.surahName, n);
              const hasTafsir = hasTafsirForAyah(surah.id, n);
              return (
                <Link
                  key={n}
                  href={ayahPath}
                  className="inline-flex min-w-[2.5rem] items-center justify-center rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)]"
                  title={hasTafsir ? `Ayah ${n} — with tafseer` : `Ayah ${n}`}
                >
                  {n}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Tafsir hub + ayah links */}
        {ayahs.some((a) => hasTafsirForAyah(surah.id, a.ayahNumber)) && (
          <nav aria-label="Tafseer links" className="mt-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Urdu Tafseer — Surah {surah.surahName}
            </h2>
            <Link
              href={buildTafsirSurahPath(surah.id, surah.surahName)}
              className="mb-3 inline-flex items-center gap-2 rounded-lg border border-[var(--color-accent-soft)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_92%)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)] transition hover:brightness-105"
            >
              <FileText className="h-4 w-4" />
              Complete Surah {surah.surahName} Tafseer (Urdu)
            </Link>
            <div className="flex flex-wrap gap-2">
              {ayahs
                .filter((a) => hasTafsirForAyah(surah.id, a.ayahNumber))
                .map((a) => (
                  <Link
                    key={a.ayahNumber}
                    href={buildTafsirPath(surah.id, surah.surahName, a.ayahNumber)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)] transition hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)]"
                  >
                    <FileText className="h-3 w-3" />
                    Tafseer {surah.id}:{a.ayahNumber}
                  </Link>
                ))}
            </div>
          </nav>
        )}

        {/* Download links — crawlable for Google */}
        <nav aria-label="Download PDF and audio" className="mt-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Download PDF & Audio
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildSurahDownloadPath(surah.id, surah.surahName)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)]"
            >
              All Download Options
            </Link>
            <Link
              href={buildSurahPdfPublicPath(surah.id, 'arabic')}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)] transition hover:border-[var(--color-accent-soft)]"
            >
              Arabic PDF
            </Link>
            <Link
              href={buildSurahPdfPublicPath(surah.id, 'arabic-urdu')}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)] transition hover:border-[var(--color-accent-soft)]"
            >
              Arabic + Urdu PDF
            </Link>
            <Link
              href={`/api/surah/${surah.id}/audio?variant=arabic&reciter=7`}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)] transition hover:border-[var(--color-accent-soft)]"
            >
              Arabic Audio MP3
            </Link>
            <Link
              href={`/api/surah/${surah.id}/audio?variant=urdu`}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)] transition hover:border-[var(--color-accent-soft)]"
            >
              Urdu Audio
            </Link>
          </div>
        </nav>

        {/* Full ayah text — server-rendered for crawlers */}
        <article className="mt-8 space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            {urduTitle} — Complete Text
            {fullTextLimit < surah.totalAyah && (
              <span className="ml-2 normal-case tracking-normal text-[var(--color-muted-text)]">
                (Ayahs 1–{fullTextLimit} of {surah.totalAyah})
              </span>
            )}
          </h2>

          {fullTextAyahs.map((ayah) => {
            const ayahPath = buildAyahPath(surah.id, surah.surahName, ayah.ayahNumber);
            const tafsirPath = hasTafsirForAyah(surah.id, ayah.ayahNumber)
              ? buildTafsirPath(surah.id, surah.surahName, ayah.ayahNumber)
              : null;

            return (
              <div
                key={ayah.ayahNumber}
                id={`ayah-${ayah.ayahNumber}`}
                className="space-y-2 border-b border-[var(--color-border)] pb-5 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={ayahPath}
                    className="text-xs font-bold text-[var(--color-accent)] hover:underline"
                  >
                    Ayah {surah.id}:{ayah.ayahNumber}
                  </Link>
                  {tafsirPath && (
                    <Link
                      href={tafsirPath}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-muted-text)] hover:text-[var(--color-accent)]"
                    >
                      <FileText className="h-3 w-3" />
                      Urdu Tafseer
                    </Link>
                  )}
                </div>
                {ayah.arabicText && (
                  <p lang="ar" dir="rtl" className="arabic-font text-right text-xl leading-loose text-[var(--color-heading)]">
                    {ayah.arabicText}
                  </p>
                )}
                {ayah.urduTranslation && (
                  <p lang="ur" dir="rtl" className="urdu-font text-right text-sm leading-relaxed text-[var(--color-text)]">
                    {ayah.urduTranslation}
                  </p>
                )}
                {ayah.englishTranslation && (
                  <p lang="en" className="text-sm leading-relaxed text-[var(--color-muted-text)]">
                    {ayah.englishTranslation}
                  </p>
                )}
              </div>
            );
          })}

          {fullTextLimit < surah.totalAyah && (
            <p className="text-sm text-[var(--color-muted-text)]">
              <Link
                href={buildAyahPath(surah.id, surah.surahName, fullTextLimit + 1)}
                className="font-semibold text-[var(--color-accent)] hover:underline"
              >
                Continue reading ayahs {fullTextLimit + 1}–{surah.totalAyah} of Surah {surah.surahName} →
              </Link>
            </p>
          )}
        </article>

        {/* Prev/Next surah navigation */}
        <nav aria-label="Surah navigation" className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {prev ? (
            <Link
              href={buildSurahPath(prev.id, prev.surahName)}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--color-accent-soft)]"
            >
              <ChevronLeft className="h-4 w-4" />
              Surah {prev.surahName}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={buildSurahPath(next.id, next.surahName)}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--color-accent-soft)]"
            >
              Surah {next.surahName}
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>

        {/* Internal linking — duas, hadith, prayer times */}
        <aside className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-text)]">
            Related Islamic Resources
          </h2>
          <div className="flex flex-wrap gap-2">
            {relatedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
