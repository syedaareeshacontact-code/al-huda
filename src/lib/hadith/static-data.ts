import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  HadithApiHadithsResponse,
  HadithBook,
  HadithChapter,
  HadithItem,
} from './types/hadith.types';
import { getHadithNumbers, getPrimaryHadithNumber } from './hadith-number';

type StaticBook = {
  id: number;
  bookName: string;
  writerName: string;
  aboutWriter: string | null;
  writerDeath: string | null;
  bookSlug: string;
  hadiths_count: number;
  chapters_count: number;
};

type StaticArchive = {
  book?: StaticBook;
  hadiths?: { data?: unknown[] };
};

const DATA_DIR = join(process.cwd(), 'src', 'data', 'hadith-api');
const jsonCache = new Map<string, unknown>();

function readArchiveJson<T>(relativePath: string): T | null {
  const cached = jsonCache.get(relativePath);
  if (cached) return cached as T;

  try {
    const value = JSON.parse(readFileSync(join(DATA_DIR, relativePath), 'utf8')) as T;
    jsonCache.set(relativePath, value);
    return value;
  } catch {
    return null;
  }
}

function normalizeBook(book: StaticBook): HadithBook {
  return {
    ...book,
    slug: book.bookSlug,
    status: 'available',
    volumes: null,
    hadiths_count: Number(book.hadiths_count) || 0,
  };
}

function getStaticBook(bookSlug: string): HadithBook | null {
  const payload = readArchiveJson<{ books?: StaticBook[] }>('books.json');
  const book = payload?.books?.find((entry) => entry.bookSlug === bookSlug);
  return book ? normalizeBook(book) : null;
}

export function getStaticCollections(): HadithBook[] {
  const payload = readArchiveJson<{ books?: StaticBook[] }>('books.json');
  return (payload?.books ?? [])
    .map(normalizeBook)
    .filter((book) => book.hadiths_count > 0);
}

export function getStaticChapters(bookSlug: string): HadithChapter[] {
  const payload = readArchiveJson<{ chapters?: Array<Record<string, unknown>> }>(
    `chapters/${bookSlug}.json`
  );

  return (payload?.chapters ?? []).map((chapter) => ({
    id: Number(chapter.id) || 0,
    bookSlug: String(chapter.bookSlug ?? bookSlug),
    chapterNumber: String(chapter.chapterNumber ?? chapter.id ?? ''),
    chapterEnglish: String(chapter.chapterEnglish ?? ''),
    chapterUrdu: String(chapter.chapterUrdu ?? ''),
    chapterArabic: String(chapter.chapterArabic ?? ''),
  }));
}

function normalizeHadith(
  raw: Record<string, any>,
  bookSlug: string,
  book: HadithBook
): HadithItem | null {
  const hadithNumber = String(raw.hadithNumber ?? '').trim();
  if (getHadithNumbers(hadithNumber).length === 0) return null;

  const chapter = raw.chapter ?? {};
  const rawBook = raw.book ?? {};

  return {
    id: Number(raw.id) || 0,
    hadithNumber,
    englishNarrator: raw.englishNarrator ?? null,
    hadithEnglish: raw.hadithEnglish ?? null,
    hadithUrdu: raw.hadithUrdu ?? null,
    hadithArabic: raw.hadithArabic ?? null,
    urduNarrator: raw.urduNarrator ?? null,
    status: String(raw.status ?? 'Unknown'),
    book: {
      bookName: String(rawBook.bookName ?? book.bookName),
      writerName: String(rawBook.writerName ?? book.writerName),
      slug: String(rawBook.slug ?? bookSlug),
      bookSlug: String(rawBook.bookSlug ?? bookSlug),
    },
    chapter: {
      chapterEnglish: String(chapter.chapterEnglish ?? raw.headingEnglish ?? ''),
      chapterUrdu: String(chapter.chapterUrdu ?? raw.headingUrdu ?? ''),
      chapterArabic: String(chapter.chapterArabic ?? raw.headingArabic ?? ''),
      chapterNumber: String(chapter.chapterNumber ?? raw.chapterId ?? ''),
    },
  };
}

function getStaticHadithItems(bookSlug: string): HadithItem[] {
  const book = getStaticBook(bookSlug);
  if (!book) return [];

  const archive = readArchiveJson<StaticArchive>(`hadiths/${bookSlug}.json`);
  return (archive?.hadiths?.data ?? [])
    .filter((entry): entry is Record<string, any> => Boolean(entry && typeof entry === 'object'))
    .map((entry) => normalizeHadith(entry, bookSlug, book))
    .filter((entry): entry is HadithItem => Boolean(entry));
}

export function getStaticHadithNumbers(bookSlug: string): string[] {
  return [
    ...new Set(
      getStaticHadithItems(bookSlug)
        .map((hadith) => getPrimaryHadithNumber(hadith.hadithNumber))
        .filter((number): number is string => Boolean(number))
    ),
  ].sort((a, b) => Number(a) - Number(b));
}

export function getStaticHadithByNumber(
  bookSlug: string,
  hadithNumber: string
): HadithItem | null {
  return (
    getStaticHadithItems(bookSlug).find((hadith) =>
      getHadithNumbers(hadith.hadithNumber).includes(hadithNumber)
    ) ?? null
  );
}

export function getStaticHadiths(
  bookSlug: string,
  chapterId?: string,
  page = 1,
  perPage = 50
): HadithApiHadithsResponse | null {
  const book = getStaticBook(bookSlug);
  if (!book) return null;

  const filtered = getStaticHadithItems(bookSlug).filter(
    (hadith) => !chapterId || hadith.chapter.chapterNumber === String(chapterId)
  );
  const safePage = Math.max(1, page);
  const safePerPage = Math.max(1, perPage);
  const start = (safePage - 1) * safePerPage;
  const data = filtered.slice(start, start + safePerPage);
  const lastPage = Math.max(1, Math.ceil(filtered.length / safePerPage));

  return {
    status: 200,
    hadiths: {
      current_page: safePage,
      data,
      first_page_url: '',
      last_page: lastPage,
      last_page_url: '',
      next_page_url: safePage < lastPage ? '' : null,
      prev_page_url: safePage > 1 ? '' : null,
      per_page: safePerPage,
      total: filtered.length,
      from: data.length ? start + 1 : 0,
      to: data.length ? start + data.length : 0,
    },
    book,
  };
}
