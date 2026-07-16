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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function SurahCrawlableContent({ surah }: { surah: SurahIndexEntry }) {
  const ayahLinksHtml = Array.from({ length: surah.totalAyah }, (_, index) => {
    const ayahNumber = index + 1;
    const ayahPath = buildAyahPath(surah.id, surah.surahName, ayahNumber);
    return `<a href="${escapeHtml(ayahPath)}">${ayahNumber}</a>`;
  }).join('');

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
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            All Ayahs
          </h3>
          <div
            className="flex flex-wrap gap-1.5 [&_a]:inline-flex [&_a]:min-w-10 [&_a]:items-center [&_a]:justify-center [&_a]:rounded-lg [&_a]:border [&_a]:border-[var(--color-border)] [&_a]:px-2 [&_a]:py-1 [&_a]:text-xs [&_a]:font-semibold [&_a]:text-[var(--color-heading)] hover:[&_a]:border-[var(--color-accent-soft)] hover:[&_a]:bg-[var(--color-surface-2)]"
            dangerouslySetInnerHTML={{ __html: ayahLinksHtml }}
          />
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
