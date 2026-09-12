import { getSearchCatalog } from './search-catalog';
import type { SearchRecord, SearchSection } from './search-policy';
import { toAbsoluteUrl } from './site';
import { SITEMAP_CACHE_CONTROL } from '@/lib/sitemap-config';

export const SITEMAP_PAGE_SIZE = 2000;
const SECTIONS: SearchSection[] = ['pages', 'quran', 'verses', 'tafsir', 'downloads', 'hadith', 'articles', 'tools'];
const HEADERS = { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': SITEMAP_CACHE_CONTROL };

export function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function getSitemapPages(records = getSearchCatalog()) {
  return SECTIONS.flatMap(section => {
    const entries = records.filter(record => record.section === section);
    return Array.from({ length: Math.ceil(entries.length / SITEMAP_PAGE_SIZE) }, (_, page) => ({
      name: `${section}-${page + 1}.xml`, section,
      entries: entries.slice(page * SITEMAP_PAGE_SIZE, (page + 1) * SITEMAP_PAGE_SIZE),
    }));
  });
}

export function renderSitemap(entries: SearchRecord[]) {
  const items = entries.map(entry => `<url><loc>${escapeXml(toAbsoluteUrl(entry.path))}</loc>${entry.lastModified ? `<lastmod>${escapeXml(entry.lastModified)}</lastmod>` : ''}</url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}

export function sitemapIndexResponse(section?: SearchSection) {
  const pages = getSitemapPages().filter(page => !section || page.section === section);
  const items = pages.map(page => `<sitemap><loc>${escapeXml(toAbsoluteUrl(`/sitemaps/${page.name}`))}</loc></sitemap>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</sitemapindex>`, { headers: HEADERS });
}

export function sitemapPageResponse(name: string) {
  if (/^(surah|tafsir-surah|download-surah|hadith-collections|ayah-\d+|tafsir-\d+|hadith-detail-[a-z-]+-\d+)\.xml$/.test(name) && !getSitemapPages().some(page => page.name === name)) {
    return new Response(null, { status: 308, headers: { Location: toAbsoluteUrl('/sitemap.xml') } });
  }
  const page = getSitemapPages().find(page => page.name === name);
  if (!page) return new Response('Sitemap not found.', { status: 404, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  return new Response(renderSitemap(page.entries), { headers: HEADERS });
}
