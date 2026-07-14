import 'server-only';

import type { SurahIndexEntry } from '@/lib/quran-index';
import type { AyahContentEntry } from '@/lib/quran-server';
import { buildSurahSlug, buildUrduTranslationAudioUrl } from '@/lib/quran-routing';

export type SurahPdfVariant = 'arabic' | 'arabic-urdu';
export type SurahAudioVariant = 'arabic' | 'urdu';

export const SURAH_RECITERS = [
  { id: 7, name: 'Mishari al-Afasy', slug: 'mishari-al-afasy' },
  { id: 4, name: 'Abu Bakr al-Shatri', slug: 'abu-bakr-al-shatri' },
  { id: 5, name: 'Hani ar-Rifai', slug: 'hani-ar-rifai' },
] as const;

export type SurahReciterId = (typeof SURAH_RECITERS)[number]['id'];

const QURAN_COM_API = 'https://api.quran.com/api/v4';
const PERMANENT_QURAN_AUDIO_FETCH = {
  cache: 'force-cache',
} as const;

export function slugifyDownloadName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function buildSurahDownloadPath(surahId: number, surahName: string): string {
  return `/surah/${buildSurahSlug(surahId, surahName)}/download`;
}

export function buildSurahPdfPublicPath(surahId: number, variant: SurahPdfVariant): string {
  return `/surah-pdfs/${String(surahId).padStart(3, '0')}-${variant}.pdf`;
}

export function buildSurahPdfFileName(surah: SurahIndexEntry, variant: SurahPdfVariant): string {
  const slug = slugifyDownloadName(surah.surahName);
  const suffix = variant === 'arabic' ? 'arabic' : 'arabic-urdu';
  return `surah-${String(surah.id).padStart(3, '0')}-${slug}-${suffix}.pdf`;
}

export function buildSurahAudioFileName(
  surah: SurahIndexEntry,
  variant: SurahAudioVariant,
  reciterName?: string
): string {
  const slug = slugifyDownloadName(surah.surahName);
  if (variant === 'urdu') {
    return `surah-${String(surah.id).padStart(3, '0')}-${slug}-urdu-translation.ogg`;
  }
  const reciterSlug = slugifyDownloadName(reciterName ?? 'arabic');
  return `surah-${String(surah.id).padStart(3, '0')}-${slug}-${reciterSlug}.mp3`;
}

export async function getSurahArabicAudioUrl(
  surahId: number,
  reciterId: SurahReciterId = SURAH_RECITERS[0].id
): Promise<string | null> {
  try {
    const response = await fetch(
      `${QURAN_COM_API}/chapter_recitations/${reciterId}/${surahId}`,
      PERMANENT_QURAN_AUDIO_FETCH
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      audio_file?: { audio_url?: string };
    };

    return payload.audio_file?.audio_url ?? null;
  } catch {
    return null;
  }
}

export async function getSurahUrduAudioUrl(surahId: number): Promise<string> {
  return buildUrduTranslationAudioUrl(surahId);
}

export async function getAllSurahAudioSources(surahId: number) {
  const results = await Promise.all(
    SURAH_RECITERS.map(async (reciter) => {
      const url = await getSurahArabicAudioUrl(surahId, reciter.id);
      return url ? { ...reciter, url } : null;
    })
  );

  const arabicSources = results.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  const urduUrl = await getSurahUrduAudioUrl(surahId);

  return { arabicSources, urduUrl };
}

export interface SurahDownloadOption {
  id: string;
  label: string;
  labelUrdu: string;
  description: string;
  href: string;
  fileName: string;
  format: string;
  type: 'pdf' | 'audio';
}

export function buildSurahDownloadOptions(
  surah: SurahIndexEntry,
  audioSources: Awaited<ReturnType<typeof getAllSurahAudioSources>>
): SurahDownloadOption[] {
  const options: SurahDownloadOption[] = [
    {
      id: 'pdf-arabic',
      label: 'Arabic PDF',
      labelUrdu: 'عربی PDF',
      description: `Complete Surah ${surah.surahName} in Arabic script (Uthmani) — printable PDF for offline reading and memorization.`,
      href: buildSurahPdfPublicPath(surah.id, 'arabic'),
      fileName: buildSurahPdfFileName(surah, 'arabic'),
      format: 'PDF',
      type: 'pdf',
    },
    {
      id: 'pdf-arabic-urdu',
      label: 'Arabic + Urdu PDF',
      labelUrdu: 'عربی + اردو PDF',
      description: `Surah ${surah.surahName} with Arabic text and Urdu tarjuma (Fatah Muhammad Jalandhari) — ideal for Pakistani readers.`,
      href: buildSurahPdfPublicPath(surah.id, 'arabic-urdu'),
      fileName: buildSurahPdfFileName(surah, 'arabic-urdu'),
      format: 'PDF',
      type: 'pdf',
    },
  ];

  for (const source of audioSources.arabicSources) {
    options.push({
      id: `audio-arabic-${source.id}`,
      label: `Arabic Audio — ${source.name}`,
      labelUrdu: `عربی آڈیو — ${source.name}`,
      description: `Full surah tilawat by ${source.name}. Download MP3 for offline listening.`,
      href: source.url,
      fileName: buildSurahAudioFileName(surah, 'arabic', source.name),
      format: 'MP3',
      type: 'audio',
    });
  }

  options.push({
    id: 'audio-urdu',
    label: 'Urdu Translation Audio',
    labelUrdu: 'اردو ترجمہ آڈیو',
    description: `Complete Urdu tarjuma audio of Surah ${surah.surahName} — listen and download for offline use.`,
    href: audioSources.urduUrl,
    fileName: buildSurahAudioFileName(surah, 'urdu'),
    format: 'OGG',
    type: 'audio',
  });

  return options;
}

export function getBismillahText(): string {
  return 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
}

export function shouldShowBismillah(surahId: number): boolean {
  return surahId !== 1 && surahId !== 9;
}

export type { AyahContentEntry };
