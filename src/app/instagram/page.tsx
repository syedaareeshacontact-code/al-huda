import type { Metadata, Viewport } from 'next';

import InstagramLanding from '@/components/instagram/instagram-landing';

export const metadata: Metadata = {
  title: { absolute: 'Join Read Al Quran | Start Your Quran Journey' },
  description:
    'Join Read Al Quran from Instagram to read, listen, and continue your personal Quran journey.',
  alternates: {
    canonical: '/instagram',
  },
  openGraph: {
    title: 'Join Read Al Quran | Start Your Quran Journey',
    description:
      'Join Read Al Quran from Instagram to read, listen, and continue your personal Quran journey.',
    url: '/instagram',
    type: 'website',
    images: [
      {
        url: '/og?kind=surah-index',
        width: 1200,
        height: 630,
        alt: 'Read Al Quran',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join Read Al Quran | Start Your Quran Journey',
    description:
      'Join Read Al Quran from Instagram and begin your Quran journey.',
    images: ['/og?kind=surah-index'],
  },
};

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

type InstagramPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readAttributionValue(value: string | string[] | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized?.trim().slice(0, 100) || undefined;
}

export default async function InstagramPage({ searchParams }: InstagramPageProps) {
  const query = await searchParams;
  const attribution = {
    utm_source: readAttributionValue(query.utm_source),
    utm_medium: readAttributionValue(query.utm_medium),
    utm_campaign: readAttributionValue(query.utm_campaign),
  };

  return <InstagramLanding attribution={attribution} />;
}
