import type { MetadataRoute } from 'next';

const defaultSiteUrl = 'https://www.readalquran.online';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || defaultSiteUrl;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Read al Quran',
    short_name: 'Read al Quran',
    description:
      'Quran-first app for reading, listening, Urdu translation, bookmarks, and progress tracking.',
    start_url: '/surah',
    scope: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#c9a227',
    lang: 'en',
    id: siteUrl,
    icons: [
      {
        src: '/logos/logo1.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logos/logo1.png',
        sizes: '513x490',
        type: 'image/png',
      },
    ],
  };
}
