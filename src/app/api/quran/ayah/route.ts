import { NextRequest, NextResponse } from 'next/server';

import { getSurahById } from '@/lib/quran-index';
import {
  getAyahAudioUrls,
  getAyahContent,
  getUrduTafsirByAyah,
  sanitizeTafsirHtml,
} from '@/lib/quran-server';
import { hasTafsirForAyah } from '@/lib/tafsir-index';
import type { AyahDetailPayload } from '@/types/quran';

export const runtime = 'nodejs';
export const revalidate = 86400;

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: NextRequest) {
  const surahId = parsePositiveInteger(request.nextUrl.searchParams.get('surah'));
  const ayahNumber = parsePositiveInteger(request.nextUrl.searchParams.get('ayah'));
  const includeTafsir = request.nextUrl.searchParams.get('includeTafsir') === 'true';
  const surah = surahId ? getSurahById(surahId) : null;

  if (!surah || !ayahNumber || ayahNumber > surah.totalAyah) {
    return NextResponse.json(
      { message: 'Invalid surah or ayah query.' },
      { status: 400 }
    );
  }

  const hasTafsir = hasTafsirForAyah(surah.id, ayahNumber);

  try {
    const [ayah, audio, tafsir] = await Promise.all([
      getAyahContent(surah.id, ayahNumber),
      getAyahAudioUrls(surah.id, ayahNumber),
      includeTafsir && hasTafsir
        ? getUrduTafsirByAyah(surah.id, ayahNumber)
        : Promise.resolve(null),
    ]);

    if (!ayah) {
      return NextResponse.json({ message: 'Ayah was not found.' }, { status: 404 });
    }

    const payload: AyahDetailPayload = {
      surahId: surah.id,
      ayahNumber,
      arabicText: ayah.arabicText,
      englishTranslation: ayah.englishTranslation,
      urduTranslation: ayah.urduTranslation,
      audio,
      hasTafsir,
      tafsir: tafsir
        ? {
            ...tafsir,
            textHtml: sanitizeTafsirHtml(tafsir.textHtml),
          }
        : null,
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('[quran-ayah]', error);
    return NextResponse.json(
      { message: 'Ayah details are temporarily unavailable.' },
      { status: 502 }
    );
  }
}
