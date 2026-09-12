import type { SurahIndexEntry } from '@/lib/quran-index';
import { buildSurahDownloadPath } from '@/lib/surah-download';
import { buildSurahPath } from '@/lib/quran-routing';

export function getSurahSeoIntro(surah: SurahIndexEntry): string {
  return `Surah ${surah.surahName} (${surah.surahNameTranslation}) is chapter ${surah.id} of the Quran and contains ${surah.totalAyah} ayahs. The reader provides Arabic text with Urdu and English translations. Choose an ayah below to open its reference page.`;
}

export function getSurahUrduTitle(surah: SurahIndexEntry): string {
  return `سورۃ ${surah.surahNameArabic}`;
}

export function getSurahMetaTitle(surah: SurahIndexEntry): string {
  return `Surah ${surah.surahName} — Arabic and Translation`;
}

export function getSurahMetaDescription(surah: SurahIndexEntry): string {
  return `Read the ${surah.totalAyah} ayahs of Surah ${surah.surahName} in Arabic with Urdu and English translations. Listen to recitation and save your reading place.`;
}

export function getTafsirSurahIntro(surah: SurahIndexEntry, tafsirAyahCount: number): string {
  return `Browse Urdu tafseer for ${tafsirAyahCount} of the ${surah.totalAyah} ayahs in Surah ${surah.surahName}. Each available commentary page identifies its source and links to the verse and translations.`;
}

export function getTafsirSurahMetaTitle(surah: SurahIndexEntry): string {
  return `Surah ${surah.surahName} — Urdu Tafseer`;
}

export function getTafsirSurahMetaDescription(surah: SurahIndexEntry, tafsirAyahCount: number): string {
  return getTafsirSurahIntro(surah, tafsirAyahCount);
}

export function getRelatedLinks(surah: SurahIndexEntry): Array<{ label: string; href: string }> {
  return [
    { label: `Read Surah ${surah.surahName}`, href: buildSurahPath(surah.id, surah.surahName) },
    { label: 'PDF and audio downloads', href: buildSurahDownloadPath(surah.id, surah.surahName) },
    { label: 'Sources and editorial policy', href: '/editorial-policy' },
    { label: 'Report a correction', href: '/corrections' },
  ];
}

export function getPrevNextSurah(surahId: number, allSurahs: SurahIndexEntry[]) {
  const idx = allSurahs.findIndex(s => s.id === surahId);
  return { prev: idx > 0 ? allSurahs[idx - 1] : null, next: idx >= 0 && idx < allSurahs.length - 1 ? allSurahs[idx + 1] : null };
}
