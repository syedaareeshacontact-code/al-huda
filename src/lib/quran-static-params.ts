import { getAllSurahs } from '@/lib/quran-index';
import { buildSurahSlug } from '@/lib/quran-routing';
import {
  getFeaturedAyahRefs,
  getFeaturedTafsirRefs,
} from '@/lib/featured-quran-pages';
import { getAllTafsirRefs } from '@/lib/tafsir-index';

function getSurahParamValues(surahId: number, surahName: string) {
  return [buildSurahSlug(surahId, surahName)];
}

export function getAllSurahStaticParams() {
  return getAllSurahs().flatMap((surah) =>
    getSurahParamValues(surah.id, surah.surahName).map((surahParam) => ({
      surah: surahParam,
    }))
  );
}

export function getFeaturedAyahStaticParams() {
  return getFeaturedAyahRefs().map((ref) => ({
    surah: buildSurahSlug(ref.surahId, ref.surahName),
    ayah: String(ref.ayahNumber),
  }));
}

export function getAllTafsirSurahStaticParams() {
  const surahIds = new Set(getAllTafsirRefs().map((ref) => ref.surahId));

  return getAllSurahs()
    .filter((surah) => surahIds.has(surah.id))
    .flatMap((surah) =>
      getSurahParamValues(surah.id, surah.surahName).map((surahParam) => ({
        surah: surahParam,
      }))
    );
}

export function getFeaturedTafsirAyahStaticParams() {
  return getFeaturedTafsirRefs().map((ref) => ({
    surah: buildSurahSlug(ref.surahId, ref.surahName),
    ayah: String(ref.ayahNumber),
  }));
}
