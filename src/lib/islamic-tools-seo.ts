import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildPageMetadata,
  toAbsoluteUrl,
} from '@/lib/seo';
import type { Metadata } from 'next';

export const PRAYER_TIMES_KEYWORDS = [
  'namaz timing',
  'namaz ka waqt',
  'prayer times pakistan',
  'islamic prayer times',
  'fajr time today',
  'maghrib time today',
  'namaz timing lahore',
  'namaz timing karachi',
  'namaz timing islamabad',
  'qibla direction',
  'qibla compass',
  'hijri date today',
  'islamic calendar',
  'hijri calendar 2026',
  'sehri time',
  'iftar time',
  'namaz timetable',
  'salah times',
  'muslim prayer times',
  'azan time',
];

export const DUAS_KEYWORDS = [
  'islamic duas',
  'daily duas',
  'morning duas',
  'evening duas',
  'dua in arabic',
  'dua with translation',
  'morning azkar',
  'evening azkar',
  'adhkar',
  'dhikr',
  '99 names of allah',
  'asma ul husna',
  'names of allah',
  'islamic supplications',
  'dua before sleep',
  'dua after prayer',
  'masnoon duain',
  'masnoon duain urdu',
];

export const ZAKAT_KEYWORDS = [
  'zakat calculator',
  'zakat calculator pakistan',
  'calculate zakat online',
  'zakat on gold',
  'zakat on money',
  'nisab amount',
  'zakat 2.5 percent',
  'how to calculate zakat',
  'zakat calculator pkr',
  'islamic zakat calculator',
];

export const MOSQUE_KEYWORDS = [
  'mosque finder',
  'masjid near me',
  'find mosque near me',
  'nearby masjid',
  'mosque locator',
  'islamic places near me',
  'masjid finder pakistan',
  'nearest mosque',
  'mosque map',
];

export function buildPrayerTimesMetadata(city?: string, cityUrdu?: string): Metadata {
  if (city) {
    return buildPageMetadata({
      title: `${city} Namaz Timings Today — Prayer Times, Qibla & Hijri Date`,
      description: `Accurate ${city} namaz timings for Fajr, Dhuhr, Asr, Maghrib & Isha. Qibla direction, Hijri calendar, and monthly prayer timetable for ${city}, Pakistan.`,
      path: `/prayer-times/${city.toLowerCase().replace(/\s+/g, '-')}`,
      keywords: [
        `namaz timing ${city.toLowerCase()}`,
        `${city.toLowerCase()} prayer times`,
        `fajr time ${city.toLowerCase()}`,
        `maghrib time ${city.toLowerCase()}`,
        `${city.toLowerCase()} namaz timetable`,
        ...(cityUrdu ? [`نماز کے اوقات ${cityUrdu}`] : []),
        ...PRAYER_TIMES_KEYWORDS.slice(0, 8),
      ],
      imageUrl: '/og?kind=surah-index',
    });
  }

  return buildPageMetadata({
    title: 'Prayer Times Pakistan — Namaz Timings, Qibla & Hijri Calendar',
    description:
      'Free prayer times for all major Pakistani cities. Accurate Fajr, Dhuhr, Asr, Maghrib & Isha timings with Qibla direction and Hijri calendar.',
    path: '/prayer-times',
    keywords: PRAYER_TIMES_KEYWORDS,
    imageUrl: '/og?kind=surah-index',
  });
}

export function buildDuasMetadata(category?: string, categoryName?: string): Metadata {
  if (category && categoryName) {
    return buildPageMetadata({
      title: `${categoryName} — Islamic Duas & Supplications with Arabic Text`,
      description: `Read authentic ${categoryName.toLowerCase()} with Arabic text, transliteration, and English translation. Sourced from Quran and Sunnah.`,
      path: `/duas/${category}`,
      keywords: [
        categoryName.toLowerCase(),
        `${categoryName.toLowerCase()} dua`,
        `${categoryName.toLowerCase()} arabic`,
        ...DUAS_KEYWORDS.slice(0, 10),
      ],
    });
  }

  return buildPageMetadata({
    title: 'Islamic Duas & Azkar — 126 Authentic Supplications from Quran & Sunnah',
    description:
      'Browse 126 authentic Islamic duas and azkar across 27 categories. Arabic text, transliteration, and English translation for morning, evening, prayer, travel, and more.',
    path: '/duas',
    keywords: DUAS_KEYWORDS,
  });
}

export function buildAzkarMetadata(): Metadata {
  return buildPageMetadata({
    title: 'Morning & Evening Azkar — Daily Islamic Remembrance (Adhkar)',
    description:
      'Daily morning and evening azkar (adhkar) with Arabic text, transliteration, and translation. Protect yourself with authentic supplications from the Sunnah.',
    path: '/azkar',
    keywords: [
      'morning azkar',
      'evening azkar',
      'adhkar',
      'daily dhikr',
      'morning remembrance',
      'evening remembrance',
      ...DUAS_KEYWORDS,
    ],
  });
}

export function build99NamesMetadata(): Metadata {
  return buildPageMetadata({
    title: '99 Names of Allah (Asma ul Husna) — Arabic, Meaning & Benefits',
    description:
      'Learn all 99 Names of Allah (Asma ul Husna) with Arabic calligraphy, transliteration, English meaning, and detailed explanations.',
    path: '/99-names-of-allah',
    keywords: [
      '99 names of allah',
      'asma ul husna',
      'names of allah',
      'allah names meaning',
      'asmaul husna',
      'beautiful names of allah',
      ...DUAS_KEYWORDS.slice(10, 15),
    ],
  });
}

export function buildZakatMetadata(): Metadata {
  return buildPageMetadata({
    title: 'Zakat Calculator Pakistan — Calculate Your Zakat Online (PKR)',
    description:
      'Free Islamic Zakat calculator for Pakistan. Calculate Zakat on gold, silver, cash, and assets. Based on current Nisab thresholds in PKR.',
    path: '/zakat-calculator',
    keywords: ZAKAT_KEYWORDS,
  });
}

export function buildMosqueFinderMetadata(city?: string): Metadata {
  if (city) {
    return buildPageMetadata({
      title: `Mosques in ${city} — Find Nearby Masjid & Prayer Places`,
      description: `Find mosques and masjids near ${city}, Pakistan. Interactive map with directions, distances, and mosque details from OpenStreetMap.`,
      path: `/mosque-finder/${city.toLowerCase().replace(/\s+/g, '-')}`,
      keywords: [
        `mosque near ${city.toLowerCase()}`,
        `masjid ${city.toLowerCase()}`,
        `mosques in ${city.toLowerCase()}`,
        ...MOSQUE_KEYWORDS.slice(0, 8),
      ],
    });
  }

  return buildPageMetadata({
    title: 'Mosque Finder — Find Nearby Masjid & Islamic Places',
    description:
      'Find mosques and masjids near you in Pakistan. Free mosque locator with map, directions, and distance. Powered by OpenStreetMap community data.',
    path: '/mosque-finder',
    keywords: MOSQUE_KEYWORDS,
  });
}

export function buildPrayerTimesJsonLd(city: string, timings: Record<string, string>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${city} Prayer Times`,
    description: `Daily Islamic prayer times for ${city}, Pakistan`,
    url: toAbsoluteUrl(`/prayer-times/${city.toLowerCase().replace(/\s+/g, '-')}`),
    mainEntity: {
      '@type': 'Schedule',
      name: `${city} Namaz Timings`,
      scheduleTimezone: 'Asia/Karachi',
      event: Object.entries(timings)
        .filter(([k]) => ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(k))
        .map(([name, time]) => ({
          '@type': 'Event',
          name: `${name} Prayer`,
          startDate: `T${time}:00`,
        })),
    },
  };
}

export function buildPrayerTimesFaq(city: string) {
  return buildFaqJsonLd([
    {
      question: `What are today's namaz timings in ${city}?`,
      answer: `Today's prayer times for ${city} are calculated using the University of Islamic Sciences, Karachi method — the standard adopted across Pakistan. Visit this page for live Fajr, Dhuhr, Asr, Maghrib, and Isha timings updated daily.`,
    },
    {
      question: `Which calculation method is used for ${city} prayer times?`,
      answer: `We use the University of Islamic Sciences, Karachi method (method 1) with Hanafi school for Asr calculation — the same method used by most mosques in Pakistan.`,
    },
    {
      question: 'What is the Qibla direction from Pakistan?',
      answer:
        'The Qibla direction from Pakistan points west-southwest towards the Kaaba in Makkah, approximately 260–270 degrees from most Pakistani cities.',
    },
    {
      question: 'How is the Hijri date determined?',
      answer:
        'The Hijri date is calculated using the Umm al-Qura calendar method. Note that local moon-sighting committees may announce dates one day differently, especially for Ramadan and Eid.',
    },
  ]);
}

export function buildDuasFaq() {
  return buildFaqJsonLd([
    {
      question: 'How many duas are available?',
      answer:
        'We provide 126 authentic duas and supplications across 27 categories, sourced from the Quran and Sunnah with references to hadith collections.',
    },
    {
      question: 'What is the difference between dua and azkar?',
      answer:
        'Duas are supplications — requests made to Allah. Azkar (adhkar) are specific phrases of remembrance and praise, often repeated at set times like morning and evening.',
    },
    {
      question: 'Can I share these duas?',
      answer:
        'Yes! All duas include Arabic text, transliteration, and translation. You can copy and share them with family and friends.',
    },
  ]);
}

export function buildMosqueFinderFaq(city?: string) {
  const location = city ?? 'your area';
  return buildFaqJsonLd([
    {
      question: `How do I find mosques near ${location}?`,
      answer: `Use our mosque finder to search for nearby masjids. Allow location access for automatic detection, or select ${city ?? 'a city'} to browse mosques in that area.`,
    },
    {
      question: 'Where does the mosque data come from?',
      answer:
        'Mosque locations are sourced from OpenStreetMap, a community-maintained global map. Data accuracy depends on community contributions in your area.',
    },
    {
      question: 'Can I get directions to a mosque?',
      answer:
        'Yes, each mosque listing includes a link to Google Maps for walking or driving directions.',
    },
  ]);
}

export function buildIslamicToolsBreadcrumb(
  items: Array<{ name: string; path: string }>
) {
  return buildBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    ...items.map((item) => ({ name: item.name, item: item.path })),
  ]);
}

export const PRAYER_TIMES_FAQ_STATIC = [
  {
    question: 'What are the five daily prayers in Islam?',
    answer:
      'The five daily prayers (Salah) are Fajr (dawn), Dhuhr (midday), Asr (afternoon), Maghrib (sunset), and Isha (night). Each has a specific time window based on the position of the sun.',
  },
  {
    question: 'Why do prayer times change daily?',
    answer:
      'Prayer times are based on the sun\'s position, which changes with seasons, latitude, and longitude. Fajr gets earlier in summer and later in winter, while Maghrib follows sunset.',
  },
];

export function buildWebApplicationJsonLd(options: {
  name: string;
  description: string;
  url: string;
  applicationCategory: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: options.name,
    description: options.description,
    url: toAbsoluteUrl(options.url),
    applicationCategory: options.applicationCategory,
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    provider: {
      '@type': 'Organization',
      name: 'Read al Quran',
      url: toAbsoluteUrl('/'),
    },
  };
}

export const ISLAMIC_TOOLS_SITEMAP_PATHS = [
  '/prayer-times',
  '/duas',
  '/azkar',
  '/99-names-of-allah',
  '/zakat-calculator',
  '/mosque-finder',
];
