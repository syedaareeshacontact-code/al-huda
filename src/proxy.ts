import { NextResponse, type NextRequest } from 'next/server';

import { getCanonicalSurahSlugById } from '@/lib/quran-index';

function redirectNumericQuranPath(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const surahMatch = /^\/surah\/(\d+)(?:\/(ayah\/\d+|download))?$/.exec(pathname);
  const tafsirMatch = /^\/tafsir\/(\d+)(?:\/(\d+))?$/.exec(pathname);
  const match = surahMatch ?? tafsirMatch;

  if (!match) {
    return null;
  }

  const surahId = Number(match[1]);
  const canonicalSlug = getCanonicalSurahSlugById(surahId);
  if (!canonicalSlug || canonicalSlug === String(surahId)) {
    return null;
  }

  const suffix = match[2] ? `/${match[2]}` : '';
  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = surahMatch ? `/surah/${canonicalSlug}${suffix}` : `/tafsir/${canonicalSlug}${suffix}`;

  return NextResponse.redirect(nextUrl, 308);
}

function rewriteSurahPdfDownload(request: NextRequest) {
  const match =
    /^\/surah-pdfs\/(\d{3})-(arabic|arabic-urdu)\.pdf$/.exec(
      request.nextUrl.pathname
    );

  if (!match) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = `/api/surah/${Number(match[1])}/pdf`;
  nextUrl.search = '';
  nextUrl.searchParams.set('variant', match[2]);

  return NextResponse.rewrite(nextUrl);
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/surah-pdfs/')) {
    return rewriteSurahPdfDownload(request);
  }

  return redirectNumericQuranPath(request) ?? NextResponse.next();
}

export const config = {
  matcher: [
    '/surah-pdfs/:path*',
    '/surah/:surah(\\d+)',
    '/surah/:surah(\\d+)/ayah/:ayah(\\d+)',
    '/surah/:surah(\\d+)/download',
    '/tafsir/:surah(\\d+)',
    '/tafsir/:surah(\\d+)/:ayah(\\d+)',
  ],
};
