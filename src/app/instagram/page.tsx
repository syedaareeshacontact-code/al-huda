import type { Metadata, Viewport } from 'next';
import { buildPageMetadata } from '@/lib/seo';

import InstagramLanding from '@/components/instagram/instagram-landing';

export const metadata: Metadata = buildPageMetadata({
  title: 'Continue to Read al Quran',
  description: 'Open the Quran reader and continue your reading journey.',
  path: '/instagram',
  index: false,
});

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
