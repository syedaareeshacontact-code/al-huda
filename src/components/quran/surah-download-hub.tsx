import Link from 'next/link';
import { Download, FileText, Headphones, Music } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SurahIndexEntry } from '@/lib/quran-index';
import {
  buildSurahDownloadOptions,
  buildSurahDownloadPath,
  getAllSurahAudioSources,
  type SurahDownloadOption,
} from '@/lib/surah-download';
import { getDownloadPageIntro } from '@/lib/surah-download-seo';
import { buildSurahPath } from '@/lib/quran-routing';
import { getSurahUrduTitle } from '@/lib/surah-seo-content';
import AuthDownloadLink from '@/components/quran/auth-download-link';
import { encodeProtectedDownloadHref } from '@/lib/protected-download-token';

interface SurahDownloadHubProps {
  surah: SurahIndexEntry;
  compact?: boolean;
  audioSources?: Awaited<ReturnType<typeof getAllSurahAudioSources>>;
}

function DownloadOptionCard({ option }: { option: SurahDownloadOption }) {
  const Icon = option.type === 'pdf' ? FileText : Headphones;

  return (
    <Card className="overflow-hidden border-[var(--color-border)] transition hover:border-[var(--color-accent-soft)] hover:shadow-[var(--shadow-soft)]">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_90%)] sm:h-12 sm:w-12">
            <Icon className="size-5 text-[var(--color-accent)]" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold leading-snug text-[var(--color-heading)] sm:text-base">
                {option.label}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {option.format}
              </Badge>
            </div>
            <p className="urdu-font mt-0.5 text-sm text-[var(--color-accent-soft)]" dir="rtl" lang="ur">
              {option.labelUrdu}
            </p>
            <p className="mt-1 text-[13px] leading-5 text-[var(--color-muted-text)] sm:text-sm sm:leading-relaxed">
              {option.description}
            </p>
            <p className="mt-1 break-all font-mono text-[11px] leading-4 text-[var(--color-muted-text)] sm:text-xs">
              {option.fileName}
            </p>
          </div>
        </div>
        <AuthDownloadLink
          downloadToken={encodeProtectedDownloadHref(option.href)}
          fileName={option.fileName}
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] px-5 py-2.5 text-sm font-bold text-[var(--color-accent-foreground)] shadow-[0_4px_14px_-6px_color-mix(in_oklab,var(--color-accent),transparent_30%)] transition hover:brightness-110 sm:w-auto"
        >
          <Download className="size-4" aria-hidden="true" />
          Download
        </AuthDownloadLink>
      </CardContent>
    </Card>
  );
}

export default async function SurahDownloadHub({
  surah,
  compact = false,
  audioSources: prefetchedAudioSources,
}: SurahDownloadHubProps) {
  const audioSources = prefetchedAudioSources ?? (await getAllSurahAudioSources(surah.id));
  const options = buildSurahDownloadOptions(surah, audioSources);
  const pdfOptions = options.filter((o) => o.type === 'pdf');
  const audioOptions = options.filter((o) => o.type === 'audio');
  const intro = getDownloadPageIntro(surah);
  const urduTitle = getSurahUrduTitle(surah);

  if (compact) {
    return (
      <section
        aria-label={`Download Surah ${surah.surahName}`}
        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--color-heading)]">
              Download PDF & Audio
            </h2>
            <p className="urdu-font text-sm text-[var(--color-accent-soft)]" dir="rtl" lang="ur">
              PDF اور آڈیو ڈاؤن لوڈ
            </p>
          </div>
          <Link
            href={buildSurahDownloadPath(surah.id, surah.surahName)}
            className="text-sm font-semibold text-[var(--color-accent)] hover:underline"
          >
            All download options →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {options.slice(0, 4).map((option) => (
            <AuthDownloadLink
              key={option.id}
              downloadToken={encodeProtectedDownloadHref(option.href)}
              fileName={option.fileName}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)]"
            >
              <Download className="size-3.5" />
              {option.label}
            </AuthDownloadLink>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label={`Download Surah ${surah.surahName} PDF and audio`}>
      <div className="mb-5 sm:mb-6">
        <Badge className="mb-2">Free account required</Badge>
        <h1 className="font-display text-[1.85rem] font-bold leading-[1.05] text-[var(--color-heading)] sm:text-4xl">
          Download Surah {surah.surahName} — PDF & Audio
        </h1>
        <p className="urdu-font mt-2 text-lg text-[var(--color-accent-soft)] sm:text-xl" dir="rtl" lang="ur">
          {urduTitle} — PDF اور آڈیو ڈاؤن لوڈ
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--color-muted-text)] sm:text-base">
          {intro}
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:mb-8 sm:grid-cols-2 sm:gap-4">
        <Link
          href={buildSurahPath(surah.id, surah.surahName)}
          className="flex min-h-16 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 transition hover:border-[var(--color-accent-soft)] sm:p-4"
        >
          <FileText className="size-5 text-[var(--color-accent)]" />
          <div>
            <p className="font-semibold text-[var(--color-heading)]">Read Online</p>
            <p className="text-xs text-[var(--color-muted-text)]">Surah {surah.surahName} with tafseer</p>
          </div>
        </Link>
        <Link
          href="/download"
          className="flex min-h-16 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 transition hover:border-[var(--color-accent-soft)] sm:p-4"
        >
          <Music className="size-5 text-[var(--color-accent)]" />
          <div>
            <p className="font-semibold text-[var(--color-heading)]">All Surah Downloads</p>
            <p className="text-xs text-[var(--color-muted-text)]">114 surahs PDF & audio</p>
          </div>
        </Link>
      </div>

      <Card className="mb-5 sm:mb-6">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="inline-flex items-center gap-2 text-base leading-snug sm:text-lg">
            <FileText className="size-5 text-[var(--color-accent)]" />
            PDF Downloads — Arabic & Urdu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-6 sm:pt-0">
          {pdfOptions.map((option) => (
            <DownloadOptionCard key={option.id} option={option} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="inline-flex items-center gap-2 text-base leading-snug sm:text-lg">
            <Headphones className="size-5 text-[var(--color-accent)]" />
            Audio Downloads — Tilawat & Urdu Translation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-6 sm:pt-0">
          {audioOptions.map((option) => (
            <DownloadOptionCard key={option.id} option={option} />
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
