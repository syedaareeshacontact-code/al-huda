import type { HadithItem } from '@/lib/hadith/types/hadith.types';

export function getHadithSeoIntro(hadith: HadithItem): string {
  return `Hadith ${hadith.hadithNumber} in ${hadith.book.bookName}, chapter “${hadith.chapter.chapterEnglish}”. Text, translations and grading are reproduced from the data provider; numbering can differ between editions.`;
}

export function getHadithMetaTitle(hadith: HadithItem): string {
  return `${hadith.book.bookName} — Hadith ${hadith.hadithNumber}`;
}

export function getHadithMetaDescription(hadith: HadithItem): string {
  const text = hadith.hadithEnglish?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const reference = `${hadith.book.bookName}, Hadith ${hadith.hadithNumber}.`;
  if (!text) return `${reference} Chapter: ${hadith.chapter.chapterEnglish}. Read the available Arabic text and translations.`;
  const excerpt = text.length > 140 ? `${text.slice(0, 140).replace(/\s+\S*$/, '')}…` : text;
  return `${reference} ${excerpt}`;
}
