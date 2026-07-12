import type { Metadata } from 'next';

import AboutRoot from '@/components/about';
import { buildPageMetadata } from '@/lib/seo';
import { ISLAMIC_LEARNING_KEYWORDS, MASTER_SEO_KEYWORDS, TRUST_KEYWORDS } from '@/lib/seo-keywords';

export const metadata: Metadata = buildPageMetadata({
  title: 'About Read al Quran – Our Mission & Vision',
  description:
    'Learn about Read al Quran, its mission, and its content sources: Quran.com APIs for Quran and Tafseer, plus Hadith API for Hadith collections.',
  path: '/about',
  keywords: [
    ...TRUST_KEYWORDS,
    ...ISLAMIC_LEARNING_KEYWORDS,
    ...MASTER_SEO_KEYWORDS.slice(0, 150),
    'about read al quran',
    'quran platform mission',
    'islamic learning platform',
    'quran reader mission',
    'free quran app',
    'quran learning mission',
  ],
});

export default function About() {
  return (
    <>
      <AboutRoot />
    </>
  );
}
