import { describe, expect, it } from 'vitest';
import { getAvailableHadithNumbers, validateSearchRecords, type SearchRecord } from './search-policy';
import { buildPageMetadata } from './metadata';
import { canonicalUrl, normalizeSiteOrigin } from './site';
import { serializeJsonLd } from './structured-data';

const record = (path: string, overrides: Partial<SearchRecord> = {}): SearchRecord => ({
  path, section: 'pages', source: 'test', available: true, index: true, ...overrides,
});

describe('search publication policy', () => {
  it('excludes unavailable and noindex records without losing eligible pages', () => {
    expect(validateSearchRecords([record('/a'), record('/b', { index: false }), record('/c', { available: false })]).map(r => r.path)).toEqual(['/a']);
  });
  it.each(['/api/private', '/admin', '/auth/verified', '/feedback', '/instagram', '/hadith/search', '/surah?q=test', '/surah#test', '//example.com', '/surah/'])('rejects noncanonical or excluded sitemap paths: %s', path => {
    expect(() => validateSearchRecords([record(path)])).toThrow();
  });
  it('rejects duplicate records and invented future freshness', () => {
    expect(() => validateSearchRecords([record('/a'), record('/a')])).toThrow(/Duplicate/);
    expect(() => validateSearchRecords([record('/a', { lastModified: '2999-01-01' })])).toThrow(/date/);
  });
  it('uses actual readable Hadith numbers including gaps, not a count range', () => {
    expect(getAvailableHadithNumbers([
      { hadithNumber: '1', hadithArabic: 'نص' }, { hadithNumber: '7', hadithEnglish: 'Text' },
      { hadithNumber: '7', hadithEnglish: 'Text' }, { hadithNumber: '9', hadithArabic: '' },
      { hadithNumber: '../10', hadithArabic: 'نص' },
    ])).toEqual(['1', '7']);
  });
});

describe('metadata and structured data', () => {
  it('removes tracking and filter parameters from canonical and sharing URLs', () => {
    const meta = buildPageMetadata({ title: 'Hadith list', description: 'Browse narrations.', path: '/hadith/book?page=2&utm_source=test', index: false });
    expect(meta.alternates).toEqual({ canonical: canonicalUrl('/hadith/book') });
    expect(meta.robots).toMatchObject({ index: false, follow: true, googleBot: { index: false } });
    expect(meta).not.toHaveProperty('keywords');
    expect(meta.openGraph).toMatchObject({ url: canonicalUrl('/hadith/book') });
  });
  it.each(['https://example.com/path', 'https://user:pass@example.com', 'javascript:alert(1)', 'https://example.com?tracking=1'])('rejects malformed origins: %s', origin => {
    expect(() => normalizeSiteOrigin(origin)).toThrow();
  });
  it('escapes script delimiters without changing Arabic or the JSON data', () => {
    const data = { text: '</script><script>alert(1)</script> & القرآن\u2028' };
    const output = serializeJsonLd(data);
    expect(output).not.toContain('<');
    expect(output).not.toContain('&');
    expect(JSON.parse(output)).toEqual(data);
  });
});
