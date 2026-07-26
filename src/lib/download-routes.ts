export type DownloadPdfVariant = 'arabic' | 'arabic-urdu';
export type DownloadAudioVariant = 'arabic' | 'urdu';

export function buildSurahPdfDownloadUrl(
  surahId: number,
  variant: DownloadPdfVariant
): string {
  return `/api/surah/${surahId}/pdf?variant=${variant}`;
}

export function buildSurahAudioDownloadUrl(
  surahId: number,
  variant: DownloadAudioVariant,
  reciterId?: number
): string {
  const query = new URLSearchParams({ variant });

  if (variant === 'arabic' && reciterId) {
    query.set('reciter', String(reciterId));
  }

  return `/api/surah/${surahId}/audio?${query.toString()}`;
}

export function buildAyahAudioDownloadUrl(
  surahId: number,
  ayahNumber: number,
  variant: DownloadAudioVariant
): string {
  return `/api/surah/${surahId}/ayah/${ayahNumber}/audio?variant=${variant}`;
}
