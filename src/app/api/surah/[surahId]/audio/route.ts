import { NextResponse } from 'next/server';

import { getSurahById } from '@/lib/quran-index';
import {
  buildSurahAudioFileName,
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

function getExtensionFromUrl(url: string): string {
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith('.mp3')) return 'mp3';
  if (pathname.endsWith('.ogg')) return 'ogg';
  if (pathname.endsWith('.mpeg')) return 'mpeg';
  return 'mp3';
}

function getContentType(ext: string): string {
  if (ext === 'ogg') return 'audio/ogg';
  if (ext === 'mpeg') return 'audio/mpeg';
  return 'audio/mpeg';
}

export async function GET(
  request: Request,
  context: { params: Promise<{ surahId: string }> }
) {
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

  const surah = getSurahById(surahId);
  if (!surah) {
    return NextResponse.json({ error: 'Surah not found' }, { status: 404 });
  }

  try {
    let sourceUrl: string | null = null;
    let reciterName: string | undefined;

    if (variant === 'arabic') {
      const reciterId = parseReciterId(searchParams.get('reciter'));
      reciterName = SURAH_RECITERS.find((r) => r.id === reciterId)?.name;
      sourceUrl = await getSurahArabicAudioUrl(surahId, reciterId);
    } else {
      sourceUrl = await getSurahUrduAudioUrl(surahId);
    }

    if (!sourceUrl) {
      return NextResponse.json({ error: 'Audio source unavailable' }, { status: 404 });
    }

    const audioResponse = await fetch(sourceUrl, {
      next: { revalidate: 86400 },
    });

    if (!audioResponse.ok) {
      return NextResponse.json({ error: 'Audio fetch failed' }, { status: 502 });
    }

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    const ext = getExtensionFromUrl(sourceUrl);
    const baseName = buildSurahAudioFileName(surah, variant, reciterName);
    const fileName = baseName.includes('.') ? baseName : `${baseName}.${ext}`;

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': getContentType(ext),
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('[surah-audio]', error);
    return NextResponse.json({ error: 'Audio download failed' }, { status: 500 });
  }
}
