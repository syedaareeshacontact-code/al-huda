import { serializeJsonLd } from '@/lib/seo/structured-data';
import type { Metadata } from 'next';

import HomeRoot from '@/components/home';
import HomeEditorialSections from '@/components/home/home-editorial-sections';
import { PRIMARY_AUTHOR } from '@/lib/author-profile';
import { buildPageMetadata, getSiteName, getSiteOrigin, toAbsoluteUrl } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Read the Quran with Translation',
  description:
    'Read the Quran in Arabic with Urdu and English translations. Listen to recitation, find a verse, and continue from your saved reading position.',
  path: '/',
  imageUrl: '/og?kind=surah-index',
});

export default function Home() {
  const authorJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${toAbsoluteUrl(PRIMARY_AUTHOR.href)}#person`,
    name: PRIMARY_AUTHOR.name,
    jobTitle: PRIMARY_AUTHOR.schemaRole,
    url: toAbsoluteUrl(PRIMARY_AUTHOR.href),
    worksFor: {
      '@type': 'Organization',
      name: getSiteName(),
      url: getSiteOrigin(),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(authorJsonLd),
        }}
      />
      <HomeRoot>
        <HomeEditorialSections />
      </HomeRoot>
    </>
  );
}
