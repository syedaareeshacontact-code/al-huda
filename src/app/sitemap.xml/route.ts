import { getAllSurahs } from '@/lib/quran-index';
import { getSiteOrigin } from '@/lib/seo';
import { SITEMAP_CACHE_CONTROL, SITEMAP_LASTMOD } from '@/lib/sitemap-config';

export const dynamic = 'force-static';
export const revalidate = 86400;

function buildQuranSitemapNames() {
  return [
    'surah',
    'tafsir-surah',
    'download-surah',
    'ayah-featured',
    'tafsir-featured',
  ];
}

function buildHadithSitemapNames() {
  return ['hadith-collections', 'hadith-featured'];
}

async function renderSitemapIndexXml() {
  const origin = getSiteOrigin();
  const names = [...buildHadithSitemapNames(), ...buildQuranSitemapNames()];

  const extraSitemaps = [
    `${origin}/local-sitemap.xml`,
    `${origin}/islamic-tools-sitemap.xml`,
  ];

  const chunkItems = names
    .map((name) => {
      return `<sitemap><loc>${origin}/sitemaps/${name}.xml</loc><lastmod>${SITEMAP_LASTMOD}</lastmod></sitemap>`;
    })
    .join('');

  const extraItems = extraSitemaps
    .map((url) => `<sitemap><loc>${url}</loc><lastmod>${SITEMAP_LASTMOD}</lastmod></sitemap>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${chunkItems}${extraItems}</sitemapindex>`;
}

export async function GET() {
  const surahs = getAllSurahs();
  if (surahs.length === 0) {
    return new Response('Sitemap data unavailable.', { status: 500 });
  }

  return new Response(await renderSitemapIndexXml(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': SITEMAP_CACHE_CONTROL,
    },
  });
}
