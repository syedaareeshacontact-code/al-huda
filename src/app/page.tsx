import type { Metadata } from 'next';

import HomeRoot from '@/components/home';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Read Quran Online Free – Quran Pak with Urdu & English Translation, Audio, Tafseer',
  description:
    'Read Quran online with Arabic text, Urdu and English translation, ayah-wise tafseer, recitation audio, bookmarks, and progress tracking across all 114 Surahs.',
  path: '/',
  imageUrl: '/og?kind=surah-index',
});

export default function Home() {
  return <HomeRoot />;
}
