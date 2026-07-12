'use client';

import type { SurahListItem } from '@/types/quran';
import { getAllSurahs } from '@/lib/quran-index';

const LOCAL_SURAHS: SurahListItem[] = getAllSurahs().map((surah) => ({
  ...surah,
  surahNo: surah.id,
}));

interface UseSurahListResult {
  surahList: SurahListItem[];
  loading: boolean;
  error: string | null;
}

export default function useSurahList(): UseSurahListResult {
  return { surahList: LOCAL_SURAHS, loading: false, error: null };
}
