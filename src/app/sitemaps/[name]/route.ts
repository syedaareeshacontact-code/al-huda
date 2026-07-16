import { getAllSurahs } from '@/lib/quran-index';
import { buildAyahPath, buildSurahPath, buildTafsirPath, buildTafsirSurahPath } from '@/lib/quran-routing';
import { buildSurahDownloadPath } from '@/lib/surah-download';
import { getAllCollections, getChaptersByCollection } from '@/lib/hadith/collections.service';
import {
  buildHadithBookPath,
  buildHadithCollectionPath,
  buildHadithDetailPath,
  buildHadithIndexPath,
} from '@/lib/hadith/hadith-routing';
import { getSiteOrigin } from '@/lib/seo';
import { SITEMAP_CACHE_CONTROL } from '@/lib/sitemap-config';
import { getAllTafsirRefs } from '@/lib/tafsir-index';

export const dynamic = 'force-static';
export const revalidate = 86400;
const SITEMAP_CHUNK_SIZE = 5_000;

function escapeXml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const SITEMAP_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': SITEMAP_CACHE_CONTROL,
};

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

async function buildSitemapNames() {
  const collections = await getAllCollections();
  const detailNames = collections.flatMap((collection) =>
    Array.from(
      { length: Math.ceil(collection.hadiths_count / SITEMAP_CHUNK_SIZE) },
      (_, index) => `hadith-detail-${collection.bookSlug}-${index + 1}`
    )
  );
  const names = ['hadith-collections', ...detailNames];
  return [...names, ...buildQuranSitemapNames()];
}

export async function generateStaticParams() {
  const names = await buildSitemapNames();
  return names.map((name) => ({ name: `${name}.xml` }));
}

function renderUrlSet(urls: string[]) {
  const body = urls
    .map((url) => `<url><loc>${escapeXml(url)}</loc></url>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> }
) {
  const { name } = await context.params;
  const normalizedName = name.endsWith('.xml') ? name.slice(0, -4) : name;
  const surahs = getAllSurahs();
  const origin = getSiteOrigin();

  if (surahs.length === 0) {
    return new Response('Sitemap data unavailable.', { status: 500 });
  }

  if (normalizedName === 'surah') {
    const surahUrls = [
      `${origin}/`,
      `${origin}/surah`,
      `${origin}/about`,
      `${origin}/contact`,
      `${origin}/editorial-policy`,
      `${origin}/corrections`,
      `${origin}/privacy-policy`,
      `${origin}/terms`,
      `${origin}/read-quran-online`,
      ...surahs.map((surah) => `${origin}${buildSurahPath(surah.id, surah.surahName)}`),
    ];

    return new Response(renderUrlSet(surahUrls), {
      headers: SITEMAP_HEADERS,
    });
  }

  if (normalizedName === 'hadith-collections') {
    try {
      const collections = await getAllCollections();
      const hadithUrls = [`${origin}${buildHadithIndexPath()}`];

      for (const collection of collections) {
        hadithUrls.push(`${origin}${buildHadithCollectionPath(collection.bookSlug)}`);
        hadithUrls.push(`${origin}${buildHadithBookPath(collection.bookSlug)}`);

        const chapters = await getChaptersByCollection(collection.bookSlug);
        for (const chapter of chapters) {
          hadithUrls.push(
            `${origin}${buildHadithBookPath(collection.bookSlug, {
              chapter: chapter.chapterNumber,
              page: 1,
            })}`
          );
        }
      }

      return new Response(renderUrlSet(hadithUrls), {
        headers: SITEMAP_HEADERS,
      });
    } catch (error) {
      console.warn('Hadith collections sitemap failed:', error);
      return new Response(renderUrlSet([`${origin}${buildHadithIndexPath()}`]), {
        headers: SITEMAP_HEADERS,
      });
    }
  }

  const hadithDetailMatch = normalizedName.match(/^hadith-detail-(.+)-(\d+)$/);
  if (hadithDetailMatch) {
    const [, collectionSlug, chunkNumber] = hadithDetailMatch;
    const collections = await getAllCollections();
    const collection = collections.find((entry) => entry.bookSlug === collectionSlug);
    const chunkIndex = Number(chunkNumber) - 1;

    if (!collection || chunkIndex < 0) {
      return new Response('Not found.', { status: 404 });
    }

    const start = chunkIndex * SITEMAP_CHUNK_SIZE + 1;
    const end = Math.min(collection.hadiths_count, (chunkIndex + 1) * SITEMAP_CHUNK_SIZE);
    if (start > end) {
      return new Response('Not found.', { status: 404 });
    }

    const urls = Array.from({ length: end - start + 1 }, (_, index) => {
      return `${origin}${buildHadithDetailPath(collection.bookSlug, start + index)}`;
    });

    return new Response(renderUrlSet(urls), {
      headers: SITEMAP_HEADERS,
    });
  }

  if (normalizedName === 'download-surah') {
    const downloadUrls = [
      `${origin}/download`,
      ...surahs.map((surah) => `${origin}${buildSurahDownloadPath(surah.id, surah.surahName)}`),
    ];

    return new Response(renderUrlSet(downloadUrls), {
      headers: SITEMAP_HEADERS,
    });
  }

  if (normalizedName === 'tafsir-surah') {
    const refs = getAllTafsirRefs();
    const surahIds = new Set(refs.map((r) => r.surahId));
    const tafsirSurahUrls = [
      `${origin}/tafsir`,
      ...surahs
        .filter((s) => surahIds.has(s.id))
        .map((surah) => `${origin}${buildTafsirSurahPath(surah.id, surah.surahName)}`),
    ];

    return new Response(renderUrlSet(tafsirSurahUrls), {
      headers: SITEMAP_HEADERS,
    });
  }

  const ayahChunkMatch = normalizedName.match(/^ayah-(\d+)$/);
  if (ayahChunkMatch) {
    const chunkIndex = Number(ayahChunkMatch[1]) - 1;
    const refs = surahs.flatMap((surah) =>
      Array.from({ length: surah.totalAyah }, (_, index) => ({
        surahId: surah.id,
        surahName: surah.surahName,
        ayahNumber: index + 1,
      }))
    );
    const chunk = refs.slice(
      chunkIndex * SITEMAP_CHUNK_SIZE,
      (chunkIndex + 1) * SITEMAP_CHUNK_SIZE
    );
    if (chunk.length === 0) {
      return new Response('Not found.', { status: 404 });
    }
    const urls = chunk.map((entry) => {
      return `${origin}${buildAyahPath(entry.surahId, entry.surahName, entry.ayahNumber)}`;
    });

    return new Response(renderUrlSet(urls), {
      headers: SITEMAP_HEADERS,
    });
  }

  const tafsirChunkMatch = normalizedName.match(/^tafsir-(\d+)$/);
  if (tafsirChunkMatch) {
    const chunkIndex = Number(tafsirChunkMatch[1]) - 1;
    const chunk = getAllTafsirRefs().slice(
      chunkIndex * SITEMAP_CHUNK_SIZE,
      (chunkIndex + 1) * SITEMAP_CHUNK_SIZE
    );
    if (chunk.length === 0) {
      return new Response('Not found.', { status: 404 });
    }
    const urls = chunk.map((entry) => {
      return `${origin}${buildTafsirPath(entry.surahId, entry.surahName, entry.ayahNumber)}`;
    });

    return new Response(renderUrlSet(urls), {
      headers: SITEMAP_HEADERS,
    });
  }

  return new Response('Not found.', { status: 404 });
}
