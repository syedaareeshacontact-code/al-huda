import { describe, expect, it } from 'vitest';

import { getHadithMetaDescription } from './hadith-seo-content';
import type { HadithItem } from './hadith/types/hadith.types';

function createHadith(hadithEnglish: string | null): HadithItem {
  return {
    id: 1,
    hadithNumber: '42',
    englishNarrator: null,
    hadithEnglish,
    hadithUrdu: null,
    hadithArabic: null,
    urduNarrator: null,
    status: 'Sahih',
    book: {
      bookName: 'Test Collection',
      writerName: 'Test Writer',
      slug: 'test-collection',
      bookSlug: 'test-collection',
    },
    chapter: {
      chapterEnglish: 'Test Chapter',
      chapterUrdu: '',
      chapterArabic: '',
      chapterNumber: '1',
    },
  };
}

describe('getHadithMetaDescription', () => {
  it('uses the English text as the metadata snippet when available', () => {
    const description = getHadithMetaDescription(
      createHadith('Actions are judged according to intentions.')
    );

    expect(description).toContain('Actions are judged according to intentions.');
    expect(description).toContain('Test Collection');
  });

  it('returns a useful fallback when the API supplies null English text', () => {
    const description = getHadithMetaDescription(createHadith(null));

    expect(description).toBe(
      'Read Hadith 42 From Test Collection (Test Writer), chapter: Test Chapter. View the available Arabic text, English translation, and Urdu translation.'
    );
  });
});
