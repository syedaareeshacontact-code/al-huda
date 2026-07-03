import { getAllSurahs } from '@/lib/quran-index';
import { buildAyahPath, buildSurahPath, buildTafsirPath, buildTafsirSurahPath } from '@/lib/quran-routing';
import { buildSurahDownloadPath } from '@/lib/surah-download';
import { getAllCollections, getChaptersByCollection } from '@/lib/hadith/collections.service';
import {
  getAllHadithRefs,
  getHadithChunkNumber,
  HADITH_SITEMAP_CHUNK_SIZE,
} from '@/lib/hadith/hadith-index';
import {
  buildHadithBookPath,
  buildHadithCollectionPath,
  buildHadithDetailPath,
  buildHadithIndexPath,
} from '@/lib/hadith/hadith-routing';
import { getSiteOrigin } from '@/lib/seo';
import { getAllTafsirRefs } from '@/lib/tafsir-index';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const AYAH_SITEMAP_CHUNK_SIZE = 1000;
const TAFSIR_SITEMAP_CHUNK_SIZE = 800;

function escapeXml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildAllAyahRefs() {
  const surahs = getAllSurahs();
  const refs: Array<{ surahId: number; surahName: string; ayahNumber: number }> = [];

  surahs.forEach((surah) => {
    for (let ayahNumber = 1; ayahNumber <= surah.totalAyah; ayahNumber += 1) {
      refs.push({
        surahId: surah.id,
        surahName: surah.surahName,
        ayahNumber,
      });
    }
  });

  return refs;
}

function renderUrlSet(urls: string[], changeFrequency: string, priority: string) {
  const updatedAt = new Date().toISOString();
  const body = urls
    .map((url) => {
      return `<url><loc>${escapeXml(url)}</loc><lastmod>${updatedAt}</lastmod><changefreq>${changeFrequency}</changefreq><priority>${priority}</priority></url>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

function getAyahChunk(name: string) {
  const match = /^ayah-(\d+)$/.exec(name);
  if (!match) {
    return null;
  }

  const page = Number(match[1]);
  if (!Number.isInteger(page) || page < 1) {
    return null;
  }

  return page;
}

function getTafsirChunk(name: string) {
  const match = /^tafsir-(\d+)$/.exec(name);
  if (!match) {
    return null;
  }

  const page = Number(match[1]);
  if (!Number.isInteger(page) || page < 1) {
    return null;
  }

  return page;
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
      `${origin}/voice-search`,
      ...surahs.map((surah) => `${origin}${buildSurahPath(surah.id, surah.surahName)}`),
    ];

    return new Response(renderUrlSet(surahUrls, 'weekly', '0.8'), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
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
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    } catch (error) {
      console.warn('Hadith collections sitemap failed:', error);
      return new Response(renderUrlSet([`${origin}${buildHadithIndexPath()}`], 'weekly', '0.85'), {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    }
  }

  if (normalizedName === 'download-surah') {
    const downloadUrls = [
      `${origin}/download`,
      ...surahs.map((surah) => `${origin}${buildSurahDownloadPath(surah.id, surah.surahName)}`),
    ];

    return new Response(renderUrlSet(downloadUrls, 'weekly', '0.8'), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  }

  if (normalizedName === 'tafsir-surah') {
    const refs = getAllTafsirRefs();
    const surahIds = [...new Set(refs.map((r) => r.surahId))];
    const tafsirSurahUrls = [
      `${origin}/tafsir`,
      ...surahs
        .filter((s) => surahIds.includes(s.id))
        .map((surah) => `${origin}${buildTafsirSurahPath(surah.id, surah.surahName)}`),
    ];

    return new Response(renderUrlSet(tafsirSurahUrls, 'weekly', '0.75'), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  }

  const hadithChunk = getHadithChunkNumber(normalizedName);
  if (hadithChunk) {
    try {
      const refs = await getAllHadithRefs();
      const start = (hadithChunk - 1) * HADITH_SITEMAP_CHUNK_SIZE;
      const chunk = refs.slice(start, start + HADITH_SITEMAP_CHUNK_SIZE);

      if (chunk.length === 0) {
        return new Response('Not found.', { status: 404 });
      }

      const urls = chunk.map((entry) => {
        return `${origin}${buildHadithDetailPath(entry.collectionSlug, entry.hadithNumber)}`;
      });

      return new Response(renderUrlSet(urls, 'monthly', '0.75'), {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    } catch (error) {
      console.warn('Hadith detail sitemap chunk failed:', error);
      return new Response('Sitemap data unavailable.', { status: 500 });
    }
  }

  const ayahChunk = getAyahChunk(normalizedName);
  if (ayahChunk) {
    const refs = buildAllAyahRefs();
    const start = (ayahChunk - 1) * AYAH_SITEMAP_CHUNK_SIZE;
    const chunk = refs.slice(start, start + AYAH_SITEMAP_CHUNK_SIZE);

    if (chunk.length === 0) {
      return new Response('Not found.', { status: 404 });
    }

    const urls = chunk.map((entry) => {
      return `${origin}${buildAyahPath(entry.surahId, entry.surahName, entry.ayahNumber)}`;
    });

    return new Response(renderUrlSet(urls, 'weekly', '0.7'), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  }

  const tafsirChunk = getTafsirChunk(normalizedName);
  if (tafsirChunk) {
    const refs = getAllTafsirRefs();
    const start = (tafsirChunk - 1) * TAFSIR_SITEMAP_CHUNK_SIZE;
    const chunk = refs.slice(start, start + TAFSIR_SITEMAP_CHUNK_SIZE);

    if (chunk.length === 0) {
      return new Response('Not found.', { status: 404 });
    }

    const urls = chunk.map((entry) => {
      return `${origin}${buildTafsirPath(entry.surahId, entry.surahName, entry.ayahNumber)}`;
    });

    return new Response(renderUrlSet(urls, 'weekly', '0.65'), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  }

  return new Response('Not found.', { status: 404 });
}
