import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '@/lib/seo';

const baseUrl = getSiteOrigin();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: ['/', '/surah', '/surah/', '/tafsir', '/tafsir/', '/about', '/contact', '/cities', '/read-quran-online', '/voice-search', '/hadith', '/hadith/', '/prayer-times', '/prayer-times/', '/duas', '/duas/', '/azkar', '/99-names-of-allah', '/zakat-calculator', '/mosque-finder', '/mosque-finder/'],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/signin',
          '/signup',
          '/settings',
          '/practice',
          '/quran',
          '/quran/',
          '/*?*search=*',
          '/*?*q=*',
          '/*?*filter=*',
        ],
        crawlDelay: 0,
      },
      {
        userAgent: 'Bingbot',
        allow: ['/', '/surah', '/surah/', '/tafsir', '/tafsir/', '/about', '/contact', '/cities', '/read-quran-online', '/voice-search', '/hadith', '/hadith/', '/prayer-times', '/prayer-times/', '/duas', '/duas/', '/azkar', '/99-names-of-allah', '/zakat-calculator', '/mosque-finder', '/mosque-finder/'],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/signin',
          '/signup',
          '/settings',
          '/practice',
          '/quran',
          '/quran/',
        ],
        crawlDelay: 1,
      },
      {
        userAgent: '*',
        allow: ['/', '/surah', '/surah/', '/tafsir', '/tafsir/', '/about', '/contact', '/cities', '/read-quran-online', '/voice-search', '/hadith', '/hadith/', '/prayer-times', '/prayer-times/', '/duas', '/duas/', '/azkar', '/99-names-of-allah', '/zakat-calculator', '/mosque-finder', '/mosque-finder/'],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/signin',
          '/signup',
          '/settings',
          '/practice',
          '/quran',
          '/quran/',
          '/*?*search=*',
          '/*?*q=*',
          '/*?*filter=*',
        ],
        crawlDelay: 2,
      },
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/hadith/sitemap.xml`,
      `${baseUrl}/sitemaps/hadith-collections`,
      `${baseUrl}/sitemaps/surah`,
      `${baseUrl}/sitemaps/tafsir-surah`,
      `${baseUrl}/local-sitemap.xml`,
      `${baseUrl}/voice-sitemap.xml`,
      `${baseUrl}/islamic-tools-sitemap.xml`,
    ],
    host: baseUrl,
  };
}
