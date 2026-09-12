import Link from 'next/link';
import type { Metadata } from 'next';
import { Headphones, Languages, ListChecks } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSurahById } from '@/lib/quran-index';
import {
  buildAyahPath,
  buildSurahPath,
  buildTafsirPath,
} from '@/lib/quran-routing';
import { buildPageMetadata } from '@/lib/seo';

const POPULAR_SURAH_IDS = [1, 2, 18, 36, 55, 56, 67] as const;

function getSurahPath(surahId: number) {
  const surah = getSurahById(surahId);
  if (!surah) {
    return `/surah/${surahId}`;
  }

  return buildSurahPath(surah.id, surah.surahName);
}

function getAyahPath(surahId: number, ayahNumber: number) {
  const surah = getSurahById(surahId);
  if (!surah) {
    return `/surah/${surahId}?ayah=${ayahNumber}`;
  }

  return buildAyahPath(surah.id, surah.surahName, ayahNumber);
}

function getTafsirPath(surahId: number, ayahNumber: number) {
  const surah = getSurahById(surahId);
  if (!surah) {
    return `/tafsir/${surahId}?ayah=${ayahNumber}`;
  }

  return buildTafsirPath(surah.id, surah.surahName, ayahNumber);
}

export const metadata: Metadata = buildPageMetadata({
  title: 'A Guide to Reading the Quran Online',
  description:
    'Read Quran online with Arabic text, Urdu and English translation, ayah tafseer, and audio tilawat. Access Surah Yaseen, Rahman, Kahf, Mulk, Waqiah, and Ayat ul Kursi quickly.',
  path: '/read-quran-online',
  ogType: 'article',
  imageUrl: '/og?kind=surah-index',
});

export default function ReadQuranOnlinePage() {
  return (
    <div className="pb-16 pt-10" data-slot="page-shell">
      <section className="mb-8">
        <Badge className="mb-2">Read Quran Online</Badge>
        <h1 className="font-display text-4xl text-[var(--color-heading)] sm:text-5xl">
          Quran Online Reading with Urdu Translation, Audio, and Tafseer
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--color-muted-text)] sm:text-base">
          Read Quran Pak online with Arabic script, Urdu translation, English translation,
          audio tilawat, and ayah-wise tafseer. This page gives direct access to commonly
          read surahs, understand translations, listen to recitation, and open detailed
          ayah or tafseer pages.
        </p>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-xl">
              <Languages className="size-5 text-[var(--color-accent)]" />
              Translation Focus
            </CardTitle>
            <CardDescription>
              Arabic with Urdu and English translation modes.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-[var(--color-muted-text)]">
            <p>
              Select a Surah and use the reader settings to view Arabic alongside Fatah
              Muhammad Jalandhari&apos;s Urdu translation or Sahih International English translation.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-xl">
              <Headphones className="size-5 text-[var(--color-info)]" />
              Audio & Tilawat
            </CardTitle>
            <CardDescription>
              Listen Quran online, switch voice, and download audio.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-[var(--color-muted-text)]">
            <p>
              Start recitation from the Surah reader, choose an available reciter, follow
              ayah highlighting, and download audio where a source provides it.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-xl">
              <ListChecks className="size-5 text-[var(--color-highlight)]" />
              Ayah & Tafseer
            </CardTitle>
            <CardDescription>
              Ayah pages with translation and tafseer links.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-[var(--color-muted-text)]">
            <p>
              Every canonical ayah page provides its own Arabic text and translations.
              Where available, a separate Urdu tafseer page explains the selected ayah.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 font-display text-3xl text-[var(--color-heading)]">
          Popular Surah Links
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {POPULAR_SURAH_IDS.map((surahId) => {
            const surah = getSurahById(surahId);
            if (!surah) {
              return null;
            }

            return (
              <Link
                key={surah.id}
                href={getSurahPath(surah.id)}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text)] transition-colors hover:border-[var(--color-accent-soft)]"
              >
                {`Surah ${surah.surahName} (${surah.surahNameArabic})`}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 font-display text-3xl text-[var(--color-heading)]">
          Ayah and Tafseer Quick Access
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={getAyahPath(2, 255)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text)] transition-colors hover:border-[var(--color-accent-soft)]"
          >
            Ayat ul Kursi (Surah Al-Baqara 2:255) Arabic + Urdu + English + Audio
          </Link>
          <Link
            href={getAyahPath(2, 285)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text)] transition-colors hover:border-[var(--color-accent-soft)]"
          >
            Last 2 Ayat of Surah Baqarah (2:285-286)
          </Link>
          <Link
            href={getSurahPath(112)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text)] transition-colors hover:border-[var(--color-accent-soft)]"
          >
            3 Qul (Ikhlas, Falaq, Naas) with Translation
          </Link>
          <Link
            href={getTafsirPath(1, 1)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text)] transition-colors hover:border-[var(--color-accent-soft)]"
          >
            Surah Fatiha Ayah 1 Urdu Tafseer
          </Link>
        </div>
      </section>

      <section>
        <Link
          href="/surah"
          className="inline-flex items-center rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] transition-colors hover:border-[var(--color-accent-soft)]"
        >
          Open Complete Surah Index
        </Link>
      </section>
    </div>
  );
}
