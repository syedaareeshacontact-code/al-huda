import type { SurahIndexEntry } from '@/lib/quran-index';

export function getDownloadPageIntro(surah: SurahIndexEntry): string {
  return `Save Surah ${surah.surahName} for offline reading or listening. Choose an Arabic PDF, an Arabic PDF with Urdu translation, or an available audio download. A free account is required to download files.`;
}
export function getDownloadPageTitle(surah: SurahIndexEntry): string {
  return `Surah ${surah.surahName} — PDF and Audio Downloads`;
}
export function getDownloadPageDescription(surah: SurahIndexEntry): string {
  return `Download Surah ${surah.surahName} as an Arabic or Arabic–Urdu PDF, or save its recitation audio. Sign in with a free account to download.`;
}
export function getDownloadIndexTitle(): string { return 'Quran PDF and Audio Downloads'; }
export function getDownloadIndexDescription(): string {
  return 'Choose a Surah to download its Arabic PDF, Arabic–Urdu PDF or recitation audio for offline use. Downloads require a free account.';
}
