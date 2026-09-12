import 'server-only';
import { getAllSurahs } from '@/lib/quran-index';
import { buildAyahPath, buildSurahPath, buildTafsirPath, buildTafsirSurahPath } from '@/lib/quran-routing';
import { buildSurahDownloadPath } from '@/lib/surah-download';
import { getAllTafsirRefs } from '@/lib/tafsir-index';
import { getAllArticleSummaries, getArticleCategories } from '@/lib/articles';
import { PRIMARY_AUTHOR } from '@/lib/author-profile';
import { getAllCitySlugs } from '@/lib/islamic-cities';
import { isAzkarCategory } from '@/lib/ummah-api';
import { buildHadithBookPath, buildHadithCollectionPath, buildHadithDetailPath } from '@/lib/hadith/hadith-routing';
import hadithCatalog from '@/data/hadith-catalog.json';
import duaCatalog from '@/data/dua-catalog.json';
import { validateSearchRecords, type SearchRecord, type SearchSection } from './search-policy';

let catalog: SearchRecord[] | undefined;

/** Deterministic build snapshot. No API calls or partial success fallbacks in sitemap requests. */
export function getSearchCatalog(): SearchRecord[] {
  if (catalog) return catalog;
  const records: SearchRecord[] = [];
  const add = (path: string, section: SearchSection, source: string, lastModified?: string) => {
    records.push({ path, section, source, available: true, index: true, ...(lastModified && { lastModified }) });
  };
  for (const path of ['/', '/about', '/contact', '/editorial-policy', '/corrections', '/privacy-policy', '/terms', '/donate', '/read-quran-online', PRIMARY_AUTHOR.href]) {
    add(path, 'pages', 'published-page');
  }
  const surahs = getAllSurahs();
  if (surahs.length !== 114) throw new Error('Incomplete Quran index; sitemap generation stopped.');
  add('/surah', 'quran', 'quran-index');
  add('/download', 'downloads', 'download-directory');
  for (const surah of surahs) {
    add(buildSurahPath(surah.id, surah.surahName), 'quran', 'quran-index');
    add(buildSurahDownloadPath(surah.id, surah.surahName), 'downloads', 'download-directory');
    // Verse numbering is defined by the Quran index; Hadith numbering is not assumed contiguous.
    for (let ayah = 1; ayah <= surah.totalAyah; ayah++) add(buildAyahPath(surah.id, surah.surahName, ayah), 'verses', 'quran-index');
  }
  const tafsirRefs = getAllTafsirRefs();
  if (!tafsirRefs.length) throw new Error('Missing tafsir availability snapshot.');
  add('/tafsir', 'tafsir', 'tafsir-availability');
  for (const surah of surahs.filter(s => tafsirRefs.some(ref => ref.surahId === s.id))) {
    add(buildTafsirSurahPath(surah.id, surah.surahName), 'tafsir', 'tafsir-availability');
  }
  for (const ref of tafsirRefs) {
    const surah = surahs.find(s => s.id === ref.surahId);
    if (!surah || ref.ayahNumber > surah.totalAyah) throw new Error('Invalid tafsir reference.');
    add(buildTafsirPath(ref.surahId, ref.surahName, ref.ayahNumber), 'tafsir', 'tafsir-availability');
  }
  add('/hadith', 'hadith', 'hadith-snapshot');
  for (const book of hadithCatalog.collections) {
    if (!/^[a-z0-9-]+$/.test(book.slug)) throw new Error('Invalid Hadith collection slug.');
    const numbers = book.ranges.flatMap(([first, last]) => {
      if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first < 1 || last < first) throw new Error('Invalid verified Hadith range.');
      return Array.from({ length: last - first + 1 }, (_, offset) => first + offset);
    });
    if (!numbers.length || numbers.length !== book.recordCount) throw new Error(`Incomplete Hadith catalog: ${book.slug}`);
    add(buildHadithCollectionPath(book.slug), 'hadith', 'hadith-snapshot');
    add(buildHadithBookPath(book.slug), 'hadith', 'hadith-snapshot');
    for (const number of numbers) add(buildHadithDetailPath(book.slug, number), 'hadith', 'hadith-snapshot');
  }
  const articles = getAllArticleSummaries();
  if (articles.length) {
    add('/articles', 'articles', 'validated-mdx');
    for (const category of getArticleCategories()) add(`/articles/category/${category.slug}`, 'articles', 'validated-mdx', category.latestUpdatedAt);
    for (const article of articles) add(article.href, 'articles', 'validated-mdx', article.updatedAt);
  }
  for (const path of ['/prayer-times', '/mosque-finder', '/zakat-calculator']) add(path, 'tools', 'published-tool');
  for (const slug of getAllCitySlugs()) {
    add(`/prayer-times/${slug}`, 'tools', 'city-coordinates');
    add(`/mosque-finder/${slug}`, 'tools', 'city-coordinates');
  }
  if (!duaCatalog.categories.length) throw new Error('Missing Dua discovery snapshot.');
  add('/duas', 'tools', 'dua-catalog');
  if (duaCatalog.namesAvailable) add('/99-names-of-allah', 'tools', 'dua-catalog');
  if (duaCatalog.categories.some(category => isAzkarCategory(category.id))) add('/azkar', 'tools', 'dua-catalog');
  for (const category of duaCatalog.categories) {
    if (!/^[a-z][a-z0-9_-]*$/.test(category.id) || category.count < 1) throw new Error('Invalid Dua discovery record.');
    add(`/duas/${category.id}`, 'tools', 'dua-catalog');
  }
  catalog = validateSearchRecords(records);
  return catalog;
}
