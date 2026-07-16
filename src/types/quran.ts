export interface SurahAudioOption {
  reciter?: string;
  url?: string;
  originalUrl?: string;
  recitationId?: number;
}

export interface SurahListItem {
  id: number;
  surahName: string;
  surahNameArabic: string;
  surahNameArabicLong?: string;
  surahNameTranslation: string;
  revelationPlace: string;
  totalAyah: number;
  surahNo: number;
  audio?: Record<string, SurahAudioOption>;
}

export interface SurahAyah {
  number: number;
  numberInSurah: number;
  text: string;
}

export interface SurahDetail {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: SurahAyah[];
}

export interface SurahMeta {
  surahName: string;
  surahNameArabic: string;
  surahNameArabicLong?: string;
  surahNameTranslation: string;
  revelationPlace: string;
  totalAyah: number;
  surahNo: number;
  english?: string[];
  urdu?: string[];
  arabic1?: string[];
  audio?: Record<string, SurahAudioOption>;
  verses?: Array<{
    verse_number: number;
    text_uthmani?: string;
    english?: string;
    urdu?: string;
  }>;
}

export interface UrduTafsirEntry {
  surahId: number;
  ayahNumber: number;
  sourceId: number;
  sourceName: string;
  textHtml: string;
}

export interface AyahDetailPayload {
  surahId: number;
  ayahNumber: number;
  arabicText: string;
  englishTranslation: string;
  urduTranslation: string;
  audio: {
    arabic: string | null;
    urdu: string | null;
  };
  hasTafsir: boolean;
  tafsir: UrduTafsirEntry | null;
}

export interface AyahBookmark {
  id: string;
  surahId: number;
  ayahNumber: number;
  text: string;
  createdAt: string;
}

export interface LastReadEntry {
  surahId: number;
  ayahNumber: number;
  updatedAt: string;
}

export type SurahSortBy = 'id' | 'surahName' | 'totalAyah';
export type SortOrder = 'asc' | 'desc';
