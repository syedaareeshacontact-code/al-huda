import type { FeatureTourStep } from '@/lib/feature-tour-types';

export const HOME_TOUR_STORAGE_KEY = 'readalquran-home-tour-completed';

export const HOME_TOUR_STEPS: FeatureTourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Read al Quran',
    description:
      'Your focused starting point for Quran reading, search, progress, and tafseer.',
  },
  {
    id: 'primary-cta',
    targetId: 'home-tour-primary-cta',
    title: 'Open / Continue Reading',
    description:
      'Open the Quran from here. If you were reading before, you will resume directly at your last read ayah.',
    placement: 'top',
  },
  {
    id: 'search',
    targetId: 'home-tour-search',
    title: 'Find a Surah',
    description:
      'Search all 114 Surahs by name or number without leaving the home page.',
    placement: 'bottom',
  },
  {
    id: 'read-online',
    targetId: 'home-tour-read-online',
    title: 'Browse the Quran',
    description:
      'Open the complete Surah index with Arabic text, translation, audio, and tafseer.',
    placement: 'bottom',
  },
];
