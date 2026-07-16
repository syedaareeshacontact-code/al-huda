/**
 * Pre-built metadata configurations for common pages
 * Use these to quickly add SEO metadata to pages without duplicating keyword lists
 */

import { buildPageMetadata } from './seo';
import {
  CORE_QURAN_KEYWORDS,
  URDU_TRANSLATION_KEYWORDS,
  AUDIO_KEYWORDS,
  SURAH_AYAH_KEYWORDS,
  TAFSEER_LEARNING_KEYWORDS,
  ISLAMIC_LEARNING_KEYWORDS,
  ACCESSIBILITY_KEYWORDS,
  TECHNICAL_KEYWORDS,
} from './seo-keywords';

export const pageMetadataConfigs = {
  /**
   * Home page metadata
   */
  home: {
    title: 'Read Quran Online Free – Quran Pak with Urdu & English Translation, Audio, Tafseer',
    description:
      'Read al Quran: Read Quran online free with Arabic text, Urdu and English translation, ayah-wise tafseer, tilawat audio, bookmarks, and progress tracking.',
    path: '/',
    keywords: [
      ...CORE_QURAN_KEYWORDS,
      ...URDU_TRANSLATION_KEYWORDS,
      ...AUDIO_KEYWORDS,
      ...SURAH_AYAH_KEYWORDS,
      ...TAFSEER_LEARNING_KEYWORDS,
      ...ISLAMIC_LEARNING_KEYWORDS,
      ...ACCESSIBILITY_KEYWORDS,
    ],
  },

  /**
   * Surah listing page metadata
   */
  surahIndex: {
    title: 'Surah Index – Read All 114 Surahs with Arabic Text & Urdu Translation',
    description:
      'Browse all 114 surahs of the Quran with Arabic text, Urdu and English translation, ayah links, tafseer access, recitation audio, bookmarks, and likes.',
    path: '/surah',
    keywords: [
      ...CORE_QURAN_KEYWORDS,
      ...SURAH_AYAH_KEYWORDS,
      'surah list',
      '114 surahs',
      'quran chapters',
      'all surahs quran',
      'surah index',
    ],
  },

  /**
   * About page metadata
   */
  about: {
    title: 'About Read al Quran – Our Mission & Vision',
    description:
      'Learn about Read al Quran platform. Our mission is to provide the most accessible, user-friendly Quran reading experience with multiple translations, audio, offline support.',
    path: '/about',
    keywords: [
      'about read al quran',
      'quran platform mission',
      'islamic learning platform',
      'free quran app',
    ],
  },

  /**
   * Practice/Learning page metadata
   */
  practice: {
    title: 'Practice Quran – Interactive Quran Learning Tool',
    description:
      'Practice reading the Quran with interactive features. Learn Arabic, improve tajweed, and track your progress with Read al Quran interactive learning tools.',
    path: '/practice',
    keywords: [
      ...TAFSEER_LEARNING_KEYWORDS,
      'quran practice',
      'learn quran interactive',
      'tajweed practice',
      'quran lessons',
    ],
  },

  /**
   * Hadith page metadata (if implemented)
   */
  hadith: {
    title: 'Hadith Collection – Islamic Hadith Online',
    description:
      'Explore major hadith collections with Arabic text and Urdu and English translations. Provider-supplied grades and source context are shown where available.',
    path: '/hadith',
    keywords: [
      'hadith online',
      'authentic hadith',
      'islamic hadith',
      'hadith collections',
      'sunnah',
    ],
  },

  /**
   * Settings page metadata (not for search, but included for completeness)
   */
  settings: {
    title: 'Settings',
    description: 'Configure your Read al Quran preferences and settings.',
    path: '/settings',
    index: false, // Don't index settings page
  },

  /**
   * Signin page metadata (not for search)
   */
  signin: {
    title: 'Sign In – Read al Quran',
    description: 'Sign in to your Read al Quran account to sync your progress across devices.',
    path: '/signin',
    index: false,
  },

  /**
   * Signup page metadata (not for search)
   */
  signup: {
    title: 'Create Account – Read al Quran',
    description: 'Create a free account to save your bookmarks and track your Quran reading progress.',
    path: '/signup',
    index: false,
  },
};

/**
 * Generate metadata for a specific surah page
 */
export function generateSurahMetadata(
  surahId: number,
  surahName: string,
  surahNameArabic: string,
  surahNameTranslation: string,
  totalAyah: number
) {
  const keywordsList = [
    `surah ${surahName.toLowerCase()}`,
    `surah ${surahNameArabic}`,
    `surah ${surahNameTranslation}`,
    `${surahName} quran`,
    `${surahName} with urdu translation`,
    `${surahName} tafseer`,
    `${surahName} audio`,
    ...SURAH_AYAH_KEYWORDS,
  ];

  return buildPageMetadata({
    title: `Surah ${surahName} (${surahNameArabic}) – Urdu & English Translation, Tilawat Audio`,
    description: `Surah ${surahName} (${surahNameTranslation}): Read ${totalAyah} ayahs with Arabic text, Urdu and English translation, tafseer panel, bookmarks, likes, and audio playback.`,
    path: `/surah/${surahId}-${surahName.toLowerCase().replace(/\s+/g, '-')}`,
    ogType: 'article',
    imageUrl: `/og?kind=surah&surah=${surahId}`,
    keywords: keywordsList,
  });
}

/**
 * Generate metadata for tafseer/ayah pages
 */
export function generateAyahMetadata(
  surahId: number,
  surahName: string,
  ayahNumber: number,
  ayahText: string,
  tafseerPreview?: string
) {
  const keywordsList = [
    `ayah ${surahId}:${ayahNumber}`,
    `surah ${surahName} ayah ${ayahNumber}`,
    `tafseer surah ${surahName}`,
    `quran verse explanation`,
    ...TAFSEER_LEARNING_KEYWORDS,
  ];

  const description =
    tafseerPreview && tafseerPreview.length > 0
      ? `Tafseer of Ayah ${surahId}:${ayahNumber} (${surahName}): ${tafseerPreview.slice(0, 120)}...`
      : `Read and understand Ayah ${surahId}:${ayahNumber} of Surah ${surahName} with Urdu tafseer, translation, and audio.`;

  return buildPageMetadata({
    title: `Tafseer of Ayah ${surahId}:${ayahNumber} – ${surahName} (Urdu Explanation)`,
    description,
    path: `/tafsir/${surahId}-${surahName.toLowerCase().replace(/\s+/g, '-')}/${ayahNumber}`,
    ogType: 'article',
    imageUrl: `/og?kind=tafsir&surah=${surahId}&ayah=${ayahNumber}`,
    keywords: keywordsList,
  });
}

/**
 * SEO recommendations for new pages
 * Follow these patterns when creating new pages
 */
export const seoBestPractices = {
  /**
   * Guidelines for writing meta descriptions
   */
  metaDescription: {
    minLength: 120,
    maxLength: 160,
    tips: [
      'Include your target keyword naturally',
      'Include a call-to-action when appropriate',
      'Make it compelling to increase CTR',
      'Avoid keyword stuffing',
      'Make every character count',
    ],
  },

  /**
   * Guidelines for writing page titles
   */
  pageTitle: {
    minLength: 30,
    maxLength: 60,
    tips: [
      'Include primary keyword at the beginning',
      'Keep it descriptive and compelling',
      'Avoid clickbait',
      'Use modifiers (Best, Free, Online, etc.)',
      'Include brand name when appropriate',
    ],
  },

  /**
   * Guidelines for using keywords
   */
  keywords: {
    tips: [
      'Focus on search intent (informational, commercial, navigational)',
      'Use long-tail keywords (3-4 words)',
      'Include keyword variations and synonyms',
      'Use keywords naturally in content',
      'Avoid keyword stuffing (keep density <1%)',
      'Research keywords using Google Search Console',
    ],
  },

  /**
   * Internal linking strategy
   */
  internalLinking: {
    tips: [
      'Link to related content within pages',
      'Use descriptive anchor text',
      'Create pillar pages with links to subtopics',
      'Link to high-value pages from multiple places',
      'Use breadcrumb navigation',
      'Avoid linking to noindex pages',
    ],
  },

  /**
   * Schema markup best practices
   */
  schemaMarkup: {
    tips: [
      'Use JSON-LD format for all schema',
      'Validate with Schema.org validator',
      'Include all required properties',
      'Use specific types (Article, CreativeWork, etc.)',
      'Update markup when content changes',
      'Monitor in Google Search Console',
    ],
  },
};

/**
 * Common SEO mistakes to avoid
 */
export const seoMistakesToAvoid = [
  'Duplicate meta descriptions across pages',
  'Thin or low-quality content',
  'Broken internal links',
  'Missing alt text on images',
  'Slow page load times',
  'Not mobile-optimized',
  'No structured data',
  'Keyword stuffing',
  'Poor URL structure',
  'Not using HTTPS',
  'Ignoring Core Web Vitals',
  'Outdated content',
];
