export interface HadithRef {
  readonly collectionSlug: string;
  readonly hadithNumber: string;
}

const CURATED_HADITH_SITEMAP_REFS = [
  { collectionSlug: 'sahih-bukhari', hadithNumber: '1' },
  { collectionSlug: 'sahih-bukhari', hadithNumber: '2' },
  { collectionSlug: 'sahih-bukhari', hadithNumber: '7' },
  { collectionSlug: 'sahih-muslim', hadithNumber: '1' },
  { collectionSlug: 'sahih-muslim', hadithNumber: '8' },
  { collectionSlug: 'al-tirmidhi', hadithNumber: '1' },
  { collectionSlug: 'abu-dawood', hadithNumber: '1' },
  { collectionSlug: 'ibn-e-majah', hadithNumber: '1' },
  { collectionSlug: 'sunan-nasai', hadithNumber: '1' },
  { collectionSlug: 'mishkat', hadithNumber: '1' },
] as const satisfies readonly HadithRef[];

export function getCuratedHadithSitemapRefs(): readonly HadithRef[] {
  return CURATED_HADITH_SITEMAP_REFS;
}
