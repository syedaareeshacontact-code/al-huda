import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  toAbsoluteUrl,
} from '@/lib/seo';
import type { SurahIndexEntry } from '@/lib/quran-index';
import {
  buildAyahPath,
  buildSurahPath,
  buildTafsirPath,
  buildTafsirSurahPath,
} from '@/lib/quran-routing';
import type { SurahDownloadOption } from '@/lib/surah-download';
import { hasTafsirForAyah } from '@/lib/tafsir-index';

const MAX_SCHEMA_LIST_ITEMS = 40;

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

  const creativeWork = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: `Surah ${surah.surahName} (${surah.surahNameArabic})`,
    description: intro,
    url: toAbsoluteUrl(path),
    inLanguage: ['ar', 'ur', 'en'],
    numberOfItems: ayahCount,
    isPartOf: {
      '@type': 'Book',
      name: 'The Holy Quran',
    },
  };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Ayahs of Surah ${surah.surahName}`,
    numberOfItems: surah.totalAyah,
    itemListElement: Array.from(
      { length: Math.min(surah.totalAyah, MAX_SCHEMA_LIST_ITEMS) },
      (_, i) => {
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
      }
    ),
  };

  return { breadcrumb, webPage, book: creativeWork, itemList };
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
  });

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Urdu Tafseer — Surah ${surah.surahName}`,
    numberOfItems: ayahNumbers.length,
    itemListElement: ayahNumbers.slice(0, MAX_SCHEMA_LIST_ITEMS).map((ayahNumber, index) => ({
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
  });

  return { breadcrumb, article };
}

export { buildFaqJsonLd };

export function buildSurahDownloadSchemas(
  surah: SurahIndexEntry,
  options: SurahDownloadOption[],
  downloadPath: string
) {
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: 'Downloads', item: '/download' },
    { name: `Surah ${surah.surahName}`, item: buildSurahPath(surah.id, surah.surahName) },
    { name: 'Download PDF & Audio', item: downloadPath },
  ]);

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Download Surah ${surah.surahName} PDF & Audio`,
    description: `Free PDF and audio download for Surah ${surah.surahName} in Arabic and Urdu.`,
    url: toAbsoluteUrl(downloadPath),
    inLanguage: ['ar', 'ur', 'en'],
    isPartOf: {
      '@type': 'WebSite',
      name: 'Read al Quran',
      url: toAbsoluteUrl('/'),
    },
  };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Surah ${surah.surahName} Download Options`,
    numberOfItems: options.length,
    itemListElement: options.map((option, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: option.label,
    })),
  };

  return { breadcrumb, webPage, itemList };
}

export function buildDownloadIndexSchemas(totalSurahs: number) {
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: 'Quran Downloads', item: '/download' },
  ]);

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Download Quran PDF & Audio — All 114 Surahs',
    description: 'Free PDF and audio downloads for all 114 Quran surahs in Arabic and Urdu.',
    url: toAbsoluteUrl('/download'),
    inLanguage: ['ar', 'ur', 'en'],
    numberOfItems: totalSurahs,
  };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Quran Surah Downloads',
    numberOfItems: totalSurahs,
    itemListElement: {
      '@type': 'ListItem',
      position: 1,
      name: 'All 114 Surah PDF & Audio Downloads',
      url: toAbsoluteUrl('/download'),
    },
  };

  return { breadcrumb, webPage, itemList };
}
