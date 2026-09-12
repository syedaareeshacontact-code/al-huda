export type SearchSection = 'pages' | 'quran' | 'verses' | 'tafsir' | 'downloads' | 'hadith' | 'articles' | 'tools';
export interface SearchRecord {
  path: string;
  section: SearchSection;
  source: string;
  available: boolean;
  index: boolean;
  lastModified?: string;
}

const EXCLUDED = /^\/(?:api|admin|auth|reset-password|feedback|instagram)(?:\/|$)|^\/hadith\/search$/;

export function validateSearchRecords(records: SearchRecord[]): SearchRecord[] {
  const urls = new Set<string>();
  return records.filter(record => record.available && record.index).map(record => {
    if (!record.path.startsWith('/') || record.path.startsWith('//') || /[?#\\\s]/.test(record.path) ||
        (record.path !== '/' && record.path.endsWith('/')) || EXCLUDED.test(record.path) || !record.source.trim()) {
      throw new Error(`Invalid search catalog URL: ${record.path}`);
    }
    if (urls.has(record.path)) throw new Error(`Duplicate search catalog URL: ${record.path}`);
    urls.add(record.path);
    if (record.lastModified && (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(record.lastModified) ||
        !Number.isFinite(Date.parse(record.lastModified)) || Date.parse(record.lastModified) > Date.now())) {
      throw new Error(`Invalid content update date: ${record.path}`);
    }
    return record;
  }).sort((a,b) => a.path.localeCompare(b.path, 'en'));
}

export { getAvailableHadithNumbers } from './hadith-catalog.mjs';
