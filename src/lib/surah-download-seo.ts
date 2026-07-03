import type { SurahIndexEntry } from '@/lib/quran-index';

const DOWNLOAD_INTROS: Record<number, string> = {
  1: 'Surah Al-Fatiha PDF and audio download — the opening chapter recited in every Salah. Download Arabic mushaf PDF or Arabic+Urdu PDF with tarjuma, plus Mishari al-Afasy tilawat MP3.',
  2: 'Surah Al-Baqara download — the longest Quran chapter (286 ayahs). Get printable Arabic PDF, Arabic with Urdu tarjuma PDF, and full surah audio for offline listening.',
  18: 'Surah Al-Kahf download — recommended every Friday. Download PDF and audio to read and listen offline on Jumu\'ah.',
  36: 'Surah Yaseen download — the Heart of the Quran. Free PDF (Arabic / Arabic+Urdu) and MP3 audio for daily recitation.',
  55: 'Surah Ar-Rahman download — beautiful surah of divine blessings. PDF and audio available in Arabic and Urdu.',
  67: 'Surah Al-Mulk download — read before sleep for protection. Download complete PDF and tilawat audio.',
  112: 'Surah Al-Ikhlas download — equivalent to one-third of the Quran. Quick PDF and audio download in Arabic and Urdu.',
};

export function getDownloadPageIntro(surah: SurahIndexEntry): string {
  if (DOWNLOAD_INTROS[surah.id]) {
    return DOWNLOAD_INTROS[surah.id];
  }

  return `Download Surah ${surah.surahName} (${surah.surahNameTranslation}) as free PDF or audio. Choose Arabic-only PDF for hifz and tilawat, or Arabic+Urdu PDF with Fatah Muhammad Jalandhari tarjuma. Full surah MP3 tilawat and Urdu translation audio available for all ${surah.totalAyah} ayahs.`;
}

export function getDownloadPageTitle(surah: SurahIndexEntry): string {
  return `Download Surah ${surah.surahName} PDF & Audio — ${surah.surahNameArabic} | Arabic & Urdu Free`;
}

export function getDownloadPageDescription(surah: SurahIndexEntry): string {
  const intro = getDownloadPageIntro(surah).slice(0, 140);
  return `${intro}… Free PDF (Arabic, Arabic+Urdu) and MP3 audio download from Read al Quran.`;
}

export function getDownloadIndexTitle(): string {
  return 'Download Quran PDF & Audio — All 114 Surahs | Arabic & Urdu Free';
}

export function getDownloadIndexDescription(): string {
  return 'Download any Quran surah as free PDF (Arabic or Arabic+Urdu tarjuma) or MP3 audio (Arabic tilawat & Urdu translation). All 114 surahs available — Surah Yaseen, Al-Fatiha, Al-Baqara, Al-Kahf and more.';
}

export function buildDownloadPageKeywords(surah: SurahIndexEntry): string[] {
  const name = surah.surahName.toLowerCase();
  return [
    `surah ${name} pdf download`,
    `surah ${name} audio download`,
    `${name} quran pdf`,
    `${name} quran mp3`,
    `download surah ${name} arabic`,
    `download surah ${name} urdu`,
    `surah ${name} pdf urdu`,
    `quran pdf ${name}`,
    `quran audio ${name}`,
    `${surah.surahNameArabic} pdf`,
    `${surah.surahNameArabic} download`,
    'quran pdf download free',
    'quran audio download mp3',
    'surah pdf arabic urdu',
    'quran tilawat download',
  ];
}

export const DOWNLOAD_INDEX_KEYWORDS = [
  'download quran pdf',
  'quran pdf download free',
  'quran audio download',
  'quran mp3 download',
  'surah pdf download',
  'surah audio download mp3',
  'quran arabic pdf',
  'quran urdu pdf download',
  'quran with urdu translation pdf',
  'download surah yaseen pdf',
  'download surah fatiha pdf',
  'download surah baqarah pdf',
  'quran tilawat mp3 download',
  'full quran pdf download',
  '114 surah pdf',
];
