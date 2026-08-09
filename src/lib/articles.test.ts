import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getArticlesForSurah } from './articles';

describe('Surah article recommendations', () => {
  it('prioritizes a dedicated Surah guide over general resources', () => {
    const articles = getArticlesForSurah(36, 3);

    expect(articles).toHaveLength(3);
    expect(articles[0]?.slug).toBe('surah-yaseen-benefits-and-meaning');
    expect(articles[0]?.relatedSurahs).toContain(36);
  });

  it('selects the dedicated Al-Kahf guide for Surah 18', () => {
    const articles = getArticlesForSurah(18, 3);

    expect(articles[0]?.slug).toBe('why-read-surah-al-kahf-on-friday');
  });

  it('keeps exact metadata matches ahead of fallback articles without duplicates', () => {
    const articles = getArticlesForSurah(73, 4);
    const slugs = articles.map((article) => article.slug);

    expect(articles.slice(0, 3).every((article) => article.relatedSurahs.includes(73))).toBe(true);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('provides useful Quran-learning fallbacks for an unmapped Surah', () => {
    const articles = getArticlesForSurah(114, 3);

    expect(articles).toHaveLength(3);
    expect(articles.map((article) => article.slug)).toEqual([
      'how-to-read-the-quran-with-understanding',
      'how-to-start-reading-the-quran',
      'daily-quran-reading-plan',
    ]);
  });

  it('rejects invalid Surah IDs and non-positive limits', () => {
    expect(getArticlesForSurah(0, 3)).toEqual([]);
    expect(getArticlesForSurah(115, 3)).toEqual([]);
    expect(getArticlesForSurah(1, 0)).toEqual([]);
  });
});
