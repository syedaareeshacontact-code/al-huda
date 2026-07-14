import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/current-user';
import {
  getSurahArabicAudioUrl,
  getSurahUrduAudioUrl,
  SURAH_RECITERS,
  type SurahAudioVariant,
  type SurahReciterId,
} from '@/lib/surah-download';

export const runtime = 'nodejs';
export const revalidate = 86400;

function parseSurahId(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 114) {
    return null;
  }
  return parsed;
}

function parseVariant(value: string | null): SurahAudioVariant | null {
  if (value === 'arabic' || value === 'urdu') {
    return value;
  }
  return null;
}

function parseReciterId(value: string | null): SurahReciterId {
  const parsed = Number(value);
  const valid = SURAH_RECITERS.find((r) => r.id === parsed);
  return valid?.id ?? SURAH_RECITERS[0].id;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ surahId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { surahId: surahIdParam } = await context.params;
  const surahId = parseSurahId(surahIdParam);

  if (!surahId) {
    return NextResponse.json({ error: 'Invalid surah ID' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const variant = parseVariant(searchParams.get('variant'));

  if (!variant) {
    return NextResponse.json(
      { error: 'Missing or invalid variant. Use variant=arabic or variant=urdu' },
      { status: 400 }
    );
  }

  try {
    let sourceUrl: string | null = null;

    if (variant === 'arabic') {
      const reciterId = parseReciterId(searchParams.get('reciter'));
      sourceUrl = await getSurahArabicAudioUrl(surahId, reciterId);
    } else {
      sourceUrl = await getSurahUrduAudioUrl(surahId);
    }

    if (!sourceUrl) {
      return NextResponse.json({ error: 'Audio source unavailable' }, { status: 404 });
    }

    const response = NextResponse.redirect(sourceUrl, 302);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    console.error('[surah-audio]', error);
    return NextResponse.json({ error: 'Audio download failed' }, { status: 500 });
  }
}
