import type { Metadata } from 'next';

import AboutRoot from '@/components/about';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'About Read al Quran – Mission, Owner & Sources',
  description:
    'Learn about Read al Quran, its mission, owner and editor Zain Qalandar Shah, content sources, editorial standards, and review limitations.',
  path: '/about',
});

export default function About() {
  return (
    <>
      <AboutRoot />
    </>
  );
}
