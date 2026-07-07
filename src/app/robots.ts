import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '@/lib/seo';

const baseUrl = getSiteOrigin();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: ['/', '/surah', '/surah/', '/download', '/tafsir', '/tafsir/', '/about', '/contact', '/read-quran-online', '/hadith', '/hadith/', '/prayer-times', '/prayer-times/', '/duas', '/duas/', '/azkar', '/99-names-of-allah', '/zakat-calculator', '/mosque-finder', '/mosque-finder/'],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/signin',
          '/signup',
          '/settings',
          '/practice',
          '/*?*search=*',
          '/*?*q=*',
          '/*?*filter=*',
        ],
        crawlDelay: 0,
      },
      {
        userAgent: 'Bingbot',
        allow: ['/', '/surah', '/surah/', '/download', '/tafsir', '/tafsir/', '/about', '/contact', '/read-quran-online', '/hadith', '/hadith/', '/prayer-times', '/prayer-times/', '/duas', '/duas/', '/azkar', '/99-names-of-allah', '/zakat-calculator', '/mosque-finder', '/mosque-finder/'],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/signin',
          '/signup',
          '/settings',
          '/practice',
        ],
        crawlDelay: 1,
      },
      {
        userAgent: '*',
        allow: ['/', '/surah', '/surah/', '/download', '/tafsir', '/tafsir/', '/about', '/contact', '/read-quran-online', '/hadith', '/hadith/', '/prayer-times', '/prayer-times/', '/duas', '/duas/', '/azkar', '/99-names-of-allah', '/zakat-calculator', '/mosque-finder', '/mosque-finder/'],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/signin',
          '/signup',
          '/settings',
          '/practice',
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
      `${baseUrl}/sitemaps/hadith-collections.xml`,
      `${baseUrl}/sitemaps/surah.xml`,
      `${baseUrl}/sitemaps/tafsir-surah.xml`,
      `${baseUrl}/sitemaps/download-surah.xml`,
      `${baseUrl}/local-sitemap.xml`,
      `${baseUrl}/islamic-tools-sitemap.xml`,
    ],
    host: baseUrl,
  };
}
