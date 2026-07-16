import { getSurahById } from '@/lib/quran-index';
import { buildAyahPopupPath, buildSurahPath } from '@/lib/quran-routing';

export interface NavLinkItem {
  id: number;
  name: string;
  link: string;
}

const navLinks: NavLinkItem[] = [
  { id: 0, name: 'Home', link: '/' },
  { id: 1, name: 'Quran', link: '/surah' },
  { id: 2, name: 'Tafseer', link: '/tafsir' },
  { id: 3, name: 'Hadith', link: '/hadith' },
  { id: 4, name: 'Read Online', link: '/read-quran-online' },
  { id: 5, name: 'About', link: '/about' },
  { id: 6, name: 'Contact', link: '/contact' },
  { id: 7, name: 'Feedback', link: '/feedback' },
];

function buildPopularSurahLink(surahId: number, ayahNumber?: number) {
  const surah = getSurahById(surahId);
  if (!surah) {
    return ayahNumber ? `/surah/${surahId}?ayah=${ayahNumber}` : `/surah/${surahId}`;
  }

  return ayahNumber
    ? buildAyahPopupPath(surah.id, surah.surahName, ayahNumber)
    : buildSurahPath(surah.id, surah.surahName);
}

export const popularSurahLinks = [
  { name: 'Surah Yaseen', link: buildPopularSurahLink(36) },
  { name: 'Surah Rahman', link: buildPopularSurahLink(55) },
  { name: 'Surah Kahf', link: buildPopularSurahLink(18) },
  { name: 'Surah Mulk', link: buildPopularSurahLink(67) },
  { name: 'Surah Waqiah', link: buildPopularSurahLink(56) },
  { name: 'Ayat ul Kursi', link: buildPopularSurahLink(2, 255) },
];

export default navLinks;
