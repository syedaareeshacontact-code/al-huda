import type { Metadata } from 'next';

import HomeRoot from '@/components/home';
import HomeEditorialSections from '@/components/home/home-editorial-sections';
import { buildPageMetadata, getSiteName, getSiteOrigin, toAbsoluteUrl } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Read Quran Online Free – Quran Pak with Urdu & English Translation, Audio, Tafseer',
  description:
    'Read Quran online with Urdu and English translation, Tafseer, audio and bookmarks, then explore original Quran guides with visible sources and review status.',
  path: '/',
  imageUrl: '/og?kind=surah-index',
});

export default function Home() {
  const authorJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': toAbsoluteUrl('/#author-zain-qalandar-shah'),
    name: 'Zain Qalandar Shah',
    jobTitle: 'Author and Content Editor',
    url: toAbsoluteUrl('/#author-zain-qalandar-shah'),
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
          __html: JSON.stringify(authorJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <HomeRoot>
        <HomeEditorialSections />
      </HomeRoot>
    </>
  );
}
