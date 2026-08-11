// Use case: Provides the 114-surah Quran index and basic metadata for navigation, pages, and SEO.
import surahIndexRaw from '../data/surah-index.json';
import {
  buildSurahPath,
  buildSurahSlug,
  parseSurahIdFromParam,
} from './quran-routing';

export interface SurahIndexEntry {
  id: number;
  surahName: string;
  surahNameArabic: string;
  surahNameArabicUthmani?: string;
  surahNameArabicLong?: string;
  surahNameTranslation: string;
  revelationPlace: string;
  totalAyah: number;
}

export const SURAH_INDEX: SurahIndexEntry[] = (Array.isArray(surahIndexRaw)
  ? surahIndexRaw
  : []
)
  .map((entry, index) => {
    const candidate = entry as Partial<SurahIndexEntry>;
    const id = Number(candidate.id ?? index + 1);

    return {
      id,
      surahName: String(candidate.surahName ?? ''),
      surahNameArabic: String(candidate.surahNameArabic ?? ''),
      surahNameArabicUthmani:
        candidate.surahNameArabicUthmani !== undefined
          ? String(candidate.surahNameArabicUthmani)
          : undefined,
      surahNameArabicLong:
        candidate.surahNameArabicLong !== undefined
          ? String(candidate.surahNameArabicLong)
          : undefined,
      surahNameTranslation: String(candidate.surahNameTranslation ?? ''),
      revelationPlace: String(candidate.revelationPlace ?? ''),
      totalAyah: Number(candidate.totalAyah ?? 0),
    } satisfies SurahIndexEntry;
  })
  .filter((entry) => Number.isInteger(entry.id) && entry.id >= 1 && entry.id <= 114)
  .sort((left, right) => left.id - right.id);

const surahById = new Map<number, SurahIndexEntry>(
  SURAH_INDEX.map((entry) => [entry.id, entry])
);

export const TOTAL_SURAHS = 114;
export const TOTAL_AYAHS = SURAH_INDEX.reduce(
  (total, surah) => total + Math.max(0, surah.totalAyah),
  0
);

export function getAllSurahs() {
  return SURAH_INDEX;
}

export function getSurahById(surahId: number): SurahIndexEntry | null {
  return surahById.get(surahId) ?? null;
}

export function getCanonicalSurahSlugById(surahId: number): string | null {
  const surah = getSurahById(surahId);
  if (!surah) {
    return null;
  }

  return buildSurahSlug(surah.id, surah.surahName);
}

export function getCanonicalSurahPathById(surahId: number): string | null {
  const surah = getSurahById(surahId);
  if (!surah) {
    return null;
  }

  return buildSurahPath(surah.id, surah.surahName);
}

export function resolveSurahParam(param: string | null | undefined): {
  surah: SurahIndexEntry;
  canonicalSlug: string;
  isCanonicalSlug: boolean;
} | null {
  const id = parseSurahIdFromParam(param);
  if (!id) {
    return null;
  }

  const surah = getSurahById(id);
  if (!surah) {
    return null;
  }

  const canonicalSlug = buildSurahSlug(surah.id, surah.surahName);
  const incomingSlug = String(param ?? '').trim().toLowerCase();

  return {
    surah,
    canonicalSlug,
    isCanonicalSlug: incomingSlug === canonicalSlug,
  };
}
