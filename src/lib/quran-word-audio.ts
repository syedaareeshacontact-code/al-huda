export const QURAN_WORD_AUDIO_BASE_URL = 'https://audio.qurancdn.com';

export interface SurahWordAudioWord {
  wordIndex: number;
  audioUrl: string;
  text?: string;
}

export interface SurahAyahWordAudio {
  ayahNumber: number;
  words: SurahWordAudioWord[];
}

export interface SurahWordAudioPayload {
  surahId: number;
  ayahs: SurahAyahWordAudio[];
}

export interface QuranComWordAudioWord {
  position?: number;
  audio_url?: string | null;
  char_type_name?: string;
  text_uthmani?: string;
  text?: string;
}

export interface QuranComWordAudioVerse {
  verse_number?: number;
  verse_key?: string;
  words?: QuranComWordAudioWord[];
}

function padQuranSegment(value: number) {
  return String(value).padStart(3, '0');
}

function getAyahNumber(verse: QuranComWordAudioVerse, surahId: number) {
  const verseNumber = Number(verse.verse_number);
  if (Number.isInteger(verseNumber) && verseNumber > 0) {
    return verseNumber;
  }

  const [chapterPart, ayahPart] = String(verse.verse_key ?? '').split(':');
  const chapterNumber = Number(chapterPart);
  const ayahNumber = Number(ayahPart);

  if (
    chapterNumber === surahId &&
    Number.isInteger(ayahNumber) &&
    ayahNumber > 0
  ) {
    return ayahNumber;
  }

  return null;
}

export function normalizeQuranWordAudioUrl(audioPath: string | null | undefined) {
  const value = audioPath?.trim();
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.pathname.includes('/wbw/')) {
        return `${QURAN_WORD_AUDIO_BASE_URL}${url.pathname}${url.search}`;
      }
    } catch {
      return null;
    }

    return value;
  }

  return `${QURAN_WORD_AUDIO_BASE_URL}/${value.replace(/^\/+/, '')}`;
}

export function buildQuranWordAudioFallbackUrl(
  surahId: number,
  ayahNumber: number,
  wordPosition: number
) {
  return `${QURAN_WORD_AUDIO_BASE_URL}/wbw/${padQuranSegment(surahId)}_${padQuranSegment(
    ayahNumber
  )}_${padQuranSegment(wordPosition)}.mp3`;
}

export function parseQuranComWordAudioPayload(
  surahId: number,
  verses: QuranComWordAudioVerse[] | null | undefined
): SurahWordAudioPayload {
  const ayahs = new Map<number, SurahWordAudioWord[]>();

  for (const verse of verses ?? []) {
    const ayahNumber = getAyahNumber(verse, surahId);
    if (!ayahNumber) {
      continue;
    }

    const spokenWords = (verse.words ?? [])
      .map((word, sourceOrder) => ({
        word,
        sourceOrder,
        sourcePosition: Number(word.position),
      }))
      .filter(({ word }) => word.char_type_name === 'word')
      .sort((left, right) => {
        const leftHasPosition =
          Number.isInteger(left.sourcePosition) && left.sourcePosition > 0;
        const rightHasPosition =
          Number.isInteger(right.sourcePosition) && right.sourcePosition > 0;

        if (leftHasPosition && rightHasPosition) {
          return left.sourcePosition - right.sourcePosition;
        }

        return left.sourceOrder - right.sourceOrder;
      });

    const recitationWords = spokenWords.map(({ word }, index) => {
      const displayedWordIndex = index + 1;
      // Quran.com's audio_url can retain standalone pause-glyph positions even
      // though its spoken-word position is compact. After a pause this points
      // at the next word and can make the final URL a 404. WBW CDN files use
      // the compact spoken-word sequence, so always build the canonical URL.
      const audioUrl = buildQuranWordAudioFallbackUrl(
        surahId,
        ayahNumber,
        displayedWordIndex
      );

      return {
        // The reader numbers only spoken words. Keep every spoken word in this
        // sequence even when Quran.com omits its audio_url, otherwise all later
        // click targets shift to the next word.
        wordIndex: displayedWordIndex,
        audioUrl,
        text: word.text_uthmani ?? word.text,
      };
    });

    if (recitationWords.length > 0) {
      ayahs.set(ayahNumber, recitationWords);
    }
  }

  return {
    surahId,
    ayahs: Array.from(ayahs.entries())
      .sort(([left], [right]) => left - right)
      .map(([ayahNumber, words]) => ({
        ayahNumber,
        words,
      })),
  };
}
