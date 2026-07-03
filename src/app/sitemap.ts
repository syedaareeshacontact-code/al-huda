import type { MetadataRoute } from 'next';
import { getAllSurahs } from '@/lib/quran-index';
import { buildSurahPath } from '@/lib/quran-routing';
import { getSiteOrigin } from '@/lib/seo';

export const revalidate = 86400; // Revalidate sitemap cache daily

/**
 * Next.js dynamic sitemap.xml generator
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  const currentDate = new Date();

  // 1. Home Page - changeFrequency: weekly, priority: 1.0
  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: `${origin}/`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 1.0,
  };

  // 2. Main Sections - changeFrequency: monthly, priority: 0.8
  const mainSections = [
    '/surah',
    '/hadith',
    '/tafsir',
    '/about',
    '/contact',
    '/read-quran-online',
    '/voice-search',
    '/prayer-times',
    '/duas',
    '/azkar',
    '/99-names-of-allah',
    '/zakat-calculator',
    '/mosque-finder',
  ];

  const mainSectionEntries: MetadataRoute.Sitemap = mainSections.map((path) => ({
    url: `${origin}${path}`,
    lastModified: currentDate,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  // 3. Surah Pages (114 Surahs: /surah/1-al-faatiha through /surah/114-an-naas)
  // changeFrequency: monthly, priority: 0.8
  const surahs = getAllSurahs();
  const surahEntries: MetadataRoute.Sitemap = surahs.map((surah) => ({
    url: `${origin}${buildSurahPath(surah.id, surah.surahName)}`,
    lastModified: currentDate,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  // 4. Hadith Collection Pages (7 major collections: /hadith/sahih-bukhari through /hadith/mishkat)
  // changeFrequency: monthly, priority: 0.8
  const hadithCollections = [
    'sahih-bukhari',
    'sahih-muslim',
    'al-tirmidhi',
    'abu-dawood',
    'ibn-e-majah',
    'sunan-nasai',
    'mishkat',
  ];

  const hadithEntries: MetadataRoute.Sitemap = hadithCollections.map((slug) => ({
    url: `${origin}/hadith/${slug}`,
    lastModified: currentDate,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [homeEntry, ...mainSectionEntries, ...surahEntries, ...hadithEntries];
}
