const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;
const QURANIC_ROUNDED_ZERO_MARK = /\u06df/g;

export function toArabicIndicNumerals(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => ARABIC_INDIC_DIGITS[Number(digit)] ?? digit);
}

export function formatQuranArabicForDisplay(value: string): string {
  return value.replace(QURANIC_ROUNDED_ZERO_MARK, '');
}
