import { getCurrentUser } from '@/lib/auth/current-user';
import {
  createRemoteDownloadResponse,
  unauthorizedDownloadResponse,
} from '@/lib/protected-download-response';
import { getSurahById } from '@/lib/quran-index';
import {
  buildSurahAudioFileName,
  getSurahArabicAudioUrl,
  getSurahUrduAudioUrl,
  SURAH_RECITERS,
  type SurahAudioVariant,
} from '@/lib/surah-download';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

function parseReciter(value: string | null) {
  const parsed = Number(value);
  return SURAH_RECITERS.find((reciter) => reciter.id === parsed) ?? SURAH_RECITERS[0];
}

export async function GET(
  request: Request,
  context: { params: Promise<{ surahId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedDownloadResponse();
  }

  const { surahId: surahIdParam } = await context.params;
  const surahId = parseSurahId(surahIdParam);

  if (!surahId) {
    return Response.json({ error: 'Invalid surah ID' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const variant = parseVariant(searchParams.get('variant'));

  if (!variant) {
    return Response.json(
      { error: 'Missing or invalid variant. Use variant=arabic or variant=urdu' },
      { status: 400 }
    );
  }

  const surah = getSurahById(surahId);
  if (!surah) {
    return Response.json({ error: 'Surah not found' }, { status: 404 });
  }

  try {
    let sourceUrl: string | null = null;
    let fileName: string;

    if (variant === 'arabic') {
      const reciter = parseReciter(searchParams.get('reciter'));
      sourceUrl = await getSurahArabicAudioUrl(surahId, reciter.id);
      fileName = buildSurahAudioFileName(surah, variant, reciter.name);
    } else {
      sourceUrl = await getSurahUrduAudioUrl(surahId);
      fileName = buildSurahAudioFileName(surah, variant);
    }

    if (!sourceUrl) {
      return Response.json({ error: 'Audio source unavailable' }, { status: 404 });
    }

    return createRemoteDownloadResponse({
      sourceUrl,
      fileName,
      signal: request.signal,
    });
  } catch (error) {
    console.error('[surah-audio]', error);
    return Response.json({ error: 'Audio download failed' }, { status: 502 });
  }
}
