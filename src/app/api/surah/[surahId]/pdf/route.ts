import { NextResponse } from 'next/server';

import { getSurahById } from '@/lib/quran-index';
import { getAyahRowsForSurah } from '@/lib/quran-server';
import {
  buildSurahPdfFileName,
  buildSurahPdfPublicPath,
  type SurahPdfVariant,
} from '@/lib/surah-download';
import { readPrebuiltPdfBuffer, resolveSurahPdfBuffer } from '@/lib/surah-pdf-generator';

export const runtime = 'nodejs';
export const revalidate = 86400;

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

/** Legacy API fallback — prefer static /surah-pdfs/001-arabic.pdf links */
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
      { error: 'Missing or invalid variant. Use variant=arabic or variant=arabic-urdu' },
      { status: 400 }
    );
  }

  const surah = getSurahById(surahId);
  if (!surah) {
    return NextResponse.json({ error: 'Surah not found' }, { status: 404 });
  }

  const staticPath = buildSurahPdfPublicPath(surahId, variant);
  const prebuilt = await readPrebuiltPdfBuffer(surahId, variant);
  if (prebuilt) {
    return new NextResponse(new Uint8Array(prebuilt), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${buildSurahPdfFileName(surah, variant)}"`,
        'Content-Length': String(prebuilt.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-PDF-Source': 'prebuilt',
        'Link': `<${staticPath}>; rel="canonical"`,
      },
    });
  }

  try {
    const ayahs = await getAyahRowsForSurah(surahId);
    if (ayahs.length === 0) {
      return NextResponse.json({ error: 'Surah content unavailable' }, { status: 503 });
    }

    const pdfBuffer = await resolveSurahPdfBuffer({ surah, ayahs, variant });
    const fileName = buildSurahPdfFileName(surah, variant);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        'X-PDF-Source': 'generated',
      },
    });
  } catch (error) {
    console.error('[surah-pdf]', error);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
