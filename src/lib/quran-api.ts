import type { SurahAudioOption, SurahDetail, SurahMeta, UrduTafsirEntry } from '@/types/quran';
import { isValidSurahId } from '@/lib/quran-utils';

const surahMetaCache = new Map<number, SurahMeta>();
const surahDetailCache = new Map<number, SurahDetail>();
const urduTafsirCache = new Map<string, UrduTafsirEntry>();
const surahMetaInFlight = new Map<number, Promise<SurahMeta>>();
const surahDetailInFlight = new Map<number, Promise<SurahDetail>>();
const urduTafsirInFlight = new Map<string, Promise<UrduTafsirEntry>>();

// Quran.com API configuration
const QURAN_COM_API = 'https://api.quran.com/api/v4';
const ENGLISH_TRANSLATION_ID = 20; // Sahih International
const URDU_TRANSLATION_ID = 234; // Fatah Muhammad Jalandhari (Urdu)
// The longest Surah has 286 ayahs. Quran.com's verse endpoint defaults to 10,
// so request enough rows to keep Arabic and every translation in sync.
const CHAPTER_VERSES_PER_PAGE = 300;

const QURAN_COM_RECITATION_IDS = [
  { id: 7, name: 'Mishari al Afasy' },
  { id: 4, name: 'Abu Bakr al Shatri' },
  { id: 5, name: 'Hani ar Rifai' },
] as const;

async function fetchRecitationOptions(
  surahId: number,
  signal?: AbortSignal
): Promise<SurahAudioOption[]> {
  const requests = QURAN_COM_RECITATION_IDS.map(async (recitation) => {
    const response = await fetch(
      `${QURAN_COM_API}/chapter_recitations/${recitation.id}/${surahId}`,
      {
        signal,
        cache: 'force-cache',
      }
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      audio_file?: { audio_url?: string };
    };

    const audioUrl = payload.audio_file?.audio_url;
    if (!audioUrl) {
      return null;
    }

    return {
      recitationId: recitation.id,
      reciter: recitation.name,
      originalUrl: audioUrl,
      url: audioUrl,
    } satisfies SurahAudioOption;
  });

  const results = await Promise.all(requests);
  return results.filter((item) => item !== null) as SurahAudioOption[];
}

export async function fetchSurahMeta(surahId: number, signal?: AbortSignal): Promise<SurahMeta> {
  if (!isValidSurahId(surahId)) {
    throw new Error('Invalid surah number');
  }

  const cached = surahMetaCache.get(surahId);
  if (cached) {
    return cached;
  }

  const inFlight = surahMetaInFlight.get(surahId);
  if (inFlight) {
    return inFlight;
  }

  const request = Promise.all([
    fetch(`${QURAN_COM_API}/chapters/${surahId}?language=en`, {
      signal,
      cache: 'force-cache',
    }),
    fetch(
      `${QURAN_COM_API}/verses/by_chapter/${surahId}?language=en&translations=${ENGLISH_TRANSLATION_ID},${URDU_TRANSLATION_ID}&per_page=${CHAPTER_VERSES_PER_PAGE}`,
      {
        signal,
        cache: 'force-cache',
      }
    ),
  ])
    .then(async ([chapterRes, versesRes]) => {
      if (!chapterRes.ok) {
        throw new Error(`Unable to load chapter metadata (${chapterRes.status})`);
      }
      if (!versesRes.ok) {
        throw new Error(`Unable to load verses (${versesRes.status})`);
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

      const chapter = chapterData.chapter || {};
      const verses = versesData.verses || [];
      
      const english: string[] = [];
      const urdu: string[] = [];

      verses.forEach((v) => {
        const translations = v.translations || [];
        const englishTrans = translations.find((t) => t.resource_id === ENGLISH_TRANSLATION_ID);
        const urduTrans = translations.find((t) => t.resource_id === URDU_TRANSLATION_ID);

        english.push(englishTrans?.text?.replace(/<[^>]*>/g, '') || '');
        urdu.push(urduTrans?.text?.replace(/<[^>]*>/g, '') || '');
      });

      const audioOptions = await fetchRecitationOptions(surahId, signal);
      const audio = audioOptions.reduce<Record<string, SurahAudioOption>>((acc, item) => {
        const key = String(item.recitationId ?? item.reciter ?? acc.length);
        acc[key] = item;
        return acc;
      }, {});

      const payload: SurahMeta = {
        surahName: chapter.name_simple || '',
        surahNameArabic: chapter.name_arabic || '',
        surahNameTranslation: chapter.translated_name?.name || '',
        revelationPlace: 'Unknown',
        totalAyah: chapter.verses_count || 0,
        surahNo: surahId,
        english,
        urdu,
        arabic1: [],
        audio,
      };

      surahMetaCache.set(surahId, payload);
      return payload;
    })
    .finally(() => {
      surahMetaInFlight.delete(surahId);
    });

  surahMetaInFlight.set(surahId, request);
  return request;
}

export async function fetchSurahDetail(
  surahId: number,
  signal?: AbortSignal
): Promise<SurahDetail> {
  if (!isValidSurahId(surahId)) {
    throw new Error('Invalid surah number');
  }

  const cached = surahDetailCache.get(surahId);
  if (cached) {
    return cached;
  }

  const inFlight = surahDetailInFlight.get(surahId);
  if (inFlight) {
    return inFlight;
  }

  const request = Promise.all([
    fetch(`${QURAN_COM_API}/chapters/${surahId}?language=en`, {
      signal,
      cache: 'force-cache',
    }),
    fetch(`${QURAN_COM_API}/quran/verses/uthmani?chapter_number=${surahId}`, {
      signal,
      cache: 'force-cache',
    }),
  ])
    .then(async ([chapterRes, textRes]) => {
      if (!chapterRes.ok) {
        throw new Error(`Unable to load chapter (${chapterRes.status})`);
      }
      if (!textRes.ok) {
        throw new Error(`Unable to load verses (${textRes.status})`);
      }

      const chapterData = (await chapterRes.json()) as {
        chapter?: {
          id?: number;
          name_simple?: string;
          translated_name?: { name?: string };
          verses_count?: number;
        };
      };
      const textData = (await textRes.json()) as {
        verses?: Array<{
          id?: number;
          verse_key?: string;
          text_uthmani?: string;
        }>;
      };

      const chapter = chapterData.chapter || {};
      const verses = textData.verses || [];

      const ayahs = verses.map((v, idx) => ({
        number: v.id || idx + 1,
        numberInSurah: idx + 1,
        text: v.text_uthmani || '',
      }));

      const payload: SurahDetail = {
        number: chapter.id || surahId,
        name: '',
        englishName: chapter.name_simple || '',
        englishNameTranslation: chapter.translated_name?.name || '',
        revelationType: 'Unknown',
        numberOfAyahs: chapter.verses_count || 0,
        ayahs,
      };

      surahDetailCache.set(surahId, payload);
      return payload;
    })
    .finally(() => {
      surahDetailInFlight.delete(surahId);
    });

  surahDetailInFlight.set(surahId, request);
  return request;
}

export async function fetchCompleteSurahContent(
  surahId: number,
  signal?: AbortSignal
): Promise<{ detail: SurahDetail; meta: SurahMeta }> {
  if (!isValidSurahId(surahId)) {
    throw new Error('Invalid surah number');
  }

  const response = await fetch(`/api/surah/${surahId}/content`, {
    signal,
    cache: 'force-cache',
  });

  if (!response.ok) {
    throw new Error(`Unable to load remaining ayahs (${response.status})`);
  }

  const payload = (await response.json()) as {
    detail?: SurahDetail;
    meta?: SurahMeta;
  };

  if (!payload.detail || !payload.meta) {
    throw new Error('Invalid surah content payload');
  }

  return { detail: payload.detail, meta: payload.meta };
}

export async function fetchUrduTafsirByAyah(
  surahId: number,
  ayahNumber: number,
  signal?: AbortSignal
): Promise<UrduTafsirEntry> {
  if (!isValidSurahId(surahId)) {
    throw new Error('Invalid surah number');
  }

  if (!Number.isInteger(ayahNumber) || ayahNumber < 1 || ayahNumber > 286) {
    throw new Error('Invalid ayah number');
  }

  const cacheKey = `${surahId}:${ayahNumber}`;
  const cached = urduTafsirCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const inFlight = urduTafsirInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const request = fetch(`/api/tafsir/ur?surah=${surahId}&ayah=${ayahNumber}`, {
    signal,
    cache: 'force-cache',
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Unable to load Urdu tafsir (${response.status})`);
      }

      const payload = (await response.json()) as UrduTafsirEntry;
      if (!payload?.textHtml) {
        throw new Error('Invalid Urdu tafsir payload');
      }

      urduTafsirCache.set(cacheKey, payload);
      return payload;
    })
    .finally(() => {
      urduTafsirInFlight.delete(cacheKey);
    });

  urduTafsirInFlight.set(cacheKey, request);
  return request;
}
