const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;
const QURANIC_ROUNDED_ZERO_MARK = /\u06df/g;

export function toArabicIndicNumerals(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => ARABIC_INDIC_DIGITS[Number(digit)] ?? digit);
}

export function formatQuranArabicForDisplay(value: string): string {
  return value.replace(QURANIC_ROUNDED_ZERO_MARK, '');
}

/**
 * Quran text contains standalone pause, sajdah, and rub-el-hizb marks separated
 * by spaces. Quran.com word timestamps intentionally do not assign those marks
 * a word position, so only tokens containing an actual letter may advance the
 * audio word index.
 */
export function isQuranRecitationWord(value: string): boolean {
  return /\p{Letter}/u.test(value);
}

export interface QuranRecitationToken {
  text: string;
  wordIndex: number | null;
}

export function getQuranRecitationTokens(value: string): QuranRecitationToken[] {
  const tokens = formatQuranArabicForDisplay(value).trim().split(/\s+/).filter(Boolean);
  let wordIndex = 0;

  return tokens.map((text) => ({
    text,
    wordIndex: isQuranRecitationWord(text) ? ++wordIndex : null,
  }));
}
