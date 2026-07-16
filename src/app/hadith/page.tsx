import CollectionGrid from '@/components/hadith/CollectionGrid';
import HadithPageHeader from '@/components/hadith/HadithPageHeader';
import HadithSeoIntro from '@/components/hadith/HadithSeoIntro';
import { HadithIndexSchema } from '@/components/hadith/HadithSchema';
import { getAllCollections } from '@/lib/hadith/collections.service';
import { buildHadithIndexPath, buildHadithOgImagePath } from '@/lib/hadith/hadith-routing';
import { GENERATED_HADITH_KEYWORDS, GLOBAL_HADITH_SEO_KEYWORDS } from '@/lib/seo-keywords';
import { buildPageMetadata } from '@/lib/seo';

export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: 'Hadith Collections – Sahih Bukhari, Muslim & Six Books Online',
  description:
    'Browse major Hadith collections including Sahih Bukhari, Sahih Muslim, Abu Dawud, Tirmidhi, Nasai, Ibn Majah, and Mishkat with Arabic, English and Urdu translations.',
  path: buildHadithIndexPath(),
  keywords: [...GLOBAL_HADITH_SEO_KEYWORDS, ...GENERATED_HADITH_KEYWORDS],
  imageUrl: buildHadithOgImagePath({ variant: 'index' }),
});

export default async function HadithPage() {
  const collections = await getAllCollections();
  const totalHadiths = collections.reduce((sum, col) => sum + col.hadiths_count, 0);

  return (
    <>
      <HadithIndexSchema collections={collections} />

      <div className="space-y-10 animate-fade-up">
        <HadithPageHeader
          badge="Sunnah & Hadith"
          badgeSecondary={`${collections.length} Collections`}
          title="Hadith Collections"
          description={`Explore ${totalHadiths.toLocaleString()} narrations from major Hadith collections, with Arabic text and available English and Urdu translations. Grades are shown where supplied.`}
        />

        <CollectionGrid collections={collections} />

        <HadithSeoIntro />
      </div>
    </>
  );
}
