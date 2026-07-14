import { getAllSurahs } from '@/lib/quran-index';
import { buildSurahSlug } from '@/lib/quran-routing';
import { getAllTafsirRefs } from '@/lib/tafsir-index';

function getSurahParamValues(surahId: number, surahName: string) {
  const canonicalSlug = buildSurahSlug(surahId, surahName);
  const numericSlug = String(surahId);

  return canonicalSlug === numericSlug ? [canonicalSlug] : [canonicalSlug, numericSlug];
}

export function getAllSurahStaticParams() {
  return getAllSurahs().flatMap((surah) =>
    getSurahParamValues(surah.id, surah.surahName).map((surahParam) => ({
      surah: surahParam,
    }))
  );
}

export function getAllAyahStaticParams() {
  return getAllSurahs().flatMap((surah) =>
    getSurahParamValues(surah.id, surah.surahName).flatMap((surahParam) =>
      Array.from({ length: surah.totalAyah }, (_, index) => ({
        surah: surahParam,
        ayah: String(index + 1),
      }))
    )
  );
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

export function getAllTafsirAyahStaticParams() {
  return getAllTafsirRefs().flatMap((ref) =>
    getSurahParamValues(ref.surahId, ref.surahName).map((surahParam) => ({
      surah: surahParam,
      ayah: String(ref.ayahNumber),
    }))
  );
}
