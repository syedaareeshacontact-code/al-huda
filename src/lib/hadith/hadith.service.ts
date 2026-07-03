import { HadithApiError, hadithFetch } from './api-client';
import type { HadithApiHadithsResponse, HadithItem } from './types/hadith.types';

interface GetHadithsParams {
  bookSlug: string;
  chapterId?: string;
  page?: number;
  perPage?: number;
}

export async function getHadiths({
  bookSlug,
  chapterId,
  page = 1,
  perPage = 50,
}: GetHadithsParams): Promise<HadithApiHadithsResponse> {
  let endpoint = `/hadiths/?book=${bookSlug}&paginate=${perPage}&page=${page}`;
  if (chapterId) {
    endpoint += `&chapter=${chapterId}`;
  }

  return hadithFetch<HadithApiHadithsResponse>(endpoint, {
    revalidate: 3600,
    tags: [`hadith-list-${bookSlug}-${chapterId ?? 'all'}-${page}`],
  });
}

export async function getHadithByNumber(
  bookSlug: string,
  hadithNumber: string
): Promise<HadithItem | null> {
  const data = await hadithFetch<HadithApiHadithsResponse>(
    `/hadiths/?book=${bookSlug}&hadithNumber=${hadithNumber}`,
    {
      revalidate: false,
      tags: [`hadith-${bookSlug}-${hadithNumber}`],
    }
  );
  return data.hadiths.data[0] ?? null;
}

function resolveHadithSearchParams(query: string): URLSearchParams {
  const trimmed = query.trim();
  const params = new URLSearchParams({
    paginate: '20',
  });

  if (!trimmed) {
    return params;
  }

  // Hadith API filters by field-specific params, not `query`.
  const hasArabicScript = /[\u0600-\u06FF]/.test(trimmed);
  if (hasArabicScript) {
    params.set('hadithUrdu', trimmed);
  } else {
    params.set('hadithEnglish', trimmed);
  }

  return params;
}

function createEmptyHadithSearchResponse(
  page: number,
  perPage: number
): HadithApiHadithsResponse {
  return {
    status: 200,
    hadiths: {
      current_page: page,
      data: [],
      first_page_url: '',
      last_page: 1,
      last_page_url: '',
      next_page_url: null,
      prev_page_url: null,
      per_page: perPage,
      total: 0,
      from: 0,
      to: 0,
    },
    book: {
      id: 0,
      bookName: '',
      slug: '',
      writerName: '',
      aboutWriter: null,
      writerDeath: null,
      bookSlug: '',
      status: '',
      hadiths_count: 0,
      volumes: null,
    },
  };
}

export async function getSuggestedHadiths(
  bookSlug: string,
  currentHadithNumber: string,
  chapterNumber: string,
  limit = 4
): Promise<HadithItem[]> {
  const selected: HadithItem[] = [];

  try {
    const chapterResponse = await getHadiths({
      bookSlug,
      chapterId: chapterNumber,
      page: 1,
      perPage: 30,
    });

    const chapterCandidates = chapterResponse.hadiths.data
      .filter((h) => h.hadithNumber !== currentHadithNumber)
      .sort((a, b) => gradeScore(b.status) - gradeScore(a.status));

    for (const hadith of chapterCandidates) {
      if (selected.length >= limit) break;
      selected.push(hadith);
    }
  } catch {
    // Chapter fetch is optional — fall back to book-level suggestions
  }

  if (selected.length < limit) {
    try {
      const currentNum = parseInt(currentHadithNumber, 10);
      const offsets = [3, 7, 12, 20, -5, -11].map((o) => currentNum + o).filter((n) => n > 0);

      for (const num of offsets) {
        if (selected.length >= limit) break;
        const hadith = await getHadithByNumber(bookSlug, String(num));
        if (
          hadith &&
          hadith.hadithNumber !== currentHadithNumber &&
          !selected.some((s) => s.hadithNumber === hadith.hadithNumber)
        ) {
          selected.push(hadith);
        }
      }
    } catch {
      // Best-effort suggestions
    }
  }

  return selected.slice(0, limit);
}

function gradeScore(status: string): number {
  const normalized = status.toLowerCase();
  if (normalized.includes('sahih')) return 3;
  if (normalized.includes('hasan')) return 2;
  if (normalized.includes('daif') || normalized.includes('da\'if')) return 0;
  return 1;
}

export async function searchHadiths(
  query: string,
  page = 1
): Promise<HadithApiHadithsResponse> {
  const params = resolveHadithSearchParams(query);
  params.set('page', String(page));
  const perPage = Number(params.get('paginate') ?? 20);

  try {
    return await hadithFetch<HadithApiHadithsResponse>(`/hadiths/?${params.toString()}`, {
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof HadithApiError && error.status === 404) {
      return createEmptyHadithSearchResponse(page, perPage);
    }

    throw error;
  }
}
