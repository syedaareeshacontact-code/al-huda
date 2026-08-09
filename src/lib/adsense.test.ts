import { describe, expect, it } from 'vitest';

import { shouldLoadAdSense } from './adsense';

describe('AdSense route allowlist', () => {
  it.each([
    '/',
    '/articles',
    '/articles/',
    '/articles/category/surah-guides',
    '/articles/surah-yaseen-benefits-and-meaning',
    '/surah/18-al-kahf',
    '/surah/18-al-kahf/',
    '/surah/36-yaseen',
  ])('loads AdSense on approved content route %s', (pathname) => {
    expect(shouldLoadAdSense(pathname)).toBe(true);
  });

  it.each([
    '/surah',
    '/surah/1-al-faatiha',
    '/surah/18-al-kahf/ayah/1',
    '/surah/36-yaseen/download',
    '/tafsir',
    '/tafsir/36-yaseen/1',
    '/hadith',
    '/hadith/sahih-bukhari',
    '/download',
    '/donate',
    '/feedback',
    '/privacy-policy',
    '/contact',
    '/admin',
    '/api/quran/ayah',
  ])('does not load AdSense on excluded route %s', (pathname) => {
    expect(shouldLoadAdSense(pathname)).toBe(false);
  });

  it('rejects missing and malformed pathnames', () => {
    expect(shouldLoadAdSense(null)).toBe(false);
    expect(shouldLoadAdSense(undefined)).toBe(false);
    expect(shouldLoadAdSense('articles')).toBe(false);
  });
});
