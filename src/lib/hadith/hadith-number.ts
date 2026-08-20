/**
 * Some source archives represent one record with several printed Hadith
 * numbers, for example `272, 273`. Those numbers share one piece of content,
 * so only the first number should have an indexable URL.
 */
export function getHadithNumbers(value: string | number | null | undefined): string[] {
  return String(value ?? '').match(/\d+/g) ?? [];
}

export function getPrimaryHadithNumber(value: string | number | null | undefined): string | null {
  return getHadithNumbers(value)[0] ?? null;
}
