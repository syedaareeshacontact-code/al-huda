import { getAllSurahs } from '@/lib/quran-index';
import { getSiteOrigin } from '@/lib/seo';
import { SITEMAP_CACHE_CONTROL } from '@/lib/sitemap-config';
import { getAllTafsirRefs } from '@/lib/tafsir-index';
import { getAllCollections } from '@/lib/hadith/collections.service';

export const dynamic = 'force-static';
export const revalidate = 86400;
const SITEMAP_CHUNK_SIZE = 5_000;

function buildQuranSitemapNames() {
  const ayahCount = getAllSurahs().reduce((total, surah) => total + surah.totalAyah, 0);
  const tafsirCount = getAllTafsirRefs().length;

  return [
    'surah',
    'tafsir-surah',
    'download-surah',
    ...Array.from(
      { length: Math.ceil(ayahCount / SITEMAP_CHUNK_SIZE) },
      (_, index) => `ayah-${index + 1}`
    ),
    ...Array.from(
      { length: Math.ceil(tafsirCount / SITEMAP_CHUNK_SIZE) },
      (_, index) => `tafsir-${index + 1}`
    ),
  ];
}

async function buildHadithSitemapNames() {
  const collections = await getAllCollections();
  return [
    'hadith-collections',
    ...collections.flatMap((collection) =>
      Array.from(
        { length: Math.ceil(collection.hadiths_count / SITEMAP_CHUNK_SIZE) },
        (_, index) => `hadith-detail-${collection.bookSlug}-${index + 1}`
      )
    ),
  ];
}

async function renderSitemapIndexXml() {
  const origin = getSiteOrigin();
  const names = [...(await buildHadithSitemapNames()), ...buildQuranSitemapNames()];

  const extraSitemaps = [
    `${origin}/islamic-tools-sitemap.xml`,
  ];

  const chunkItems = names
    .map((name) => {
      return `<sitemap><loc>${origin}/sitemaps/${name}.xml</loc></sitemap>`;
    })
    .join('');

  const extraItems = extraSitemaps
    .map((url) => `<sitemap><loc>${url}</loc></sitemap>`)
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
