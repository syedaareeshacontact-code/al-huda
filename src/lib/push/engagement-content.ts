import type { StoredLastReadEntry } from '../auth/users-store';
import { getCuratedHadithSitemapRefs, type HadithRef } from '../hadith/hadith-index';
import { buildHadithDetailPath } from '../hadith/hadith-routing';
import { getHadithByNumber } from '../hadith/hadith.service';
import { getAllSurahs, getSurahById } from '../quran-index';
import { buildAyahPopupPath, buildSurahPath } from '../quran-routing';
import type { PushEngagementKind } from './engagement-types';

export interface EngagementCampaign {
  id: string;
  kind: PushEngagementKind;
  title: string;
  body: string;
  href: string;
}

interface BuildEngagementCampaignInput {
  kind: PushEngagementKind;
  localDateKey: string;
  lastRead?: StoredLastReadEntry | null;
}

const HADITH_BOOK_NAMES: Record<string, string> = {
  'sahih-bukhari': 'Sahih al-Bukhari',
  'sahih-muslim': 'Sahih Muslim',
  'al-tirmidhi': 'Jami at-Tirmidhi',
  'abu-dawood': 'Sunan Abi Dawud',
  'ibn-e-majah': 'Sunan Ibn Majah',
  'sunan-nasai': "Sunan an-Nasa'i",
  mishkat: 'Mishkat al-Masabih',
};

const ISLAMIC_CAMPAIGNS = [
  {
    title: 'A quiet moment for daily Azkar',
    body: 'Begin or end your day with remembrance, reflection, and gratitude.',
    href: '/azkar',
  },
  {
    title: 'Dua for today',
    body: 'Take a minute to read a meaningful dua with its source and translation.',
    href: '/duas',
  },
  {
    title: 'Reflect on the Names of Allah',
    body: 'Read and reflect on one of the 99 Names of Allah today.',
    href: '/99-names-of-allah',
  },
] as const;

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getDayOfWeek(localDateKey: string) {
  return new Date(`${localDateKey}T00:00:00.000Z`).getUTCDay();
}

function cleanNotificationText(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateAtWord(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const shortened = value.slice(0, maxLength + 1);
  const wordBoundary = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, wordBoundary > maxLength * 0.65 ? wordBoundary : maxLength).trim()}...`;
}

export function selectHadithReference(localDateKey: string): HadithRef {
  const references = getCuratedHadithSitemapRefs();
  return references[hashText(`hadith:${localDateKey}`) % references.length] ?? references[0];
}

async function buildHadithCampaign(localDateKey: string): Promise<EngagementCampaign> {
  const reference = selectHadithReference(localDateKey);
  const fallbackBookName = HADITH_BOOK_NAMES[reference.collectionSlug] ?? 'Hadith collection';
  const href = buildHadithDetailPath(reference.collectionSlug, reference.hadithNumber);

  try {
    const hadith = await getHadithByNumber(
      reference.collectionSlug,
      reference.hadithNumber
    );
    const bookName = cleanNotificationText(hadith?.book.bookName) || fallbackBookName;
    const chapter = cleanNotificationText(hadith?.chapter.chapterEnglish);
    const excerpt = cleanNotificationText(hadith?.hadithEnglish);

    return {
      id: `hadith-${localDateKey}-${reference.collectionSlug}-${reference.hadithNumber}`,
      kind: 'hadith',
      title: chapter
        ? truncateAtWord(`Today's Hadith: ${chapter}`, 72)
        : `Today's Hadith from ${bookName}`,
      body: excerpt
        ? truncateAtWord(excerpt, 175)
        : `Read and reflect on ${bookName} Hadith #${reference.hadithNumber}.`,
      href,
    };
  } catch {
    return {
      id: `hadith-${localDateKey}-${reference.collectionSlug}-${reference.hadithNumber}`,
      kind: 'hadith',
      title: `Today's Hadith from ${fallbackBookName}`,
      body: `Take a minute to read and reflect on Hadith #${reference.hadithNumber}.`,
      href,
    };
  }
}

export function buildQuranCampaign(
  localDateKey: string,
  lastRead?: StoredLastReadEntry | null
): EngagementCampaign {
  if (lastRead) {
    const lastReadSurah = getSurahById(lastRead.surahId);
    if (lastReadSurah) {
      return {
        id: `quran-continue-${localDateKey}-${lastReadSurah.id}-${lastRead.ayahNumber}`,
        kind: 'quran',
        title: `Continue Surah ${lastReadSurah.surahName}`,
        body: `Pick up from ayah ${lastRead.ayahNumber} and keep your Quran reading moving.`,
        href: buildAyahPopupPath(
          lastReadSurah.id,
          lastReadSurah.surahName,
          lastRead.ayahNumber
        ),
      };
    }
  }

  const surahs = getAllSurahs();
  const fridaySurah = getDayOfWeek(localDateKey) === 5 ? getSurahById(18) : null;
  const surah =
    fridaySurah ?? surahs[hashText(`quran:${localDateKey}`) % surahs.length] ?? surahs[0];

  return {
    id: `quran-${localDateKey}-${surah.id}`,
    kind: 'quran',
    title: fridaySurah ? 'Friday reading: Surah Al-Kahf' : `Read Surah ${surah.surahName}`,
    body: `${surah.surahNameTranslation} - ${surah.totalAyah} ayahs. Take a few minutes for Quran reflection.`,
    href: buildSurahPath(surah.id, surah.surahName),
  };
}

function buildIslamicCampaign(localDateKey: string): EngagementCampaign {
  const campaign =
    ISLAMIC_CAMPAIGNS[hashText(`islamic:${localDateKey}`) % ISLAMIC_CAMPAIGNS.length] ??
    ISLAMIC_CAMPAIGNS[0];

  return {
    id: `islamic-${localDateKey}-${hashText(campaign.href)}`,
    kind: 'islamic',
    ...campaign,
  };
}

export async function buildEngagementCampaign({
  kind,
  localDateKey,
  lastRead,
}: BuildEngagementCampaignInput): Promise<EngagementCampaign> {
  if (kind === 'hadith') {
    return buildHadithCampaign(localDateKey);
  }
  if (kind === 'quran') {
    return buildQuranCampaign(localDateKey, lastRead);
  }
  return buildIslamicCampaign(localDateKey);
}
