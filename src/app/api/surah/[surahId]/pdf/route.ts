import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/current-user';
import { buildSurahPdfPublicPath, type SurahPdfVariant } from '@/lib/surah-download';

export const runtime = 'nodejs';

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

/** Legacy API fallback — redirects to static /surah-pdfs/001-arabic.pdf files. */
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
      { error: 'Missing or invalid variant. Use variant=arabic or variant=arabic-urdu' },
      { status: 400 }
    );
  }

  const staticPath = buildSurahPdfPublicPath(surahId, variant);
  const response = NextResponse.redirect(new URL(staticPath, request.url), 302);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
