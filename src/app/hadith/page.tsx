import CollectionGrid from '@/components/hadith/CollectionGrid';
import PublicContentState from '@/components/errors/public-content-state';
import HadithPageHeader from '@/components/hadith/HadithPageHeader';
import HadithSeoIntro from '@/components/hadith/HadithSeoIntro';
import { HadithIndexSchema } from '@/components/hadith/HadithSchema';
import { getAllCollectionsOrThrow } from '@/lib/hadith/collections.service';
import { buildHadithIndexPath, buildHadithOgImagePath } from '@/lib/hadith/hadith-routing';
import { GENERATED_HADITH_KEYWORDS, GLOBAL_HADITH_SEO_KEYWORDS } from '@/lib/seo-keywords';
import { buildPageMetadata } from '@/lib/seo';

export const revalidate = 86400;

const HADITH_INDEX_METADATA = {
  title: 'Hadith Collections – Sahih Bukhari, Muslim & Six Books Online',
  description:
    'Browse major Hadith collections including Sahih Bukhari, Sahih Muslim, Abu Dawud, Tirmidhi, Nasai, Ibn Majah, and Mishkat with Arabic, English and Urdu translations.',
  path: buildHadithIndexPath(),
  keywords: [...GLOBAL_HADITH_SEO_KEYWORDS, ...GENERATED_HADITH_KEYWORDS],
  imageUrl: buildHadithOgImagePath({ variant: 'index' }),
};

export async function generateMetadata() {
  try {
    const collections = await getAllCollectionsOrThrow();
    return buildPageMetadata({ ...HADITH_INDEX_METADATA, index: collections.length > 0 });
  } catch {
    return buildPageMetadata({ ...HADITH_INDEX_METADATA, index: false });
  }
}

export default async function HadithPage() {
  let collections: Awaited<ReturnType<typeof getAllCollectionsOrThrow>>;
  try {
    collections = await getAllCollectionsOrThrow();
  } catch {
    return (
      <PublicContentState
        title="Hadith collections are temporarily unavailable"
        description="The Hadith data provider could not be reached. Please retry shortly; an empty library will not be indexed."
        primaryHref="/hadith"
        primaryLabel="Try Hadith library again"
      />
    );
  }

  if (collections.length === 0) {
    return (
      <PublicContentState
        title="Hadith collections are temporarily unavailable"
        description="No collections were returned by the provider, so this incomplete library is excluded from indexing."
        primaryHref="/hadith"
        primaryLabel="Try Hadith library again"
      />
    );
  }
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
