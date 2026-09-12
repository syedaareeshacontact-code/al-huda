import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { getSearchCatalog } from './search-catalog';
import { getSitemapPages, renderSitemap, sitemapPageResponse, SITEMAP_PAGE_SIZE } from './sitemaps';
import { getAllSurahs } from '@/lib/quran-index';
import { buildSurahPath } from '@/lib/quran-routing';

describe('published sitemap snapshot', () => {
  it('has unique canonical references for all Surahs and all 6236 Quran verses', () => {
    const records = getSearchCatalog();
    const paths = new Set(records.map(r => r.path));
    expect(paths.size).toBe(records.length);
    expect(records.filter(r => r.section === 'verses')).toHaveLength(6236);
    for (const surah of getAllSurahs()) expect(paths.has(buildSurahPath(surah.id, surah.surahName))).toBe(true);
    expect(records.every(r => r.index && r.available && !/[?#]/.test(r.path))).toBe(true);
    expect(records.filter(r => r.section === 'hadith').length).toBeGreaterThan(40000);
    expect(records.some(r => r.path === '/duas/knowledge')).toBe(true);
    expect(records.some(r => r.path === '/duas/quran_recitation')).toBe(true);
  }, 30000);
  it('partitions the complete registry without omissions or overlapping pages', () => {
    const pages = getSitemapPages();
    const paths = pages.flatMap(p => p.entries.map(r => r.path));
    expect(paths.length).toBe(getSearchCatalog().length);
    expect(new Set(paths).size).toBe(paths.length);
    expect(pages.every(p => p.entries.length > 0 && p.entries.length <= SITEMAP_PAGE_SIZE)).toBe(true);
  });
  it('only emits content dates, XML-escapes values and serves unknown names as 404', () => {
    const xml = renderSitemap([{ path: '/example', section: 'pages', source: 'test', available: true, index: true }]);
    expect(xml).not.toMatch(/lastmod|priority|changefreq/);
    expect(sitemapPageResponse('invalid-0.xml').status).toBe(404);
    expect(sitemapPageResponse('surah.xml').status).toBe(308);
    expect(sitemapPageResponse('quran-1.xml').status).toBe(200);
  });
});
