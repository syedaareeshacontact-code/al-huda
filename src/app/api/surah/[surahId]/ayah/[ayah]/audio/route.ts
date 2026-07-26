import { getCurrentUser } from '@/lib/auth/current-user';
import {
  createRemoteDownloadResponse,
  unauthorizedDownloadResponse,
} from '@/lib/protected-download-response';
import { getSurahById } from '@/lib/quran-index';
import { getAyahAudioUrls } from '@/lib/quran-server';
import { slugifyDownloadName } from '@/lib/surah-download';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AyahAudioVariant = 'arabic' | 'urdu';

function parseIntegerInRange(
  value: string,
  minimum: number,
  maximum: number
): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    return null;
  }

  return parsed;
}

function parseVariant(value: string | null): AyahAudioVariant | null {
  return value === 'arabic' || value === 'urdu' ? value : null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ surahId: string; ayah: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedDownloadResponse();
  }

  const { surahId: surahIdParam, ayah: ayahParam } = await context.params;
  const surahId = parseIntegerInRange(surahIdParam, 1, 114);
  const surah = surahId ? getSurahById(surahId) : null;
  const ayahNumber = surah
    ? parseIntegerInRange(ayahParam, 1, surah.totalAyah)
    : null;

  if (!surahId || !surah || !ayahNumber) {
    return Response.json(
      { error: 'Invalid surah or ayah number' },
      { status: 400 }
    );
  }

  const variant = parseVariant(new URL(request.url).searchParams.get('variant'));

  if (!variant) {
    return Response.json(
      { error: 'Missing or invalid variant. Use variant=arabic or variant=urdu' },
      { status: 400 }
    );
  }

  try {
    const audioUrls = await getAyahAudioUrls(surahId, ayahNumber);
    const sourceUrl = audioUrls[variant];

    if (!sourceUrl) {
      return Response.json({ error: 'Audio source unavailable' }, { status: 404 });
    }

    const surahSlug = slugifyDownloadName(surah.surahName);

    return createRemoteDownloadResponse({
      sourceUrl,
      fileName: `surah-${String(surahId).padStart(3, '0')}-${surahSlug}-ayah-${ayahNumber}-${variant}.mp3`,
      signal: request.signal,
    });
  } catch (error) {
    console.error('[ayah-audio-download]', error);
    return Response.json({ error: 'Audio download failed' }, { status: 502 });
  }
}
