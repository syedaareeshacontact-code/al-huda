import { describe, expect, it } from 'vitest';

import {
  formatQuranArabicForDisplay,
  getQuranRecitationTokens,
  isQuranRecitationWord,
  toArabicIndicNumerals,
} from './arabic-utils';

describe('arabic-utils', () => {
  it('converts western digits to Arabic Indic numerals', () => {
    expect(toArabicIndicNumerals(209)).toBe('٢٠٩');
  });

  it('removes the Quranic rounded-zero mark from displayed ayah text', () => {
    const text = '\u0621\u064e\u0627\u0645\u064e\u0646\u064f\u0648\u0627\u06df \u0648\u064e\u0623\u064f\u0648\u06df\u0644\u064e\u0640\u0670\u0653\u0626\u0650\u0643\u064e';

    expect(formatQuranArabicForDisplay(text)).toBe(
      '\u0621\u064e\u0627\u0645\u064e\u0646\u064f\u0648\u0627 \u0648\u064e\u0623\u064f\u0648\u0644\u064e\u0640\u0670\u0653\u0626\u0650\u0643\u064e'
    );
  });

  it('keeps other Quranic combining marks intact', () => {
    const text = '\u0625\u0650\u0644\u0651\u064e\u0627\u0653';

    expect(formatQuranArabicForDisplay(text)).toBe(text);
  });

  it('counts Arabic words and disconnected letters as recitation words', () => {
    expect(isQuranRecitationWord('ٱللَّهُ')).toBe(true);
    expect(isQuranRecitationWord('الٓمٓ')).toBe(true);
  });

  it('does not count standalone Quran pause and section marks', () => {
    expect(isQuranRecitationWord('ۛ')).toBe(false);
    expect(isQuranRecitationWord('ۚ')).toBe(false);
    expect(isQuranRecitationWord('ۖ')).toBe(false);
    expect(isQuranRecitationWord('۞')).toBe(false);
  });

  it('keeps pause marks visible without shifting timestamp word positions', () => {
    const tokens = getQuranRecitationTokens(
      'ذَٰلِكَ ٱلْكِتَـٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ'
    );

    expect(tokens.map(({ wordIndex }) => wordIndex)).toEqual([
      1,
      2,
      3,
      4,
      null,
      5,
      null,
      6,
      7,
    ]);
  });
});
