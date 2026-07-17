import { NextResponse } from 'next/server';

import { isValidSurahId } from '@/lib/quran-utils';
import {
  parseQuranComWordAudioPayload,
  type QuranComWordAudioVerse,
} from '@/lib/quran-word-audio';

const QURAN_COM_API = 'https://api.quran.com/api/v4';
const WORD_AUDIO_PER_PAGE = 300;

export const runtime = 'nodejs';
export const revalidate = 86400;

interface QuranComWordAudioPage {
  verses?: QuranComWordAudioVerse[];
  pagination?: {
    total_pages?: number;
  };
}

async function fetchWordAudioPage(surahId: number, page: number) {
  const params = new URLSearchParams({
    language: 'en',
    words: 'true',
    word_fields: 'text_uthmani,audio_url,position',
    fields: 'verse_key',
    per_page: String(WORD_AUDIO_PER_PAGE),
    page: String(page),
  });

  const response = await fetch(`${QURAN_COM_API}/verses/by_chapter/${surahId}?${params}`, {
    cache: 'force-cache',
    headers: {
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Unable to load word audio metadata (${response.status})`);
  }

  return (await response.json()) as QuranComWordAudioPage;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ surahId: string }> }
) {
  const { surahId: rawSurahId } = await context.params;
  const surahId = Number(rawSurahId);

  if (!isValidSurahId(surahId)) {
    return NextResponse.json({ error: 'Invalid surah ID' }, { status: 400 });
  }

  try {
    const firstPage = await fetchWordAudioPage(surahId, 1);
    const totalPages = Math.max(1, Number(firstPage.pagination?.total_pages ?? 1));
    const remainingPages =
      totalPages > 1
        ? await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
              fetchWordAudioPage(surahId, index + 2)
            )
          )
        : [];

    const verses = [firstPage, ...remainingPages].flatMap((page) => page.verses ?? []);
    const payload = parseQuranComWordAudioPayload(surahId, verses);

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('[surah-word-audio]', error);
    return NextResponse.json({ error: 'Word audio unavailable' }, { status: 502 });
  }
}
