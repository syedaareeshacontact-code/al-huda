import { getAllSurahs } from '@/lib/quran-index';
import { buildAyahPath, buildSurahPath, buildTafsirPath, buildTafsirSurahPath } from '@/lib/quran-routing';
import { buildSurahDownloadPath } from '@/lib/surah-download';
import { getAllCollections, getChaptersByCollection } from '@/lib/hadith/collections.service';
import { getCuratedHadithSitemapRefs } from '@/lib/hadith/hadith-index';
import {
  buildHadithBookPath,
  buildHadithCollectionPath,
  buildHadithDetailPath,
  buildHadithIndexPath,
} from '@/lib/hadith/hadith-routing';
import { getSiteOrigin } from '@/lib/seo';
import { SITEMAP_CACHE_CONTROL, SITEMAP_LASTMOD } from '@/lib/sitemap-config';
import { getAllTafsirRefs } from '@/lib/tafsir-index';
import {
  getFeaturedAyahRefs,
  getFeaturedTafsirRefs,
} from '@/lib/featured-quran-pages';

export const dynamic = 'force-static';
export const revalidate = 86400;

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
  return [
    'surah',
    'tafsir-surah',
    'download-surah',
    'ayah-featured',
    'tafsir-featured',
  ];
}

async function buildSitemapNames() {
  const names = ['hadith-collections', 'hadith-featured'];
  return [...names, ...buildQuranSitemapNames()];
}

export async function generateStaticParams() {
  const names = await buildSitemapNames();
  return names.map((name) => ({ name: `${name}.xml` }));
}

function renderUrlSet(urls: string[], changeFrequency: string, priority: string) {
  const body = urls
    .map((url) => {
      return `<url><loc>${escapeXml(url)}</loc><lastmod>${SITEMAP_LASTMOD}</lastmod><changefreq>${changeFrequency}</changefreq><priority>${priority}</priority></url>`;
    })
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
      `${origin}/tafsir`,
      `${origin}${buildHadithIndexPath()}`,
      `${origin}/read-quran-online`,
      ...surahs.map((surah) => `${origin}${buildSurahPath(surah.id, surah.surahName)}`),
    ];

    return new Response(renderUrlSet(surahUrls, 'weekly', '0.8'), {
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

      return new Response(renderUrlSet(hadithUrls, 'weekly', '0.85'), {
        headers: SITEMAP_HEADERS,
      });
    } catch (error) {
      console.warn('Hadith collections sitemap failed:', error);
      return new Response(renderUrlSet([`${origin}${buildHadithIndexPath()}`], 'weekly', '0.85'), {
        headers: SITEMAP_HEADERS,
      });
    }
  }

  if (normalizedName === 'hadith-featured') {
    const urls = getCuratedHadithSitemapRefs().map((entry) => {
      return `${origin}${buildHadithDetailPath(entry.collectionSlug, entry.hadithNumber)}`;
    });

    return new Response(renderUrlSet(urls, 'monthly', '0.55'), {
      headers: SITEMAP_HEADERS,
    });
  }

  if (normalizedName === 'download-surah') {
    const downloadUrls = [
      `${origin}/download`,
      ...surahs.map((surah) => `${origin}${buildSurahDownloadPath(surah.id, surah.surahName)}`),
    ];

    return new Response(renderUrlSet(downloadUrls, 'weekly', '0.8'), {
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

    return new Response(renderUrlSet(tafsirSurahUrls, 'weekly', '0.75'), {
      headers: SITEMAP_HEADERS,
    });
  }

  if (/^hadith-\d+$/.test(normalizedName)) {
    return new Response('Not found.', { status: 404 });
  }

  if (normalizedName === 'ayah-featured') {
    const urls = getFeaturedAyahRefs().map((entry) => {
      return `${origin}${buildAyahPath(entry.surahId, entry.surahName, entry.ayahNumber)}`;
    });

    return new Response(renderUrlSet(urls, 'monthly', '0.7'), {
      headers: SITEMAP_HEADERS,
    });
  }

  if (normalizedName === 'tafsir-featured') {
    const urls = getFeaturedTafsirRefs().map((entry) => {
      return `${origin}${buildTafsirPath(entry.surahId, entry.surahName, entry.ayahNumber)}`;
    });

    return new Response(renderUrlSet(urls, 'monthly', '0.65'), {
      headers: SITEMAP_HEADERS,
    });
  }

  return new Response('Not found.', { status: 404 });
}
