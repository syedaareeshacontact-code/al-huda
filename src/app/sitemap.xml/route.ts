import { getHadithSitemapChunkCount } from '@/lib/hadith/hadith-index';
import { getAllSurahs, TOTAL_AYAHS } from '@/lib/quran-index';
import { getSiteOrigin } from '@/lib/seo';
import { getAllTafsirRefs } from '@/lib/tafsir-index';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const AYAH_SITEMAP_CHUNK_SIZE = 1000;
const TAFSIR_SITEMAP_CHUNK_SIZE = 800;

function buildQuranSitemapNames() {
  const ayahChunkCount = Math.max(1, Math.ceil(TOTAL_AYAHS / AYAH_SITEMAP_CHUNK_SIZE));
  const tafsirRefs = getAllTafsirRefs();
  const tafsirChunkCount = Math.max(
    1,
    Math.ceil(tafsirRefs.length / TAFSIR_SITEMAP_CHUNK_SIZE)
  );

  const names: string[] = ['surah'];

  for (let index = 1; index <= ayahChunkCount; index += 1) {
    names.push(`ayah-${index}`);
  }

  for (let index = 1; index <= tafsirChunkCount; index += 1) {
    names.push(`tafsir-${index}`);
  }

  return names;
}

async function buildHadithSitemapNames() {
  const names = ['hadith-collections'];

  try {
    const chunkCount = await getHadithSitemapChunkCount();
    for (let index = 1; index <= chunkCount; index += 1) {
      names.push(`hadith-${index}`);
    }
  } catch (error) {
    console.warn('Hadith sitemap chunk count unavailable:', error);
  }

  return names;
}

async function renderSitemapIndexXml() {
  const origin = getSiteOrigin();
  const updatedAt = new Date().toISOString();
  const names = [...(await buildHadithSitemapNames()), ...buildQuranSitemapNames()];

  const extraSitemaps = [
    `${origin}/local-sitemap.xml`,
    `${origin}/islamic-tools-sitemap.xml`,
    `${origin}/voice-sitemap.xml`,
  ];

  const chunkItems = names
    .map((name) => {
      return `<sitemap><loc>${origin}/sitemaps/${name}</loc><lastmod>${updatedAt}</lastmod></sitemap>`;
    })
    .join('');

  const extraItems = extraSitemaps
    .map((url) => `<sitemap><loc>${url}</loc><lastmod>${updatedAt}</lastmod></sitemap>`)
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
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
