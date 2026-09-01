import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '@/lib/seo';

const baseUrl = getSiteOrigin();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: ['/', '/surah', '/surah/', '/download', '/tafsir', '/tafsir/', '/about', '/authors/', '/contact', '/read-quran-online', '/hadith', '/hadith/', '/prayer-times', '/prayer-times/', '/duas', '/duas/', '/azkar', '/99-names-of-allah', '/zakat-calculator', '/mosque-finder', '/mosque-finder/', '/articles', '/articles/'],
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
      },
      {
        userAgent: 'Bingbot',
        allow: ['/', '/surah', '/surah/', '/download', '/tafsir', '/tafsir/', '/about', '/authors/', '/contact', '/read-quran-online', '/hadith', '/hadith/', '/prayer-times', '/prayer-times/', '/duas', '/duas/', '/azkar', '/99-names-of-allah', '/zakat-calculator', '/mosque-finder', '/mosque-finder/', '/articles', '/articles/'],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/signin',
          '/signup',
          '/settings',
          '/practice',
        ],
      },
      {
        userAgent: '*',
        allow: ['/', '/surah', '/surah/', '/download', '/tafsir', '/tafsir/', '/about', '/authors/', '/contact', '/read-quran-online', '/hadith', '/hadith/', '/prayer-times', '/prayer-times/', '/duas', '/duas/', '/azkar', '/99-names-of-allah', '/zakat-calculator', '/mosque-finder', '/mosque-finder/', '/articles', '/articles/'],
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
      },
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`,
    ],
  };
}
