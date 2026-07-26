import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import { getCurrentUser } from '@/lib/auth/current-user';
import {
  buildProtectedDownloadHeaders,
  unauthorizedDownloadResponse,
} from '@/lib/protected-download-response';
import { getSurahById } from '@/lib/quran-index';
import {
  buildSurahPdfFileName,
  type SurahPdfVariant,
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

function parseVariant(value: string | null): SurahPdfVariant | null {
  if (value === 'arabic' || value === 'arabic-urdu') {
    return value;
  }
  return null;
}

export async function GET(
  _request: Request,
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

  const { searchParams } = new URL(_request.url);
  const variant = parseVariant(searchParams.get('variant'));

  if (!variant) {
    return Response.json(
      { error: 'Missing or invalid variant. Use variant=arabic or variant=arabic-urdu' },
      { status: 400 }
    );
  }

  const surah = getSurahById(surahId);
  if (!surah) {
    return Response.json({ error: 'Surah not found' }, { status: 404 });
  }

  const storedFileName = `${String(surahId).padStart(3, '0')}-${variant}.pdf`;
  const filePath = join(
    process.cwd(),
    'public',
    'surah-pdfs',
    storedFileName
  );

  try {
    const fileStats = await stat(filePath);
    const fileStream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

    return new Response(fileStream, {
      headers: buildProtectedDownloadHeaders(
        buildSurahPdfFileName(surah, variant),
        'application/pdf',
        fileStats.size
      ),
    });
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException).code;

    if (errorCode === 'ENOENT') {
      return Response.json({ error: 'PDF unavailable' }, { status: 404 });
    }

    console.error('[surah-pdf-download]', error);
    return Response.json({ error: 'PDF download failed' }, { status: 500 });
  }
}
