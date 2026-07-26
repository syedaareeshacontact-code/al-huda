import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SOURCE_URL = 'https://api.quran.com/api/v4/chapters?language=en';
const UTHMANI_SOURCE_URL = 'https://api.alquran.cloud/v1/surah';
const OUTPUT_PATH = resolve(process.cwd(), 'src/data/surah-index.json');

function getUthmaniSurahTitle(value) {
  return String(value ?? '').replace(/^سُورَةُ\s*/u, '').trim();
}

async function main() {
  const [response, uthmaniResponse] = await Promise.all([
    fetch(SOURCE_URL, {
      headers: {
        Accept: 'application/json',
      },
    }),
    fetch(UTHMANI_SOURCE_URL, {
      headers: {
        Accept: 'application/json',
      },
    }),
  ]);

  if (!response.ok) {
    throw new Error(`Unable to fetch surah index (${response.status})`);
  }

  if (!uthmaniResponse.ok) {
    throw new Error(`Unable to fetch Uthmani Surah names (${uthmaniResponse.status})`);
  }

  const [payload, uthmaniPayload] = await Promise.all([
    response.json(),
    uthmaniResponse.json(),
  ]);
  const chapters = Array.isArray(payload?.chapters) ? payload.chapters : [];
  const uthmaniSurahs = Array.isArray(uthmaniPayload?.data) ? uthmaniPayload.data : [];
  if (chapters.length !== 114 || uthmaniSurahs.length !== 114) {
    throw new Error('Unexpected surah index payload.');
  }

  const uthmaniNamesById = new Map(
    uthmaniSurahs.map((entry) => [
      Number(entry?.number ?? 0),
      getUthmaniSurahTitle(entry?.name),
    ])
  );

  const normalized = chapters.map((entry) => ({
    id: Number(entry?.id ?? 0),
    surahName: String(entry?.name_simple ?? ''),
    surahNameArabic: String(entry?.name_arabic ?? ''),
    surahNameArabicUthmani:
      uthmaniNamesById.get(Number(entry?.id ?? 0)) || String(entry?.name_arabic ?? ''),
    surahNameArabicLong:
      entry?.name_complex !== undefined ? String(entry.name_complex) : undefined,
    surahNameTranslation: String(entry?.translated_name?.name ?? ''),
    revelationPlace: String(entry?.revelation_place ?? ''),
    totalAyah: Number(entry?.verses_count ?? 0),
  }));

  await writeFile(OUTPUT_PATH, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  process.stdout.write(`Surah index updated: ${OUTPUT_PATH}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
