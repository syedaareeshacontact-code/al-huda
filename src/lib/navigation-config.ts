import {
  BookMarked,
  BookOpenText,
  BrainCircuit,
  Calculator,
  Clock,
  Compass,
  Download,
  Globe2,
  HandHeart,
  Home,
  Info,
  Library,
  MapPin,
  MessageSquare,
  Mic,
  Moon,
  ScrollText,
  Search,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react';

import { buildSurahPath } from '@/lib/quran-routing';
import { buildHadithCollectionPath } from '@/lib/hadith/hadith-routing';

export interface NavLinkItem {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: string;
}

export interface NavColumn {
  title: string;
  items: NavLinkItem[];
  hideOnMobile?: boolean;
}

export interface MegaNavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  tagline: string;
  columns: NavColumn[];
  highlight?: NavLinkItem;
}

export interface SimpleNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const HOME_NAV: SimpleNavItem = {
  label: 'Home',
  href: '/',
  icon: Home,
  exact: true,
};

export const QURAN_MEGA_NAV: MegaNavGroup = {
  id: 'quran',
  label: 'Quran',
  icon: BookOpenText,
  tagline: 'Read, listen, and study the Holy Quran',
  highlight: {
    label: 'Surah Index',
    description: 'All 114 surahs with Arabic, Urdu & English',
    href: '/surah',
    icon: Library,
    badge: '114 Surahs',
  },
  columns: [
    {
      title: 'Read & Recite',
      items: [
        {
          label: 'Surah Index',
          description: 'Browse all 114 chapters of the Quran',
          href: '/surah',
          icon: BookOpenText,
        },
        {
          label: 'Quran Downloads',
          description: 'Download Surah PDF and audio files',
          href: '/download',
          icon: Download,
          exact: true,
        },
      ],
    },
    {
      title: 'Study & Tafseer',
      items: [
        {
          label: 'Urdu Tafseer',
          description: 'Ayah-by-ayah Urdu tafseer commentary',
          href: '/tafsir',
          icon: BookMarked,
        },
      ],
    },
    {
      title: 'Popular Surahs',
      hideOnMobile: true,
      items: [
        {
          label: 'Surah Yaseen',
          description: 'The heart of the Quran',
          href: buildSurahPath(36, 'Yaseen'),
          icon: Sparkles,
        },
        {
          label: 'Surah Al-Kahf',
          description: 'Recommended every Friday',
          href: buildSurahPath(18, 'Al-Kahf'),
          icon: Sparkles,
        },
        {
          label: 'Surah Ar-Rahmaan',
          description: 'The Most Merciful',
          href: buildSurahPath(55, 'Ar-Rahmaan'),
          icon: Sparkles,
        },
        {
          label: 'Surah Al-Mulk',
          description: 'Protection before sleep',
          href: buildSurahPath(67, 'Al-Mulk'),
          icon: Sparkles,
        },
      ],
    },
  ],
};

export const HADITH_MEGA_NAV: MegaNavGroup = {
  id: 'hadith',
  label: 'Hadith',
  icon: BookMarked,
  tagline: 'Prophetic traditions in three languages',
  highlight: {
    label: 'All Collections',
    description: 'Arabic · English · Urdu translations',
    href: '/hadith',
    icon: Library,
    badge: 'Collections',
  },
  columns: [
    {
      title: 'Browse',
      items: [
        {
          label: 'Hadith Collections',
          description: 'Sahih Bukhari, Muslim & the six major books',
          href: '/hadith',
          icon: BookOpenText,
          exact: true,
        },
        {
          label: 'Search Hadiths',
          description: 'Keyword search across all collections',
          href: '/hadith/search',
          icon: Search,
          exact: true,
        },
      ],
    },
    {
      title: 'Major Collections',
      hideOnMobile: true,
      items: [
        {
          label: 'Sahih al-Bukhari',
          description: 'A major Sunni hadith collection',
          href: buildHadithCollectionPath('sahih-bukhari'),
          icon: BookMarked,
        },
        {
          label: 'Sahih Muslim',
          description: 'A major Sunni hadith compilation',
          href: buildHadithCollectionPath('sahih-muslim'),
          icon: BookMarked,
        },
        {
          label: 'Sunan Abu Dawud',
          description: 'Focus on legal hadiths',
          href: buildHadithCollectionPath('abu-dawood'),
          icon: BookMarked,
        },
        {
          label: 'Jami at-Tirmidhi',
          description: 'With grading of each narration',
          href: buildHadithCollectionPath('al-tirmidhi'),
          icon: BookMarked,
        },
        {
          label: 'Sunan an-Nasa’i',
          description: 'Sixth major hadith collection',
          href: buildHadithCollectionPath('sunan-nasai'),
          icon: BookMarked,
        },
        {
          label: 'Sunan Ibn Majah',
          description: 'Complete the six books',
          href: buildHadithCollectionPath('ibn-e-majah'),
          icon: BookMarked,
        },
      ],
    },
  ],
};

export const ISLAMIC_TOOLS_MEGA_NAV: MegaNavGroup = {
  id: 'islamic-tools',
  label: 'Islamic Tools',
  icon: Moon,
  tagline: 'Prayer times, duas, zakat & mosque finder',
  highlight: {
    label: 'Prayer Times',
    description: 'Namaz timings for 35+ Pakistani cities',
    href: '/prayer-times',
    icon: Clock,
    badge: 'Live',
  },
  columns: [
    {
      title: 'Prayer & Calendar',
      items: [
        {
          label: 'Prayer Times',
          description: 'Fajr, Dhuhr, Asr, Maghrib & Isha for all cities',
          href: '/prayer-times',
          icon: Clock,
        },
        {
          label: 'Lahore Timings',
          description: 'Today\'s namaz timings in Lahore',
          href: '/prayer-times/lahore',
          icon: MapPin,
        },
        {
          label: 'Karachi Timings',
          description: 'Today\'s namaz timings in Karachi',
          href: '/prayer-times/karachi',
          icon: MapPin,
        },
        {
          label: 'Islamabad Timings',
          description: 'Today\'s namaz timings in Islamabad',
          href: '/prayer-times/islamabad',
          icon: MapPin,
        },
      ],
    },
    {
      title: 'Duas & Remembrance',
      items: [
        {
          label: 'Islamic Duas',
          description: 'Arabic, transliteration, translation & sources',
          href: '/duas',
          icon: HandHeart,
        },
        {
          label: 'Morning & Evening Azkar',
          description: 'Daily adhkar for protection and blessings',
          href: '/azkar',
          icon: Moon,
        },
        {
          label: '99 Names of Allah',
          description: 'Asma ul Husna with meanings',
          href: '/99-names-of-allah',
          icon: Star,
        },
      ],
    },
    {
      title: 'Tools & Places',
      items: [
        {
          label: 'Zakat Calculator',
          description: 'Calculate Zakat on gold, cash & assets (PKR)',
          href: '/zakat-calculator',
          icon: Calculator,
        },
        {
          label: 'Mosque Finder',
          description: 'Find nearby masjids and prayer places',
          href: '/mosque-finder',
          icon: MapPin,
        },
      ],
    },
  ],
};

export const EXPLORE_MEGA_NAV: MegaNavGroup = {
  id: 'explore',
  label: 'Explore',
  icon: Compass,
  tagline: 'Learn more about Read al Quran',
  columns: [
    {
      title: 'About Us',
      items: [
        {
          label: 'About Read al Quran',
          description: 'Our mission, features & vision',
          href: '/about',
          icon: Info,
        },
        {
          label: 'Contact Us',
          description: 'Questions, feedback & support',
          href: '/contact',
          icon: MessageSquare,
        },
        {
          label: 'Feedback',
          description: 'Share suggestions and report issues',
          href: '/feedback',
          icon: MessageSquare,
          exact: true,
        },
      ],
    },
    {
      title: 'Platform',
      items: [
        {
          label: 'Read Quran Online',
          description: 'Start reading with translations',
          href: '/read-quran-online',
          icon: Globe2,
        },
      ],
    },
  ],
};

export const MEGA_NAV_GROUPS: MegaNavGroup[] = [
  QURAN_MEGA_NAV,
  HADITH_MEGA_NAV,
  ISLAMIC_TOOLS_MEGA_NAV,
  EXPLORE_MEGA_NAV,
];

export function flattenMegaNavLinks(group: MegaNavGroup): NavLinkItem[] {
  const links = group.columns.flatMap((column) => column.items);
  if (group.highlight) {
    return [group.highlight, ...links];
  }
  return links;
}

export function getMobileMegaNavColumns(group: MegaNavGroup): NavColumn[] {
  return group.columns.filter((column) => !column.hideOnMobile);
}

export function getAllMobileNavSections() {
  return [
    { id: 'main', title: 'Main', items: [HOME_NAV] },
    ...MEGA_NAV_GROUPS.map((group) => ({
      id: group.id,
      title: group.label,
      tagline: group.tagline,
      items: getMobileMegaNavColumns(group).flatMap((column) => column.items),
    })),
  ];
}
