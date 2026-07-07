import { getAllSurahs } from '@/lib/quran-index';

const SURAH_ENGLISH_ACTIONS = [
  'read online',
  'read online free',
  'with urdu translation',
  'with english translation',
  'urdu tarjuma',
  'audio tilawat',
  'audio recitation',
  'full text',
  'full surah',
  'pdf',
  'mp3 download',
  'tafseer urdu',
  'tafseer english',
  'meaning in urdu',
  'translation and tafseer',
  'arabic text',
  'online reading',
  'listen online',
  'memorization',
  'for kids',
  'with transliteration',
  'word by word',
  'benefits of reading',
  'when to read',
  'complete surah',
];

const SURAH_URDU_ACTIONS = [
  'اردو ترجمہ',
  'آن لائن پڑھیں',
  'تلاوت',
  'تفسیر',
  'مکمل سورت',
  'آڈیو',
  'فضائل',
  'ترجمہ اور تفسیر',
  'عربی متن',
  'مفت پڑھیں',
];

const AYAH_ACTIONS = [
  'translation urdu',
  'translation english',
  'tafseer urdu',
  'meaning in urdu',
  'arabic text',
  'audio',
  'read online',
  'explanation',
  'benefits',
  'full ayah',
];

const POPULAR_SURAH_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
  40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 55, 56, 57, 58, 59, 60, 61, 62,
  63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81,
  82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
  101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
];

const POPULAR_AYAH_NUMBERS = [1, 2, 3, 4, 5, 255, 286];

const JUZ_KEYWORDS = Array.from({ length: 30 }, (_, index) => {
  const juz = index + 1;
  return [
    `juz ${juz} quran online`,
    `para ${juz} quran urdu translation`,
    `juz ${juz} read online`,
    `quran para ${juz} pdf`,
    `جوز ${juz} قرآن`,
  ];
}).flat();

const PARA_KEYWORDS = Array.from({ length: 30 }, (_, index) => {
  const para = index + 1;
  return [
    `quran para ${para} online`,
    `para ${para} urdu translation`,
    `read para ${para} online`,
    `قرآن پارہ ${para}`,
  ];
}).flat();

const HADITH_BOOKS = [
  'sahih bukhari',
  'sahih muslim',
  'sunan abu dawud',
  'jami tirmidhi',
  'sunan nasai',
  'sunan ibn majah',
  'muwatta malik',
  'musnad ahmad',
];

const HADITH_ACTIONS = [
  'online',
  'english translation',
  'urdu translation',
  'arabic text',
  'full book',
  'read online free',
  'hadith search',
  'authentic hadith',
];

const TAFSEER_TOPICS = [
  'surah yaseen tafseer urdu',
  'surah baqarah tafseer urdu',
  'surah rahman tafseer urdu',
  'surah kahf tafseer urdu',
  'surah mulk tafseer urdu',
  'surah waqiah tafseer urdu',
  'ayat ul kursi tafseer urdu',
  'last ayah baqarah tafseer',
  'quran tafseer ibn kathir urdu',
  'quran tafseer urdu complete',
  'quran tafseer by ayah',
  'quran explanation urdu',
  'quran maani urdu',
  'quran tafseer pdf',
  'quran tafseer online free',
];

const LONG_TAIL_QURAN = [
  'read quran online without download',
  'read quran online with translation',
  'read quran online page by page',
  'read quran online for beginners',
  'read quran online with tajweed rules',
  'read quran online night prayer',
  'read quran online ramadan',
  'read quran online taraweeh',
  'read quran online after fajr',
  'read quran online with bookmark',
  'read quran online progress tracker',
  'read quran online dark mode',
  'read quran online large font',
  'read quran online for women',
  'read quran online for children',
  'read quran online with audio sync',
  'read quran online urdu and english side by side',
  'read quran online ayah by ayah',
  'read quran online surah wise',
  'read quran online juz wise',
  'read quran online para wise',
  'read quran online complete',
  'read quran online 114 surahs',
  'read quran online 6236 ayahs',
  'read quran online holy book',
  'read quran online islamic website',
  'read quran online pakistan urdu',
  'read quran online india urdu',
  'read quran online saudi arabic',
  'read quran online authentic translation',
];

function normalizeKeyword(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function buildSurahKeywordSet() {
  const surahs = getAllSurahs();
  const keywords = new Set<string>();

  for (const surah of surahs) {
    const name = surah.surahName.toLowerCase();
    const translation = surah.surahNameTranslation.toLowerCase();
    const arabic = surah.surahNameArabic.trim();
    const id = surah.id;

    keywords.add(`surah ${name}`);
    keywords.add(`surah ${id}`);
    keywords.add(`surah ${name} quran`);
    keywords.add(`surah ${translation}`);
    keywords.add(`quran surah ${id}`);
    keywords.add(`${name} surah read online`);
    keywords.add(`${arabic} surah`);

    for (const action of SURAH_ENGLISH_ACTIONS) {
      keywords.add(`surah ${name} ${action}`);
      keywords.add(`surah ${translation} ${action}`);
      keywords.add(`${name} ${action}`);
    }

    for (const action of SURAH_URDU_ACTIONS) {
      keywords.add(`سورہ ${name} ${action}`);
      keywords.add(`surah ${name} ${action}`);
    }
  }

  return Array.from(keywords);
}

function buildAyahKeywordSet() {
  const surahs = getAllSurahs().filter((surah) => POPULAR_SURAH_IDS.includes(surah.id));
  const keywords = new Set<string>();

  for (const surah of surahs) {
    const name = surah.surahName.toLowerCase();

    for (const ayahNumber of POPULAR_AYAH_NUMBERS) {
      if (ayahNumber > surah.totalAyah) {
        continue;
      }

      keywords.add(`ayah ${surah.id}:${ayahNumber}`);
      keywords.add(`surah ${name} ayah ${ayahNumber}`);
      keywords.add(`quran ${surah.id}:${ayahNumber}`);

      for (const action of AYAH_ACTIONS) {
        keywords.add(`ayah ${surah.id}:${ayahNumber} ${action}`);
        keywords.add(`surah ${name} ayah ${ayahNumber} ${action}`);
      }
    }
  }

  return Array.from(keywords);
}

function buildHadithKeywordSet() {
  const keywords = new Set<string>();

  for (const book of HADITH_BOOKS) {
    for (const action of HADITH_ACTIONS) {
      keywords.add(`${book} ${action}`);
    }
    keywords.add(`${book} full text online`);
    keywords.add(`${book} hadith number search`);
  }

  return Array.from(keywords);
}

export const GENERATED_SURAH_KEYWORDS = buildSurahKeywordSet();
export const GENERATED_AYAH_KEYWORDS = buildAyahKeywordSet();
export const GENERATED_HADITH_KEYWORDS = buildHadithKeywordSet();
export const GENERATED_JUZ_PARA_KEYWORDS = [...JUZ_KEYWORDS, ...PARA_KEYWORDS];
export const GENERATED_TAFSEER_KEYWORDS = TAFSEER_TOPICS.map(normalizeKeyword);
export const GENERATED_LONG_TAIL_KEYWORDS = LONG_TAIL_QURAN.map(normalizeKeyword);

export function buildSurahPageKeywords(options: {
  surahId: number;
  surahName: string;
  surahNameArabic: string;
  surahNameTranslation: string;
}) {
  const { surahId, surahName, surahNameArabic, surahNameTranslation } = options;
  const name = surahName.toLowerCase();
  const translation = surahNameTranslation.toLowerCase();

  const specific = [
    `surah ${name}`,
    `surah ${surahId}`,
    `surah ${surahNameArabic}`,
    `surah ${translation}`,
    `read surah ${name} online`,
    `surah ${name} urdu translation`,
    `surah ${name} english translation`,
    `surah ${name} audio`,
    `surah ${name} tafseer urdu`,
    `surah ${name} full text`,
    `surah ${name} tilawat`,
    `surah ${name} mp3`,
    `surah ${name} meaning`,
    `surah ${name} benefits`,
    `quran surah ${surahId}`,
    `سورہ ${name}`,
    `سورہ ${name} اردو ترجمہ`,
    `سورہ ${name} تفسیر`,
  ];

  const related = GENERATED_SURAH_KEYWORDS.filter((keyword) =>
    keyword.includes(name) || keyword.includes(String(surahId))
  );

  return Array.from(new Set([...specific, ...related])).slice(0, 120);
}

export function buildAyahPageKeywords(options: {
  surahId: number;
  surahName: string;
  ayahNumber: number;
}) {
  const { surahId, surahName, ayahNumber } = options;
  const name = surahName.toLowerCase();

  const specific = [
    `ayah ${surahId}:${ayahNumber}`,
    `surah ${name} ayah ${ayahNumber}`,
    `quran ${surahId}:${ayahNumber}`,
    `ayah ${surahId}:${ayahNumber} urdu translation`,
    `ayah ${surahId}:${ayahNumber} english translation`,
    `ayah ${surahId}:${ayahNumber} tafseer urdu`,
    `ayah ${surahId}:${ayahNumber} arabic text`,
    `ayah ${surahId}:${ayahNumber} audio`,
    `surah ${name} verse ${ayahNumber}`,
  ];

  const related = GENERATED_AYAH_KEYWORDS.filter((keyword) =>
    keyword.includes(`${surahId}:${ayahNumber}`) || keyword.includes(`surah ${name} ayah ${ayahNumber}`)
  );

  return Array.from(new Set([...specific, ...related])).slice(0, 80);
}

export function buildTafsirPageKeywords(options: {
  surahId: number;
  surahName: string;
  ayahNumber: number;
}) {
  return Array.from(
    new Set([
      ...buildAyahPageKeywords(options),
      ...GENERATED_TAFSEER_KEYWORDS,
      `tafseer ${options.surahId}:${options.ayahNumber}`,
      `tafseer surah ${options.surahName.toLowerCase()} ayah ${options.ayahNumber}`,
      `urdu tafseer ${options.surahId}:${options.ayahNumber}`,
    ])
  ).slice(0, 80);
}

export const ALL_GENERATED_SEO_KEYWORDS = Array.from(
  new Set([
    ...GENERATED_SURAH_KEYWORDS,
    ...GENERATED_AYAH_KEYWORDS,
    ...GENERATED_HADITH_KEYWORDS,
    ...GENERATED_JUZ_PARA_KEYWORDS,
    ...GENERATED_TAFSEER_KEYWORDS,
    ...GENERATED_LONG_TAIL_KEYWORDS,
  ])
);
