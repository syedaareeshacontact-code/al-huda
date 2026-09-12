import Link from 'next/link';
import { FileText } from 'lucide-react';

import type { SurahIndexEntry } from '@/lib/quran-index';
import {
  buildAyahPath,
  buildTafsirSurahPath,
} from '@/lib/quran-routing';
import {
  getSurahSeoIntro,
  getSurahUrduTitle,
} from '@/lib/surah-seo-content';

const AYAH_LINKS_CLASS =
  'flex flex-nowrap snap-x snap-mandatory gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:snap-none sm:overflow-visible sm:pb-0 [&_a]:inline-flex [&_a]:min-w-10 [&_a]:shrink-0 [&_a]:snap-start [&_a]:items-center [&_a]:justify-center [&_a]:rounded-lg [&_a]:border [&_a]:border-[var(--color-border)] [&_a]:bg-[color-mix(in_oklab,var(--color-surface-2),transparent_45%)] [&_a]:px-2 [&_a]:py-1.5 [&_a]:text-xs [&_a]:font-semibold [&_a]:text-[var(--color-heading)] [&_a]:transition hover:[&_a]:border-[var(--color-accent-soft)] hover:[&_a]:bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_92%)] hover:[&_a]:text-[var(--color-accent-soft)]';

const ACTION_LINKS_CLASS =
  'mt-6 flex flex-nowrap snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:snap-none sm:overflow-visible sm:pb-0 [&_a]:inline-flex [&_a]:shrink-0 [&_a]:snap-start [&_a]:items-center [&_a]:whitespace-nowrap [&_a]:rounded-lg [&_a]:border [&_a]:border-[var(--color-border)] [&_a]:px-3 [&_a]:py-2 [&_a]:text-sm [&_a]:font-semibold hover:[&_a]:border-[var(--color-accent-soft)]';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildAyahLinksHtml(surah: SurahIndexEntry) {
  return Array.from({ length: surah.totalAyah }, (_, index) => {
    const ayahNumber = index + 1;
    const ayahPath = buildAyahPath(surah.id, surah.surahName, ayahNumber);
    return `<a href="${escapeHtml(ayahPath)}" aria-label="Open Ayah ${ayahNumber}">${ayahNumber}</a>`;
  }).join('');
}

export default function SurahCrawlableContent({ surah }: { surah: SurahIndexEntry }) {
  const ayahLinksHtml = buildAyahLinksHtml(surah);

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
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              All Ayahs
            </h3>
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[0.65rem] font-semibold text-[var(--color-muted-text)]">
              {surah.totalAyah} total
            </span>
          </div>

          <div
            className={AYAH_LINKS_CLASS}
            dangerouslySetInnerHTML={{ __html: ayahLinksHtml }}
          />
        </nav>

        <div className={ACTION_LINKS_CLASS} aria-label="Surah resources">
          <Link
            href={buildTafsirSurahPath(surah.id, surah.surahName)}
            className="gap-2 text-[var(--color-accent)]"
          >
            <FileText className="size-4" />
            Available Urdu Tafseer
          </Link>
          <Link href="/editorial-policy" className="text-[var(--color-heading)]">
            Sources &amp; editorial policy
          </Link>
          <Link href="/corrections" className="text-[var(--color-heading)]">
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
