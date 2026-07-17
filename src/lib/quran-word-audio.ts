export const QURAN_WORD_AUDIO_BASE_URL = 'https://verses.quran.foundation';

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
    return value;
  }

  return `${QURAN_WORD_AUDIO_BASE_URL}/${value.replace(/^\/+/, '')}`;
}

export function buildQuranWordAudioFallbackUrl(
  surahId: number,
  ayahNumber: number,
  wordIndex: number
) {
  return `${QURAN_WORD_AUDIO_BASE_URL}/wbw/${padQuranSegment(surahId)}_${padQuranSegment(
    ayahNumber
  )}_${padQuranSegment(wordIndex)}.mp3`;
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

    for (const word of verse.words ?? []) {
      const wordIndex = Number(word.position);
      const audioUrl = normalizeQuranWordAudioUrl(word.audio_url);

      if (
        word.char_type_name !== 'word' ||
        !Number.isInteger(wordIndex) ||
        wordIndex < 1 ||
        !audioUrl
      ) {
        continue;
      }

      const words = ayahs.get(ayahNumber) ?? [];
      words.push({
        wordIndex,
        audioUrl,
        text: word.text_uthmani ?? word.text,
      });
      ayahs.set(ayahNumber, words);
    }
  }

  return {
    surahId,
    ayahs: Array.from(ayahs.entries())
      .sort(([left], [right]) => left - right)
      .map(([ayahNumber, words]) => ({
        ayahNumber,
        words: words.sort((left, right) => left.wordIndex - right.wordIndex),
      })),
  };
}
