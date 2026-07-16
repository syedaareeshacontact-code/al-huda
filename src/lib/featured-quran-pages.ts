import { getSurahById } from '@/lib/quran-index';
import { hasTafsirForAyah } from '@/lib/tafsir-index';

const FEATURED_AYAH_KEYS = [
  [1, 1],
  [1, 2],
  [1, 3],
  [1, 4],
  [1, 5],
  [1, 6],
  [1, 7],
  [2, 255],
  [2, 285],
  [2, 286],
  [18, 10],
  [24, 35],
  [33, 56],
  [36, 1],
  [36, 58],
  [36, 82],
  [36, 83],
  [39, 53],
  [55, 1],
  [55, 13],
  [59, 21],
  [59, 22],
  [59, 23],
  [59, 24],
  [67, 1],
  [67, 2],
  [67, 15],
  [67, 30],
  [112, 1],
  [112, 2],
  [112, 3],
  [112, 4],
  [113, 1],
  [113, 5],
  [114, 1],
  [114, 6],
] as const;

const featuredAyahKeySet = new Set<string>(
  FEATURED_AYAH_KEYS.map(([surahId, ayahNumber]) => `${surahId}:${ayahNumber}`)
);

export interface FeaturedAyahRef {
  surahId: number;
  surahName: string;
  ayahNumber: number;
}

export function isFeaturedAyah(surahId: number, ayahNumber: number) {
  return featuredAyahKeySet.has(`${surahId}:${ayahNumber}`);
}

export function getFeaturedAyahRefs(): FeaturedAyahRef[] {
  return FEATURED_AYAH_KEYS.flatMap(([surahId, ayahNumber]) => {
    const surah = getSurahById(surahId);
    if (!surah || ayahNumber > surah.totalAyah) {
      return [];
    }

    return [{
      surahId,
      surahName: surah.surahName,
      ayahNumber,
    }];
  });
}

export function getFeaturedTafsirRefs(): FeaturedAyahRef[] {
  return getFeaturedAyahRefs().filter((ref) =>
    hasTafsirForAyah(ref.surahId, ref.ayahNumber)
  );
}
