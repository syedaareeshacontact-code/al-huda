export const CORE_QURAN_KEYWORDS = [
  'quran online read',
  'read quran online',
  'quran pak online',
  'quran majeed online',
  'online quran reading',
  'holy quran online',
  'al quran online',
  'quran website',
  'quran reader',
  'digital quran',
  'online quran platform',
  'quran web app',
  'free quran online',
  'quran 114 surahs',
];

export const URDU_TRANSLATION_KEYWORDS = [
  'quran with urdu translation',
  'quran urdu tarjuma',
  'quran tarjuma urdu online',
  'quran urdu translation audio',
  'quran with urdu translation and tafseer',
  'authentic quran urdu translation',
  'easy urdu translation quran',
  'quran urdu translation pdf',
  'quran urdu tarjuma download',
  'quran english translation urdu',
  'quran multiple translations',
];

export const AUDIO_KEYWORDS = [
  'listen quran online',
  'quran audio online',
  'quran tilawat audio',
  'quran recitation online',
  'quran arabic audio',
  'quran urdu audio',
  'quran audio download',
  'quran tilawat download',
  'quran audio download mp3',
  'quran urdu translation audio download',
  'quran audio players',
  'quranic verses audio',
  'quran recitation mp3',
];

export const SURAH_AYAH_KEYWORDS = [
  'surah yasin read online',
  'surah rahman with urdu translation',
  'surah kahf friday read',
  'surah mulk read before sleep',
  'surah waqiah with urdu tarjuma',
  'surah fatiha translation urdu',
  'surah baqarah ayat ul kursi',
  'ayat ul kursi in arabic',
  'ayat ul kursi urdu translation',
  'ayat ul kursi audio',
  '2:255 tafseer urdu',
  'last 2 ayat of surah baqarah urdu translation',
  '3 qul read with translation',
  'last 10 surahs of quran',
  'last juz of quran',
  'juz amma full quran',
  'surah al kafirun',
  'surah ikhlas',
  'surah an nas',
  'surah al falaq',
];

export const TAFSEER_LEARNING_KEYWORDS = [
  'quran tafseer urdu',
  'ayah tafseer urdu',
  'tafseer of surah yasin urdu',
  'read quran online with tajweed',
  'learn tajweed online',
  'quran with harakat online',
  'quran font large',
  'quran 30 para online',
  'juz amma online',
  'quran tafseer english',
  'quranic interpretation',
  'learn quran online',
  'quran study guide',
  'tafseer ul quran urdu',
];

export const TRUST_KEYWORDS = [
  'best quran app web urdu translation',
  'simple quran reading website',
  'authentic quran reader',
  'quran app reviews',
  'reliable quran website',
  'trusted quran platform',
];

export const ISLAMIC_LEARNING_KEYWORDS = [
  'islamic knowledge online',
  'hadith online',
  'islamic education',
  'learn islam online',
  'quranic learning',
  'islamic studies',
];

export const ISLAMIC_TOOLS_KEYWORDS = [
  'namaz timing',
  'prayer times pakistan',
  'islamic prayer times',
  'qibla direction',
  'hijri calendar',
  'islamic duas',
  'morning azkar',
  'evening azkar',
  '99 names of allah',
  'asma ul husna',
  'zakat calculator',
  'mosque finder',
  'masjid near me',
  'namaz ka waqt',
  'fajr time today',
  'maghrib time today',
];

export const ACCESSIBILITY_KEYWORDS = [
  'accessible quran reader',
  'quran for beginners',
  'simple quran interface',
  'easy to use quran app',
  'user friendly quran reader',
];

export const TECHNICAL_KEYWORDS = [
  'offline quran app',
  'quran progressive web app',
  'quran mobile app',
  'quran web version',
  'quran cross platform',
  'dark mode quran reader',
];

export const CORE_HADITH_KEYWORDS = [
  'hadith online',
  'read hadith online',
  'islamic hadith',
  'authentic hadith',
  'sunnah online',
  'prophetic traditions',
  'hadith in english',
  'hadith urdu translation',
  'hadith arabic english urdu',
  'islamic hadith library',
  'hadith collections online',
  'free hadith online',
];

export const SAHIH_HADITH_KEYWORDS = [
  'sahih bukhari online',
  'sahih muslim online',
  'sahih bukhari english',
  'sahih muslim english',
  'sahih bukhari urdu',
  'sahih muslim urdu',
  'bukhari hadith online',
  'muslim hadith online',
  'sunan abu dawud online',
  'jami tirmidhi online',
  'sunan nasai online',
  'sunan ibn majah online',
];

export const HADITH_SEARCH_KEYWORDS = [
  'search hadith online',
  'hadith search by keyword',
  'find hadith online',
  'hadith lookup',
  'islamic hadith search',
  'sunnah search',
];

export const HADITH_LEARNING_KEYWORDS = [
  'learn hadith online',
  'islamic knowledge hadith',
  'hadith for beginners',
  'understanding hadith',
  'hadith explanation',
  'narrator chain hadith',
  'hadith grade sahih hasan',
];

export const GLOBAL_HADITH_SEO_KEYWORDS = Array.from(
  new Set([
    ...CORE_HADITH_KEYWORDS,
    ...SAHIH_HADITH_KEYWORDS,
    ...HADITH_SEARCH_KEYWORDS,
    ...HADITH_LEARNING_KEYWORDS,
  ])
);

export function buildHadithCollectionKeywords(bookName: string, writerName: string) {
  const normalizedBook = bookName.toLowerCase();

  return Array.from(
    new Set([
      ...GLOBAL_HADITH_SEO_KEYWORDS,
      bookName,
      `${bookName} online`,
      `${bookName} english`,
      `${bookName} urdu`,
      `${bookName} arabic`,
      `${bookName} hadith`,
      writerName,
      `${writerName} hadith`,
      `${normalizedBook} read online`,
      `${normalizedBook} full text`,
    ])
  );
}

export function buildHadithDetailKeywords(options: {
  bookName: string;
  writerName: string;
  hadithNumber: string;
  chapterEnglish?: string;
  grade?: string;
}) {
  const { bookName, writerName, hadithNumber, chapterEnglish, grade } = options;

  return Array.from(
    new Set([
      ...buildHadithCollectionKeywords(bookName, writerName),
      `hadith ${hadithNumber}`,
      `${bookName} hadith ${hadithNumber}`,
      `${bookName} ${hadithNumber}`,
      chapterEnglish,
      grade ? `${grade} hadith` : undefined,
      'hadith translation urdu',
      'hadith english translation',
    ].filter(Boolean) as string[])
  );
}

/**
 * LOCAL SEO - Pakistan Keywords
 */
export const PAKISTAN_LOCAL_KEYWORDS = [
  'quran app pakistan',
  'quran reader pakistan',
  'quran app urdu pakistan',
  'online quran reader pakistan',
  'free quran app pakistan',
  'quran app karachi',
  'quran app islamabad',
  'quran app lahore',
  'quran app rawalpindi',
  'quran app multan',
  'quran app faisalabad',
  'quran app peshawar',
  'قرآن ایپ',
  'قرآن ایپ پاکستان',
  'آن لائن قرآن',
  'قرآن اردو میں',
  'مفت قرآن ایپ',
  'quran memorization pakistan',
  'tajweed lessons online pakistan',
  'quran learning app pakistan',
  'islamic education app pakistan',
];

export const CITY_KEYWORDS = {
  karachi: [
    'quran app karachi',
    'quran reader karachi',
    'islamic learning karachi',
    'تعليم قرآن کراچی',
  ],
  islamabad: [
    'quran app islamabad',
    'quran learning islamabad',
    'islamic education islamabad',
    'قرآن اسلام آباد',
  ],
  lahore: [
    'quran app lahore',
    'quran reader lahore',
    'islamic app lahore',
    'قرآن لاہور',
  ],
  rawalpindi: [
    'quran app rawalpindi',
    'islamic learning rawalpindi',
    'قرآن راولپنڈی',
  ],
  multan: [
    'quran app multan',
    'islamic education multan',
    'قرآن ملتان',
  ],
};

export const ALL_LOCAL_KEYWORDS = [
  ...PAKISTAN_LOCAL_KEYWORDS,
  ...Object.values(CITY_KEYWORDS).flat(),
];

export const VOICE_SEARCH_KEYWORDS = [
  'how to read quran',
  'how do i read the quran',
  'where can i read the quran online',
  'what is surah yaseen',
  'what is ayat ul kursi',
  'how to memorize the quran',
  'how to learn tajweed',
  'what does quran say about',
  'what is the meaning of',
  'how many surahs are in the quran',
  'how many ayahs are in the quran',
  'what is the best time to read quran',
  'what are the benefits of reading quran',
  'how to listen to quran recitation',
  'where can i find quran translation',
  'what is tafseer',
  'how do i track my reading progress',
  'what is quran app for',
  'best quran reader app',
  'easiest way to read quran',
  'quran reading tips',
  'how to understand quran',
  'islamic learning for beginners',
  'what is sahih bukhari',
  'what is sahih muslim',
  'how to search hadith online',
  'where can i read hadith online',
  'what are the six books of hadith',
];

export const VOICE_SEARCH_QUESTIONS = [
  {
    question: 'What is Surah Yaseen?',
    answer: 'Surah Yaseen is the 36th chapter of the Quran, known for its spiritual significance and beautiful recitation.',
    keywords: ['surah yaseen', 'chapter 36', 'quran yaseen'],
  },
  {
    question: 'What is Ayat ul Kursi?',
    answer: 'Ayat ul Kursi (Verse of the Throne) is Quran 2:255, one of the most powerful verses in the Quran about the majesty of Allah.',
    keywords: ['ayat ul kursi', 'quran 2:255', 'verse of throne'],
  },
  {
    question: 'How many Surahs are in the Quran?',
    answer: 'There are 114 Surahs (chapters) in the Quran.',
    keywords: ['surahs in quran', '114 chapters', 'quran structure'],
  },
  {
    question: 'How many verses are in the Quran?',
    answer: 'There are 6,236 verses (Ayahs) in the Quran.',
    keywords: ['quran verses', 'ayahs', 'quran length'],
  },
  {
    question: 'What is Tajweed?',
    answer: 'Tajweed is the art of reciting the Quran correctly with proper pronunciation and rules of elongation.',
    keywords: ['tajweed', 'quran recitation', 'proper pronunciation'],
  },
  {
    question: 'What is Tafseer?',
    answer: 'Tafseer is the interpretation and explanation of the Quran, helping understand the meanings and context of verses.',
    keywords: ['tafseer', 'quran interpretation', 'quran explanation'],
  },
  {
    question: 'How do I memorize the Quran?',
    answer: 'Start with short Surahs, recite regularly, use visualization, and practice consistently. Read al Quran helps track your progress.',
    keywords: ['memorize quran', 'hifz', 'memorization tips'],
  },
  {
    question: 'What is the best time to read Quran?',
    answer: 'Early morning (Fajr time) is considered spiritually beneficial, but any time with focus and intention is good.',
    keywords: ['best time quran', 'quran routine', 'reading schedule'],
  },
  {
    question: 'What is Sahih Bukhari?',
    answer: 'Sahih Bukhari is one of the most authentic collections of Prophetic hadith, compiled by Imam al-Bukhari.',
    keywords: ['sahih bukhari', 'hadith collection', 'authentic hadith'],
  },
  {
    question: 'Where can I read hadith online?',
    answer: 'Read al Quran offers Sahih Bukhari, Sahih Muslim, and the major hadith books with Arabic, English, and Urdu translations.',
    keywords: ['hadith online', 'read hadith', 'sunnah online'],
  },
];

export {
  ALL_GENERATED_SEO_KEYWORDS,
  GENERATED_SURAH_KEYWORDS,
  GENERATED_AYAH_KEYWORDS,
  GENERATED_CITY_KEYWORDS,
  GENERATED_HADITH_KEYWORDS,
  GENERATED_JUZ_PARA_KEYWORDS,
  GENERATED_TAFSEER_KEYWORDS,
  GENERATED_LONG_TAIL_KEYWORDS,
  buildSurahPageKeywords,
  buildAyahPageKeywords,
  buildTafsirPageKeywords,
} from './seo-keywords-generator';

import { ALL_GENERATED_SEO_KEYWORDS } from './seo-keywords-generator';

export const GLOBAL_QURAN_SEO_KEYWORDS = Array.from(
  new Set([
    ...CORE_QURAN_KEYWORDS,
    ...URDU_TRANSLATION_KEYWORDS,
    ...AUDIO_KEYWORDS,
    ...SURAH_AYAH_KEYWORDS,
    ...TAFSEER_LEARNING_KEYWORDS,
    ...TRUST_KEYWORDS,
    ...ISLAMIC_LEARNING_KEYWORDS,
    ...ACCESSIBILITY_KEYWORDS,
    ...TECHNICAL_KEYWORDS,
    ...GLOBAL_HADITH_SEO_KEYWORDS,
    ...PAKISTAN_LOCAL_KEYWORDS,
    ...ALL_LOCAL_KEYWORDS,
    ...VOICE_SEARCH_KEYWORDS,
  ])
);

export const MASTER_SEO_KEYWORDS = Array.from(
  new Set([...GLOBAL_QURAN_SEO_KEYWORDS, ...ALL_GENERATED_SEO_KEYWORDS])
);

export const HOMEPAGE_KEYWORDS = [
  'read quran online',
  'quran with urdu translation',
  'quran tafseer',
  'hadith online',
  'sahih bukhari online',
  'quran audio tilawat',
  'quran pak online',
  'islamic education',
];

