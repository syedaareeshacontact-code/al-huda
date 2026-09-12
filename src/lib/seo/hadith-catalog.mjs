/** Identifiers are discovered from readable source records, never inferred from totals. */
export function getAvailableHadithNumbers(records) {
  return [...new Set(records.filter(record =>
    /^[1-9]\d*$/.test(String(record.hadithNumber)) &&
    [record.hadithArabic, record.hadithEnglish, record.hadithUrdu].some(text => typeof text === 'string' && text.trim())
  ).map(record => String(record.hadithNumber)))].sort((a,b) => Number(a) - Number(b));
}
