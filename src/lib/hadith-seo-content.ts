import type { HadithItem } from '@/lib/hadith/types/hadith.types';

/** Unique context lines for major hadith books — avoids thin duplicate content */
const BOOK_INTROS: Record<string, string> = {
  'sahih-bukhari':
    'Sahih al-Bukhari, compiled by Imam Muhammad al-Bukhari (d. 870 CE), is regarded as the most authentic hadith collection in Islam with over 7,000 narrations rigorously verified.',
  'sahih-muslim':
    'Sahih Muslim by Imam Muslim ibn al-Hajjaj is the second most authentic hadith book, known for its precise categorisation and scholarly methodology alongside Sahih Bukhari.',
  'al-tirmidhi':
    'Sunan al-Tirmidhi by Imam al-Tirmidhi includes hadith grading (Sahih, Hasan, Daif) for each narration, making it invaluable for understanding hadith authenticity.',
  'abu-dawood':
    'Sunan Abu Dawud by Imam Abu Dawud focuses on legal (fiqh) hadiths and is one of the six canonical hadith collections (Kutub al-Sittah).',
  'ibn-e-majah':
    'Sunan Ibn Majah by Imam Ibn Majah completes the six canonical collections, with a significant portion dedicated to legal and devotional narrations.',
  'sunan-nasai':
    'Sunan an-Nasa\'i by Imam an-Nasa\'i is distinguished for its strict criteria in evaluating narrator reliability among the Kutub al-Sittah.',
  mishkat:
    'Mishkat al-Masabih is a comprehensive hadith collection that gathers authentic narrations from the six canonical books and other sources for easy reference.',
};

export function getHadithSeoIntro(hadith: HadithItem): string {
  const bookIntro =
    BOOK_INTROS[hadith.book.bookSlug] ??
    `${hadith.book.bookName} by ${hadith.book.writerName} is a respected collection of Prophetic traditions preserved with chain of narration (isnad).`;

  return `Hadith ${hadith.hadithNumber} from ${hadith.book.bookName}, chapter "${hadith.chapter.chapterEnglish}". ${bookIntro} Read the Arabic original, English translation, and Urdu tarjuma below.`;
}

export function getHadithMetaTitle(hadith: HadithItem): string {
  const grade = hadith.status && hadith.status !== 'Unknown' ? ` (${hadith.status})` : '';
  return `Hadith ${hadith.hadithNumber}${grade} — ${hadith.book.bookName} | Arabic, Urdu & English`;
}

export function getHadithMetaDescription(hadith: HadithItem): string {
  const snippet = hadith.hadithEnglish.slice(0, 120).trim();
  return `${snippet}… From ${hadith.book.bookName} (${hadith.book.writerName}), chapter: ${hadith.chapter.chapterEnglish}. Read full Arabic text and Urdu translation.`;
}
