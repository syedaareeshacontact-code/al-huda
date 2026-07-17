const MIN_SURAH_ID = 1;
const MAX_SURAH_ID = 114;

export function slugifyAscii(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function parseSurahIdFromParam(param: string | null | undefined): number | null {
  if (!param) {
    return null;
  }

  const normalized = param.trim().toLowerCase();
  const idPart = normalized.split('-')[0] ?? normalized;
  const parsed = Number(idPart);

  if (!Number.isInteger(parsed) || parsed < MIN_SURAH_ID || parsed > MAX_SURAH_ID) {
    return null;
  }

  return parsed;
}

export function buildSurahSlug(surahId: number, surahName: string): string {
  const slugPart = slugifyAscii(surahName);
  return slugPart ? `${surahId}-${slugPart}` : String(surahId);
}

export function buildSurahPath(surahId: number, surahName: string): string {
  return `/surah/${buildSurahSlug(surahId, surahName)}`;
}

export function buildAyahPath(surahId: number, surahName: string, ayahNumber: number): string {
  return `${buildSurahPath(surahId, surahName)}/ayah/${ayahNumber}`;
}

export function buildAyahPopupPath(
  surahId: number,
  surahName: string,
  ayahNumber: number
): string {
  return `${buildSurahPath(surahId, surahName)}?ayah=${ayahNumber}`;
}

export function buildTafsirSurahPath(surahId: number, surahName: string): string {
  return `/tafsir/${buildSurahSlug(surahId, surahName)}`;
}

export function buildTafsirPath(surahId: number, surahName: string, ayahNumber: number): string {
  return `${buildTafsirSurahPath(surahId, surahName)}/${ayahNumber}`;
}

export function buildTafsirPopupPath(
  surahId: number,
  surahName: string,
  ayahNumber: number
): string {
  return `${buildTafsirSurahPath(surahId, surahName)}?ayah=${ayahNumber}`;
}

export function buildUrduTranslationAudioUrl(surahId: number): string {
  return `https://ia801503.us.archive.org/28/items/quran_urdu_audio_only/${String(
    surahId
  ).padStart(3, '0')}.ogg`;
}

export function buildUrduAyahAudioUrl(surahId: number, ayahNumber: number): string {
  const surahPart = String(surahId).padStart(3, '0');
  const ayahPart = String(ayahNumber).padStart(3, '0');
  return `https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps/${surahPart}${ayahPart}.mp3`;
}
