export interface HadithBook {
  id: number;
  bookName: string;
  slug: string;
  writerName: string;
  aboutWriter: string | null;
  writerDeath: string | null;
  bookSlug: string;
  status: string;
  hadiths_count: number;
  volumes: number | null;
}

export interface HadithChapter {
  id: number;
  bookSlug: string;
  chapterNumber: string;
  chapterEnglish: string;
  chapterUrdu: string;
  chapterArabic: string;
}

export interface HadithItem {
  id: number;
  hadithNumber: string;
  englishNarrator: string | null;
  hadithEnglish: string | null;
  hadithUrdu: string | null;
  hadithArabic: string | null;
  urduNarrator: string | null;
  status: string;
  book: {
    bookName: string;
    writerName: string;
    slug: string;
    bookSlug: string;
  };
  chapter: {
    chapterEnglish: string;
    chapterUrdu: string;
    chapterArabic: string;
    chapterNumber: string;
  };
}

export interface HadithApiBookResponse {
  status: number;
  books: HadithBook[];
}

export interface HadithApiChapterResponse {
  status: number;
  book: HadithBook;
  chapters: HadithChapter[];
}

export interface HadithApiPaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface HadithApiPaginationMeta {
  current_page: number;
  from: number;
  last_page: number;
  per_page: number;
  to: number;
  total: number;
}

export interface HadithApiHadithsResponse {
  status: number;
  hadiths: {
    current_page: number;
    data: HadithItem[];
    first_page_url: string;
    last_page: number;
    last_page_url: string;
    next_page_url: string | null;
    prev_page_url: string | null;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
  book: HadithBook;
}

export type HadithGradeType = 'Sahih' | 'Hasan' | 'Daif' | 'Maudu' | 'Unknown';

export type { BreadcrumbItem } from '@/types/breadcrumb';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}
