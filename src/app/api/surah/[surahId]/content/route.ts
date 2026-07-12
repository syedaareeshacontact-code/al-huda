import { NextResponse } from 'next/server';

import { getSurahDetailById, getSurahMetaById } from '@/lib/quran-server';
import { isValidSurahId } from '@/lib/quran-utils';

export const runtime = 'nodejs';
export const revalidate = 86400;

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
    const [detail, meta] = await Promise.all([
      getSurahDetailById(surahId),
      getSurahMetaById(surahId),
    ]);

    return NextResponse.json(
      {
        detail,
        meta: {
          ...meta,
          // Arabic text is already present in detail. Do not duplicate it.
          arabic1: [],
          // Audio sources have a separate, explicitly requested loading path.
          audio: {},
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error) {
    console.error('[surah-content]', error);
    return NextResponse.json({ error: 'Surah content unavailable' }, { status: 502 });
  }
}
