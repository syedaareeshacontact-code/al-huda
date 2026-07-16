import { buildAyahPopupPath, buildSurahPath } from '@/lib/quran-routing';
import { buildHadithSearchPath } from '@/lib/hadith/hadith-routing';
import {
  isEveningTime,
  isFriday,
  isMorningTime,
  isRamadan,
} from '@/lib/islamic-calendar';
import { getSurahById } from '@/lib/quran-index';

export interface ContextualWidgetLink {
  label: string;
  href: string;
  description?: string;
  badge?: string;
}

export interface ContextualWidgetSection {
  id: string;
  title: string;
  description: string;
  badge?: string;
  links: ContextualWidgetLink[];
}

function surahPath(surahId: number) {
  const surah = getSurahById(surahId);
  if (!surah) {
    return `/surah/${surahId}`;
  }

  return buildSurahPath(surah.id, surah.surahName);
}

function ayahPath(surahId: number, ayahNumber: number) {
  const surah = getSurahById(surahId);
  if (!surah) {
    return `/surah/${surahId}?ayah=${ayahNumber}`;
  }

  return buildAyahPopupPath(surah.id, surah.surahName, ayahNumber);
}

export function getHomeContextualWidgets(date: Date = new Date()): ContextualWidgetSection[] {
  const sections: ContextualWidgetSection[] = [];

  if (isFriday(date)) {
    sections.push({
      id: 'friday',
      title: 'Jumu’ah Reading',
      description: 'Read Surah Al-Kahf today — light until the next Friday.',
      badge: 'Friday',
      links: [
        {
          label: 'Surah Al-Kahf',
          href: surahPath(18),
          description: 'Recommended every Friday',
          badge: 'Highlight',
        },
        {
          label: 'Surah Yaseen',
          href: surahPath(36),
          description: 'Heart of the Quran',
        },
        {
          label: 'Surah Ar-Rahmaan',
          href: surahPath(55),
          description: 'Mercy and blessings',
        },
      ],
    });
  }

  if (isRamadan(date)) {
    sections.push({
      id: 'ramadan',
      title: 'Ramadan Essentials',
      description: 'Surahs often recited in Ramadan and taraweeh.',
      badge: 'Ramadan',
      links: [
        {
          label: 'Surah Al-Mulk',
          href: surahPath(67),
          description: 'Protection before sleep',
        },
        {
          label: 'Surah Al-Waqiah',
          href: surahPath(56),
          description: 'Wealth and provision',
        },
        {
          label: 'Last Ayahs of Baqarah',
          href: ayahPath(2, 285),
          description: '2:285–286',
        },
        {
          label: 'Surah Al-Ikhlas',
          href: surahPath(112),
          description: 'One-third of the Quran',
        },
      ],
    });
  }

  if (isMorningTime(date)) {
    sections.push({
      id: 'morning',
      title: 'Morning Remembrance',
      description: 'Start your day with protection and gratitude.',
      badge: 'Subah',
      links: [
        {
          label: 'Ayat ul Kursi',
          href: ayahPath(2, 255),
          description: '2:255 — protection',
        },
        {
          label: 'Surah Al-Fatiha',
          href: surahPath(1),
          description: 'Opening of the Quran',
        },
        {
          label: 'Surah Al-Ikhlas',
          href: surahPath(112),
          description: 'Morning adhkar companion',
        },
      ],
    });
  }

  if (isEveningTime(date)) {
    sections.push({
      id: 'evening',
      title: 'Evening Remembrance',
      description: 'Ayahs and surahs for evening protection.',
      badge: 'Evening',
      links: [
        {
          label: 'Surah Al-Mulk',
          href: surahPath(67),
          description: 'Read before sleep',
        },
        {
          label: '3 Qul (Ikhlas, Falaq, Naas)',
          href: surahPath(112),
          description: 'Evening protection',
        },
        {
          label: 'Ayat ul Kursi',
          href: ayahPath(2, 255),
          description: '2:255 — protection',
        },
      ],
    });
  }

  if (sections.length === 0) {
    sections.push({
      id: 'popular',
      title: 'Popular Right Now',
      description: 'Frequently read surahs and ayahs on Read al Quran.',
      links: [
        {
          label: 'Surah Yaseen',
          href: surahPath(36),
          description: 'Heart of the Quran',
        },
        {
          label: 'Surah Ar-Rahmaan',
          href: surahPath(55),
          description: 'Mercy and blessings',
        },
        {
          label: 'Surah Al-Kahf',
          href: surahPath(18),
          description: 'Stories and lessons',
        },
        {
          label: 'Hadith Search',
          href: buildHadithSearchPath(),
          description: 'Search authentic hadiths',
        },
      ],
    });
  }

  return sections;
}
