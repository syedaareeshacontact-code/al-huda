import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildPageMetadata,
  toAbsoluteUrl,
} from '@/lib/seo';
import type { Metadata } from 'next';

export function buildPrayerTimesMetadata(city?: string, _cityUrdu?: string): Metadata {
  if (city) {
    const slug = city.toLowerCase().replace(/\s+/g, '-');
    return buildPageMetadata({
      title: `Prayer Times in ${city}`,
      description: `View calculated prayer times for ${city}, Pakistan, with the calculation method, Qibla direction and monthly timetable. Check local mosque schedules.`,
      path: `/prayer-times/${slug}`,
      imageUrl: '/og?kind=surah-index',
    });
  }

  return buildPageMetadata({
    title: 'Prayer Times in Pakistan',
    description:
      'Free calculated prayer times for major Pakistani cities, with Fajr, Dhuhr, Asr, Maghrib, Isha, Qibla direction, and Hijri calendar.',
    path: '/prayer-times',
    imageUrl: '/og?kind=surah-index',
  });
}

export function buildDuasMetadata(
  category?: string,
  categoryName?: string,
  index = true
): Metadata {
  if (category && categoryName) {
    return buildPageMetadata({
      title: `${categoryName} — Duas`,
      description: `Read ${categoryName.toLowerCase()} with Arabic text, transliteration, English translation, and source information where supplied by the data provider.`,
      path: `/duas/${category}`,
      index,
    });
  }

  return buildPageMetadata({
    title: 'Duas by Occasion',
    description:
      'Find duas by occasion, with Arabic text, transliteration, English translation and available source references.',
    path: '/duas',
    index,
  });
}

export function buildAzkarMetadata(index = true): Metadata {
  return buildPageMetadata({
    title: 'Morning and Evening Azkar',
    description:
      'Daily morning and evening azkar (adhkar) with Arabic text, transliteration, translation, and source references where supplied.',
    path: '/azkar',
    index,
  });
}

export function build99NamesMetadata(index = true): Metadata {
  return buildPageMetadata({
    title: '99 Names of Allah — Arabic and Meanings',
    description:
      'Read the 99 Names of Allah with Arabic text, transliteration and English meanings.',
    path: '/99-names-of-allah',
    index,
  });
}

export function buildZakatMetadata(): Metadata {
  return buildPageMetadata({
    title: 'Zakat Calculator',
    description:
      'Estimate Zakat using your assets, liabilities and entered gold or silver prices. Review the calculation assumptions and consult a qualified adviser when needed.',
    path: '/zakat-calculator',
  });
}

export function buildMosqueFinderMetadata(city?: string): Metadata {
  if (city) {
    return buildPageMetadata({
      title: `Mosque Finder for ${city}`,
      description: `Find mosques and masjids near ${city}, Pakistan. Interactive map with directions, distances, and mosque details from OpenStreetMap.`,
      path: `/mosque-finder/${city.toLowerCase().replace(/\s+/g, '-')}`,
    });
  }

  return buildPageMetadata({
    title: 'Find a Nearby Mosque',
    description:
      'Find mosques and masjids near you in Pakistan. Free mosque locator with map, directions, and distance. Powered by OpenStreetMap community data.',
    path: '/mosque-finder',
  });
}

export function buildPrayerTimesJsonLd(
  city: string,
  timings: Record<string, string>,
  date: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${city} Prayer Times`,
    description: `Daily Islamic prayer times for ${city}, Pakistan`,
    url: toAbsoluteUrl(`/prayer-times/${city.toLowerCase().replace(/\s+/g, '-')}`),
    mainEntity: {
      '@type': 'ItemList',
      name: `${city} Namaz Timings for ${date}`,
      itemListElement: Object.entries(timings)
        .filter(([k]) => ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(k))
        .map(([name, time], index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: { '@type': 'PropertyValue', name: `${name} Prayer`, value: time },
        })),
    },
  };
}

export function getPrayerTimesFaqItems(city: string) {
  return [
    {
      question: `What are today's namaz timings in ${city}?`,
      answer: `Today's prayer times for ${city} are calculated using the University of Islamic Sciences, Karachi method with Hanafi Asr. Compare them with your local mosque where local schedules differ.`,
    },
    {
      question: `Which calculation method is used for ${city} prayer times?`,
      answer: `We use the University of Islamic Sciences, Karachi method (method 1) with Hanafi school for Asr calculation. Local mosques may publish adjusted congregation or prayer times.`,
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
  ];
}

export function buildPrayerTimesFaq(city: string) {
  return buildFaqJsonLd(getPrayerTimesFaqItems(city));
}

export function getDuasFaqItems() {
  return [
    {
      question: 'How many duas are available?',
      answer:
        'The directory shows the available categories and current entry counts. Individual entries include source information where supplied by the data provider.',
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
  ];
}

export function buildDuasFaq() {
  return buildFaqJsonLd(getDuasFaqItems());
}

export function getMosqueFinderFaqItems(city?: string) {
  const location = city ?? 'your area';
  return [
    {
      question: `How do I find mosques near ${location}?`,
      answer: `Use our mosque finder to search for nearby masjids. Allow location access for automatic detection, or select ${city ?? 'a city'} to browse mosques in that area.`,
    },
    {
      question: 'Where does the mosque data come from?',
      answer:
        'Mosque locations come from OpenStreetMap community data. Accuracy depends on local contributions, so confirm current details before travelling.',
    },
    {
      question: 'Can I get directions to a mosque?',
      answer:
        'Yes, each mosque listing includes a link to Google Maps for walking or driving directions.',
    },
  ];
}

export function buildMosqueFinderFaq(city?: string) {
  return buildFaqJsonLd(getMosqueFinderFaqItems(city));
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
