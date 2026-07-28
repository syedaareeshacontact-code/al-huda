import { NextResponse } from 'next/server';

import { searchHadiths } from '@/lib/hadith/hadith.service';
import { buildHadithDetailPath } from '@/lib/hadith/hadith-routing';

function isHadithNumberQuery(value: string) {
  return /^#?\d+$/.test(value.trim());
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';

  if (query.length < 2 && !isHadithNumberQuery(query)) {
    return NextResponse.json({ results: [] });
  }

  try {
    const response = await searchHadiths(query, 1, 8);
    const results = response.hadiths.data.map((hadith) => ({
      id: hadith.id,
      hadithNumber: hadith.hadithNumber,
      bookName: hadith.book.bookName,
      bookSlug: hadith.book.bookSlug,
      chapterName: hadith.chapter.chapterEnglish,
      status: hadith.status,
      englishNarrator: hadith.englishNarrator,
      hadithEnglish: hadith.hadithEnglish,
      hadithUrdu: hadith.hadithUrdu,
      href: buildHadithDetailPath(hadith.book.bookSlug, hadith.hadithNumber),
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
