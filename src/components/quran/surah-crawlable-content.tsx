import Link from 'next/link';
import { ChevronDown, FileText } from 'lucide-react';

import type { SurahIndexEntry } from '@/lib/quran-index';
import {
  buildAyahPath,
  buildTafsirSurahPath,
} from '@/lib/quran-routing';
import {
  getSurahSeoIntro,
  getSurahUrduTitle,
} from '@/lib/surah-seo-content';

const INITIAL_AYAH_LINK_COUNT = 48;

function AyahNumberLink({
  surah,
  ayahNumber,
}: {
  surah: SurahIndexEntry;
  ayahNumber: number;
}) {
  return (
    <Link
      href={buildAyahPath(surah.id, surah.surahName, ayahNumber)}
      className="inline-flex h-8 min-w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-elevated),transparent_6%)] px-2 text-xs font-semibold tabular-nums text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30"
    >
      {ayahNumber}
    </Link>
  );
}

export default function SurahCrawlableContent({ surah }: { surah: SurahIndexEntry }) {
  const ayahNumbers = Array.from({ length: surah.totalAyah }, (_, index) => index + 1);
  const visibleAyahNumbers = ayahNumbers.slice(0, INITIAL_AYAH_LINK_COUNT);
  const hiddenAyahNumbers = ayahNumbers.slice(INITIAL_AYAH_LINK_COUNT);
  const hiddenAyahCount = hiddenAyahNumbers.length;

  return (
    <section
      className="border-t border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 py-6 sm:px-6"
      aria-label={`Surah ${surah.surahName} ayah index and sources`}
    >
      <div className="mx-auto max-w-4xl">
        <h2 className="font-display text-2xl font-semibold text-[var(--color-heading)]">
          About {getSurahUrduTitle(surah)} — Surah {surah.surahName}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--color-muted-text)] sm:text-base">
          {getSurahSeoIntro(surah)}
        </p>

        <nav aria-label={`All ${surah.totalAyah} ayahs of Surah ${surah.surahName}`} className="mt-6">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-elevated),transparent_8%)] p-3 shadow-[var(--shadow-soft)] sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                All Ayahs
              </h3>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--color-muted-text)]">
                {surah.totalAyah} total
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {visibleAyahNumbers.map((ayahNumber) => (
                <AyahNumberLink key={ayahNumber} surah={surah} ayahNumber={ayahNumber} />
              ))}
            </div>

            {hiddenAyahCount > 0 ? (
              <details className="group mt-3">
                <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_92%)] px-3 py-2 text-sm font-semibold text-[var(--color-accent-soft)] transition hover:border-[var(--color-accent-soft)] hover:bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30 [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">
                    Show {hiddenAyahCount} more ayahs
                  </span>
                  <span className="hidden group-open:inline">Show fewer ayahs</span>
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-3 border-t border-[color-mix(in_oklab,var(--color-border),transparent_18%)] pt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {hiddenAyahNumbers.map((ayahNumber) => (
                      <AyahNumberLink key={ayahNumber} surah={surah} ayahNumber={ayahNumber} />
                    ))}
                  </div>
                </div>
              </details>
            ) : null}
          </div>
        </nav>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={buildTafsirSurahPath(surah.id, surah.surahName)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-accent)] hover:border-[var(--color-accent-soft)]"
          >
            <FileText className="size-4" />
            Complete Surah Tafseer Index
          </Link>
          <Link
            href="/editorial-policy"
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-heading)] hover:border-[var(--color-accent-soft)]"
          >
            Sources &amp; editorial policy
          </Link>
          <Link
            href="/corrections"
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-heading)] hover:border-[var(--color-accent-soft)]"
          >
            Report a correction
          </Link>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted-text)]">
          Quran text and translations are supplied through Quran.com. English uses Sahih
          International; Urdu uses Fatah Muhammad Jalandhari. Tafseer detail pages identify the
          source returned by the provider.
        </p>
      </div>
    </section>
  );
}
