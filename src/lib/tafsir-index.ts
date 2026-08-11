// Use case: Maps available Tafsir ayahs so the app can show Tafsir links only where content exists.
import tafsirAvailabilityRaw from '@/data/tafsir-availability.json';
import { getAllSurahs } from '@/lib/quran-index';

interface TafsirAvailabilityEntry {
  surahId: number;
  sourceId: number | null;
  ayahs: number[];
}

const normalizedEntries: TafsirAvailabilityEntry[] = (Array.isArray(tafsirAvailabilityRaw)
  ? tafsirAvailabilityRaw
  : []
)
  .map((entry) => {
    const candidate = entry as Partial<TafsirAvailabilityEntry>;
    return {
      surahId: Number(candidate.surahId ?? 0),
      sourceId:
        candidate.sourceId === null || candidate.sourceId === undefined
          ? null
          : Number(candidate.sourceId),
      ayahs: Array.isArray(candidate.ayahs)
        ? candidate.ayahs
            .map((ayah) => Number(ayah))
            .filter((ayah) => Number.isInteger(ayah) && ayah > 0)
        : [],
    };
  })
  .filter((entry) => Number.isInteger(entry.surahId) && entry.surahId >= 1 && entry.surahId <= 114)
  .sort((left, right) => left.surahId - right.surahId);

const tafsirMap = new Map<number, TafsirAvailabilityEntry>(
  normalizedEntries.map((entry) => [entry.surahId, entry])
);

export function getTafsirAyahNumbersBySurah(surahId: number): number[] {
  const entry = tafsirMap.get(surahId);
  if (!entry) {
    return [];
  }

  return entry.ayahs;
}

export function hasTafsirForAyah(surahId: number, ayahNumber: number): boolean {
  const entry = tafsirMap.get(surahId);
  if (!entry) {
    return false;
  }

  return entry.ayahs.includes(ayahNumber);
}

export function getAllTafsirRefs(): Array<{
  surahId: number;
  surahName: string;
  ayahNumber: number;
}> {
  const surahs = getAllSurahs();
  const refs: Array<{ surahId: number; surahName: string; ayahNumber: number }> = [];

  surahs.forEach((surah) => {
    const ayahs = getTafsirAyahNumbersBySurah(surah.id);
    ayahs.forEach((ayahNumber) => {
      refs.push({
        surahId: surah.id,
        surahName: surah.surahName,
        ayahNumber,
      });
    });
  });

  return refs;
}
