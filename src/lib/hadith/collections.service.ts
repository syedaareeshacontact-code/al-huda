import { hadithFetch } from './api-client';
import type {
  HadithApiBookResponse,
  HadithApiChapterResponse,
  HadithBook,
  HadithChapter,
} from './types/hadith.types';

export async function getAllCollectionsOrThrow(): Promise<HadithBook[]> {
  const data = await hadithFetch<HadithApiBookResponse>('/books', {
    revalidate: 86400,
    tags: ['hadith-collections'],
  });
  if (!Array.isArray(data.books)) {
    return [];
  }
  return data.books
    .map((book) => ({
      ...book,
      hadiths_count: Number(book.hadiths_count) || 0,
    }))
    .filter((book) => book.hadiths_count > 0);
}

export async function getAllCollections(): Promise<HadithBook[]> {
  try {
    return await getAllCollectionsOrThrow();
  } catch (error) {
    console.warn('[hadith] Unable to load collections:', error);
    return [];
  }
}

export async function getCollectionBySlug(slug: string): Promise<HadithBook | null> {
  const books = await getAllCollections();
  return books.find((b) => b.bookSlug === slug) ?? null;
}

export async function getCollectionBySlugOrThrow(slug: string): Promise<HadithBook | null> {
  const books = await getAllCollectionsOrThrow();
  return books.find((book) => book.bookSlug === slug) ?? null;
}

export async function getChaptersByCollectionOrThrow(
  bookSlug: string
): Promise<HadithChapter[]> {
  const data = await hadithFetch<HadithApiChapterResponse>(`/${bookSlug}/chapters`, {
    revalidate: 86400,
    tags: [`hadith-chapters-${bookSlug}`],
  });
  return Array.isArray(data.chapters) ? data.chapters : [];
}

export async function getChaptersByCollection(bookSlug: string): Promise<HadithChapter[]> {
  try {
    return await getChaptersByCollectionOrThrow(bookSlug);
  } catch (error) {
    console.warn(`[hadith] Unable to load chapters for ${bookSlug}:`, error);
    return [];
  }
}
