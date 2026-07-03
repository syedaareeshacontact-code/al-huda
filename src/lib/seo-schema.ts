import {
  buildArticleJsonLd,
  buildBookJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  toAbsoluteUrl,
} from '@/lib/seo';
import type { SurahIndexEntry } from '@/lib/quran-index';
import { buildAyahPath, buildSurahPath, buildTafsirPath, buildTafsirSurahPath } from '@/lib/quran-routing';
import { hasTafsirForAyah } from '@/lib/tafsir-index';

export function buildSurahPageSchemas(
  surah: SurahIndexEntry,
  intro: string,
  ayahCount: number
) {
  const path = buildSurahPath(surah.id, surah.surahName);

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: 'Surah Index', item: '/surah' },
    { name: `Surah ${surah.surahName}`, item: path },
  ]);

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Surah ${surah.surahName} — Read Online with Translation`,
    description: intro,
    url: toAbsoluteUrl(path),
    inLanguage: ['ar', 'ur', 'en'],
    isPartOf: {
      '@type': 'WebSite',
      name: 'Read al Quran',
      url: toAbsoluteUrl('/'),
    },
  };

  const book = buildBookJsonLd({
    name: `Surah ${surah.surahName} (${surah.surahNameArabic})`,
    description: intro,
    path,
    author: 'Allah (revealed to Prophet Muhammad ﷺ)',
    numberOfPages: ayahCount,
    inLanguage: ['ar', 'ur', 'en'],
  });

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Ayahs of Surah ${surah.surahName}`,
    numberOfItems: surah.totalAyah,
    itemListElement: Array.from({ length: surah.totalAyah }, (_, i) => {
      const ayahNum = i + 1;
      const ayahPath = buildAyahPath(surah.id, surah.surahName, ayahNum);
      const tafsirPath = hasTafsirForAyah(surah.id, ayahNum)
        ? buildTafsirPath(surah.id, surah.surahName, ayahNum)
        : null;

      return {
        '@type': 'ListItem',
        position: ayahNum,
        name: `Ayah ${surah.id}:${ayahNum}`,
        url: toAbsoluteUrl(ayahPath),
        ...(tafsirPath && {
          additionalProperty: {
            '@type': 'PropertyValue',
            name: 'tafseer',
            value: toAbsoluteUrl(tafsirPath),
          },
        }),
      };
    }),
  };

  return { breadcrumb, webPage, book, itemList };
}

export function buildAyahPageSchemas(options: {
  surah: SurahIndexEntry;
  ayahNumber: number;
  arabicText: string;
  urduTranslation: string;
  englishTranslation: string;
  hasTafsir: boolean;
}) {
  const { surah, ayahNumber, arabicText, urduTranslation, englishTranslation, hasTafsir } = options;
  const surahPath = buildSurahPath(surah.id, surah.surahName);
  const ayahPath = buildAyahPath(surah.id, surah.surahName, ayahNumber);

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: `Surah ${surah.surahName}`, item: surahPath },
    { name: `Ayah ${ayahNumber}`, item: ayahPath },
  ]);

  const article = buildArticleJsonLd({
    title: `Ayah ${surah.id}:${ayahNumber} — Surah ${surah.surahName}`,
    description: `${urduTranslation || englishTranslation}`.slice(0, 200),
    content: [arabicText, urduTranslation, englishTranslation].filter(Boolean).join('\n'),
    url: ayahPath,
    inLanguage: ['ar', 'ur', 'en'],
    author: 'Read al Quran',
  });

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Ayah ${surah.id}:${ayahNumber} of Surah ${surah.surahName}`,
    url: toAbsoluteUrl(ayahPath),
    inLanguage: ['ar', 'ur', 'en'],
    ...(hasTafsir && {
      relatedLink: toAbsoluteUrl(buildTafsirPath(surah.id, surah.surahName, ayahNumber)),
    }),
  };

  return { breadcrumb, article, webPage };
}

export function buildTafsirSurahPageSchemas(options: {
  surah: SurahIndexEntry;
  intro: string;
  ayahNumbers: number[];
}) {
  const { surah, intro, ayahNumbers } = options;
  const surahPath = buildSurahPath(surah.id, surah.surahName);
  const tafsirSurahPath = buildTafsirSurahPath(surah.id, surah.surahName);

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: 'Tafseer Index', item: '/tafsir' },
    { name: `Surah ${surah.surahName} Tafseer`, item: tafsirSurahPath },
  ]);

  const article = buildArticleJsonLd({
    title: `Surah ${surah.surahName} — Complete Urdu Tafseer`,
    description: intro,
    url: tafsirSurahPath,
    inLanguage: ['ur', 'ar', 'en'],
    author: 'Read al Quran',
  });

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Urdu Tafseer — Surah ${surah.surahName}`,
    numberOfItems: ayahNumbers.length,
    itemListElement: ayahNumbers.map((ayahNumber, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: `Tafseer Ayah ${surah.id}:${ayahNumber}`,
      url: toAbsoluteUrl(buildTafsirPath(surah.id, surah.surahName, ayahNumber)),
    })),
  };

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Surah ${surah.surahName} Tafseer — Urdu Commentary`,
    description: intro,
    url: toAbsoluteUrl(tafsirSurahPath),
    inLanguage: ['ur', 'ar', 'en'],
    relatedLink: toAbsoluteUrl(surahPath),
    isPartOf: {
      '@type': 'WebSite',
      name: 'Read al Quran',
      url: toAbsoluteUrl('/'),
    },
  };

  return { breadcrumb, article, itemList, webPage };
}

export function buildTafsirPageSchemas(options: {
  surah: SurahIndexEntry;
  ayahNumber: number;
  tafsirText: string;
}) {
  const { surah, ayahNumber, tafsirText } = options;
  const surahPath = buildSurahPath(surah.id, surah.surahName);
  const ayahPath = buildAyahPath(surah.id, surah.surahName, ayahNumber);
  const tafsirPath = buildTafsirPath(surah.id, surah.surahName, ayahNumber);

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: `Surah ${surah.surahName}`, item: surahPath },
    { name: `Ayah ${ayahNumber}`, item: ayahPath },
    { name: 'Urdu Tafseer', item: tafsirPath },
  ]);

  const article = buildArticleJsonLd({
    title: `Tafseer of Ayah ${surah.id}:${ayahNumber} — Surah ${surah.surahName}`,
    description: tafsirText.slice(0, 200),
    content: tafsirText.slice(0, 500),
    url: tafsirPath,
    inLanguage: ['ur', 'ar', 'en'],
    author: 'Read al Quran',
  });

  return { breadcrumb, article };
}

export { buildFaqJsonLd };
