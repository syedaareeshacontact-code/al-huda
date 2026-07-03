import type { SurahIndexEntry } from '@/lib/quran-index';

/** Unique SEO intros — avoids thin/duplicate content across 114 surah pages */
const SURAH_UNIQUE_INTROS: Record<number, string> = {
  1: 'Surah Al-Faatiha is the opening chapter of the Quran and is recited in every unit of Muslim prayer (Salah). Known as Umm al-Kitab (Mother of the Book), its seven ayahs summarise the core themes of the entire Quran — praise of Allah, seeking guidance, and the straight path.',
  2: 'Surah Al-Baqara is the longest chapter of the Quran with 286 ayahs, revealed in Madina. It contains Ayat ul-Kursi (2:255), the greatest verse, and the last two ayahs recommended for nightly protection. Essential reading for understanding Islamic law and faith.',
  18: 'Surah Al-Kahf is recommended every Friday by the Prophet (ﷺ). Its four stories — the People of the Cave, the man with two gardens, Musa and Khidr, and Dhul-Qarnayn — offer timeless lessons on faith, wealth, knowledge, and power.',
  36: 'Surah Yaseen is called the "Heart of the Quran" (qalb al-Quran). Muslims frequently recite it for the deceased and during times of difficulty. Its powerful themes of resurrection, prophethood, and divine signs make it one of the most beloved surahs.',
  55: 'Surah Ar-Rahmaan beautifully repeats "Which of the favours of your Lord will you deny?" after describing Allah\'s countless blessings — from creation to the gardens of Paradise. Often recited for its soothing rhythm and reminder of divine mercy.',
  67: 'Surah Al-Mulk is recommended before sleep for protection in the grave. Its 30 ayahs describe Allah\'s sovereignty over creation and warn those who deny the Hereafter. A nightly recitation practice for millions of Muslims worldwide.',
  112: 'Surah Al-Ikhlas is equivalent to one-third of the Quran in reward. Its four ayahs define the pure monotheism (Tawheed) of Islam — Allah is One, Eternal, who begets not nor is begotten, and none is equal to Him.',
};

const RELATED_DUA_LINKS: Record<number, { label: string; href: string }[]> = {
  1: [
    { label: 'Duas During Prayer', href: '/duas/prayer' },
    { label: 'Morning Azkar', href: '/azkar' },
  ],
  2: [
    { label: 'Protection Duas', href: '/duas/protection' },
    { label: 'Before Sleep Duas', href: '/duas/sleep' },
  ],
  18: [
    { label: 'Friday Prayer Duas', href: '/duas/after_prayer' },
    { label: 'Knowledge Duas', href: '/duas/knowledge' },
  ],
};

export function getSurahSeoIntro(surah: SurahIndexEntry): string {
  if (SURAH_UNIQUE_INTROS[surah.id]) {
    return SURAH_UNIQUE_INTROS[surah.id];
  }

  const place = surah.revelationPlace === 'Mecca' ? 'Meccan' : 'Medinan';
  return `Surah ${surah.surahName} (${surah.surahNameTranslation}) is a ${place} chapter of the Quran with ${surah.totalAyah} ayahs. Read the complete Arabic text with Urdu tarjuma (Fatah Muhammad Jalandhari) and English translation (Sahih International) — with ayah-by-ayah links to Urdu tafseer where available.`;
}

export function getSurahUrduTitle(surah: SurahIndexEntry): string {
  return `سورۃ ${surah.surahNameArabic}`;
}

export function getSurahMetaTitle(surah: SurahIndexEntry): string {
  return `سورۃ ${surah.surahNameArabic} — Surah ${surah.surahName} Urdu Tarjuma, Tafseer & English Translation`;
}

export function getSurahMetaDescription(surah: SurahIndexEntry): string {
  const intro = getSurahSeoIntro(surah).slice(0, 120);
  return `${intro}… Read all ${surah.totalAyah} ayahs with Arabic text, Urdu tarjuma, English translation, audio tilawat, and ayah-wise Urdu tafseer.`;
}

export function getTafsirSurahIntro(surah: SurahIndexEntry, tafsirAyahCount: number): string {
  if (SURAH_UNIQUE_INTROS[surah.id]) {
    return `${SURAH_UNIQUE_INTROS[surah.id]} Explore ayah-by-ayah Urdu tafseer commentary for all ${tafsirAyahCount} ayahs of Surah ${surah.surahName}.`;
  }

  const place = surah.revelationPlace === 'Mecca' ? 'Meccan' : 'Medinan';
  return `Complete Urdu tafseer of Surah ${surah.surahName} (${surah.surahNameTranslation}) — a ${place} chapter with ${surah.totalAyah} ayahs. Read detailed Islamic commentary for ${tafsirAyahCount} ayahs with Arabic text, Urdu tarjuma, and English translation reference on Read al Quran.`;
}

export function getTafsirSurahMetaTitle(surah: SurahIndexEntry): string {
  return `Surah ${surah.surahName} Tafseer — ${getSurahUrduTitle(surah)} اردو تفسیر | Ayah-by-Ayah Commentary`;
}

export function getTafsirSurahMetaDescription(surah: SurahIndexEntry, tafsirAyahCount: number): string {
  return getTafsirSurahIntro(surah, tafsirAyahCount).slice(0, 155);
}

export function getRelatedLinks(surah: SurahIndexEntry): Array<{ label: string; href: string }> {
  const specific = RELATED_DUA_LINKS[surah.id] ?? [];
  return [
    ...specific,
    { label: 'Prayer Times Pakistan', href: '/prayer-times' },
    { label: 'Hadith Collections', href: '/hadith' },
    { label: 'All 114 Surahs', href: '/surah' },
  ];
}

export function getPrevNextSurah(surahId: number, allSurahs: SurahIndexEntry[]) {
  const idx = allSurahs.findIndex((s) => s.id === surahId);
  return {
    prev: idx > 0 ? allSurahs[idx - 1] : null,
    next: idx < allSurahs.length - 1 ? allSurahs[idx + 1] : null,
  };
}

/** How many ayahs to render with full text in SSR (rest get crawlable links) */
export function getSsrAyahFullTextLimit(totalAyah: number): number {
  if (totalAyah <= 30) return totalAyah;
  if (totalAyah <= 50) return 20;
  return 15;
}
