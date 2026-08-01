export type PushContentPreference = 'hadith' | 'quran' | 'balanced';

export type PushEngagementKind = 'hadith' | 'quran' | 'islamic';

export function normalizePushContentPreference(
  value: unknown,
  fallback: PushContentPreference
): PushContentPreference {
  return value === 'hadith' || value === 'quran' || value === 'balanced'
    ? value
    : fallback;
}

export function getPushContentPreferenceFromPath(
  pathname: string | null | undefined
): Exclude<PushContentPreference, 'balanced'> | undefined {
  const normalizedPath = String(pathname ?? '').trim().toLowerCase();

  if (normalizedPath === '/hadith' || normalizedPath.startsWith('/hadith/')) {
    return 'hadith';
  }

  if (
    normalizedPath === '/quran' ||
    normalizedPath.startsWith('/quran/') ||
    normalizedPath === '/surah' ||
    normalizedPath.startsWith('/surah/') ||
    normalizedPath === '/tafsir' ||
    normalizedPath.startsWith('/tafsir/') ||
    normalizedPath === '/read-quran-online' ||
    normalizedPath.startsWith('/read-quran-online/')
  ) {
    return 'quran';
  }

  return undefined;
}
