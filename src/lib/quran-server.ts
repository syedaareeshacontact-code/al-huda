import 'server-only';

import { cache } from 'react';

import type { SurahDetail, SurahMeta, UrduTafsirEntry } from '@/types/quran';

const QURAN_COM_API = 'https://api.quran.com/api/v4';
const ENGLISH_TRANSLATION_ID = 20; // Sahih International
const URDU_TRANSLATION_ID = 234; // Fatah Muhammad Jalandhari (Urdu)
// Quran.com's default page size is 10; 300 covers every ayah in a chapter.
const CHAPTER_VERSES_PER_PAGE = 300;
const QURAN_COM_TAFSIR_IDS = [160, 159, 818, 157] as const;
const PERMANENT_QURAN_FETCH = {
  cache: 'force-cache',
} as const;

export interface AyahContentEntry {
  ayahNumber: number;
  arabicText: string;
  englishTranslation: string;
  urduTranslation: string;
}

interface QuranComTafsirPayload {
  tafsir?: {
    resource_name?: string;
    text?: string;
  };
}

export const getSurahMetaById = cache(async (surahId: number): Promise<SurahMeta> => {
  const [chapterRes, versesRes, textRes] = await Promise.all([
    fetch(`${QURAN_COM_API}/chapters/${surahId}?language=en`, {
      ...PERMANENT_QURAN_FETCH,
      signal: AbortSignal.timeout(10_000),
    }),
    fetch(
      `${QURAN_COM_API}/verses/by_chapter/${surahId}?language=en&translations=${ENGLISH_TRANSLATION_ID},${URDU_TRANSLATION_ID}&per_page=${CHAPTER_VERSES_PER_PAGE}`,
      {
        ...PERMANENT_QURAN_FETCH,
        signal: AbortSignal.timeout(10_000),
      }
    ),
    fetch(`${QURAN_COM_API}/quran/verses/uthmani?chapter_number=${surahId}`, {
      ...PERMANENT_QURAN_FETCH,
      signal: AbortSignal.timeout(10_000),
    }),
  ]);

  if (!chapterRes.ok) {
    throw new Error(`Unable to load chapter metadata (${chapterRes.status})`);
  }
  if (!versesRes.ok) {
    throw new Error(`Unable to load verses (${versesRes.status})`);
  }
  if (!textRes.ok) {
    throw new Error(`Unable to load Quran text (${textRes.status})`);
  }

  const chapterData = (await chapterRes.json()) as {
    chapter?: {
      name_arabic?: string;
      name_simple?: string;
      translated_name?: { name?: string };
      verses_count?: number;
    };
  };
  const versesData = (await versesRes.json()) as {
    verses?: Array<{
      verse_number?: number;
      translations?: Array<{
        resource_id?: number;
        text?: string;
      }>;
    }>;
  };
  const textData = (await textRes.json()) as {
    verses?: Array<{
      text_uthmani?: string;
    }>;
  };

  const chapter = chapterData.chapter || {};
  const verses = versesData.verses || [];
  const textVerses = textData.verses || [];
  
  const english: string[] = [];
  const urdu: string[] = [];
  const arabic: string[] = [];

  verses.forEach((v) => {
    const translations = v.translations || [];
    const englishTrans = translations.find((t) => t.resource_id === ENGLISH_TRANSLATION_ID);
    const urduTrans = translations.find((t) => t.resource_id === URDU_TRANSLATION_ID);

    english.push(englishTrans?.text?.replace(/<[^>]*>/g, '') || '');
    urdu.push(urduTrans?.text?.replace(/<[^>]*>/g, '') || '');
  });

  arabic.push(...textVerses.map((item) => String(item.text_uthmani ?? '')));

  return {
    surahName: chapter.name_simple || '',
    surahNameArabic: chapter.name_arabic || '',
    surahNameTranslation: chapter.translated_name?.name || '',
    revelationPlace: 'Unknown',
    totalAyah: chapter.verses_count || 0,
    surahNo: surahId,
    english,
    urdu,
    arabic1: arabic,
    audio: {},
  };
});

export const getAyahRowsForSurah = cache(async (surahId: number): Promise<AyahContentEntry[]> => {
  const surahMeta = await getSurahMetaById(surahId);
  const totalAyahs = Math.max(0, Number(surahMeta.totalAyah ?? 0));
  const arabic = Array.isArray(surahMeta.arabic1) ? surahMeta.arabic1 : [];
  const english = Array.isArray(surahMeta.english) ? surahMeta.english : [];
  const urdu = Array.isArray(surahMeta.urdu) ? surahMeta.urdu : [];

  return Array.from({ length: totalAyahs }, (_, index) => ({
    ayahNumber: index + 1,
    arabicText: String(arabic[index] ?? '').trim(),
    englishTranslation: String(english[index] ?? '').trim(),
    urduTranslation: String(urdu[index] ?? '').trim(),
  }));
});

export const getSurahDetailById = cache(async (surahId: number): Promise<SurahDetail> => {
  const surahMeta = await getSurahMetaById(surahId);
  const ayahRows = await getAyahRowsForSurah(surahId);

  return {
    number: surahId,
    name: surahMeta.surahNameArabic,
    englishName: surahMeta.surahName,
    englishNameTranslation: surahMeta.surahNameTranslation,
    revelationType: surahMeta.revelationPlace,
    numberOfAyahs: surahMeta.totalAyah,
    ayahs: ayahRows.map((ayah) => ({
      number: ayah.ayahNumber,
      numberInSurah: ayah.ayahNumber,
      text: ayah.arabicText,
    })),
  };
});

export const getAyahContent = cache(async (surahId: number, ayahNumber: number) => {
  const ayahs = await getAyahRowsForSurah(surahId);
  const match = ayahs.find((entry) => entry.ayahNumber === ayahNumber);

  return match ?? null;
});

export const getAyahAudioUrls = cache(async (surahId: number, ayahNumber: number) => {
  const [arabicResult, urduResult] = await Promise.allSettled([
    fetch(`${QURAN_COM_API}/verses/by_verse/ar-default/${surahId}:${ayahNumber}`, {
      ...PERMANENT_QURAN_FETCH,
      signal: AbortSignal.timeout(8_000),
    }),
    fetch(
      `https://ia801503.us.archive.org/28/items/quran_urdu_audio_only/${String(surahId).padStart(3, '0')}.json`,
      {
        ...PERMANENT_QURAN_FETCH,
        signal: AbortSignal.timeout(8_000),
      }
    ),
  ]);

  const arabicResponse = arabicResult.status === 'fulfilled' ? arabicResult.value : null;
  const urduResponse = urduResult.status === 'fulfilled' ? urduResult.value : null;

  let arabicAudio: string | null = null;
  let urduAudio: string | null = null;

  if (arabicResponse?.ok) {
    try {
      const arabicData = (await arabicResponse.json()) as {
        verses?: Array<{
          audio?: {
            url?: string;
          };
        }>;
      };
      const verse = arabicData.verses?.[0];
      arabicAudio = verse?.audio?.url || null;
    } catch {
      arabicAudio = null;
    }
  }

  if (urduResponse?.ok) {
    try {
      const urduData = (await urduResponse.json()) as {
        [ayah: string]: string;
      };
      urduAudio = urduData[String(ayahNumber)] || null;
    } catch {
      urduAudio = null;
    }
  }

  return {
    arabic: arabicAudio,
    urdu: urduAudio,
  };
});

export const getUrduTafsirByAyah = cache(
  async (surahId: number, ayahNumber: number): Promise<UrduTafsirEntry | null> => {
    for (const sourceId of QURAN_COM_TAFSIR_IDS) {
      let response: Response;
      try {
        response = await fetch(
          `${QURAN_COM_API}/tafsirs/${sourceId}/by_ayah/${surahId}:${ayahNumber}`,
          {
            headers: {
              Accept: 'application/json',
            },
            ...PERMANENT_QURAN_FETCH,
            signal: AbortSignal.timeout(8_000),
          }
        );
      } catch {
        continue;
      }

      if (!response.ok) {
        continue;
      }

      let payload: QuranComTafsirPayload;
      try {
        payload = (await response.json()) as QuranComTafsirPayload;
      } catch {
        continue;
      }
      const textHtml = String(payload.tafsir?.text ?? '').trim();
      if (!textHtml) {
        continue;
      }

      return {
        surahId,
        ayahNumber,
        sourceId,
        sourceName: String(payload.tafsir?.resource_name ?? 'Urdu Tafseer'),
        textHtml,
      };
    }

    return null;
  }
);

export function sanitizeTafsirHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\sstyle='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

export function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
