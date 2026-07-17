import { describe, expect, it } from 'vitest';

import {
  buildAyahPopupPath,
  buildAyahPath,
  buildSurahPath,
  buildSurahSlug,
  buildTafsirPopupPath,
  buildTafsirPath,
  buildUrduAyahAudioUrl,
  parseSurahIdFromParam,
} from './quran-routing';

describe('quran-routing', () => {
  it('creates stable surah slug', () => {
    expect(buildSurahSlug(2, 'Al-Baqara')).toBe('2-al-baqara');
    expect(buildSurahSlug(112, 'Al-Ikhlaas')).toBe('112-al-ikhlaas');
  });

  it('parses numeric and slug params', () => {
    expect(parseSurahIdFromParam('2')).toBe(2);
    expect(parseSurahIdFromParam('2-al-baqara')).toBe(2);
    expect(parseSurahIdFromParam('999-invalid')).toBeNull();
  });

  it('builds canonical paths', () => {
    expect(buildSurahPath(1, 'Al-Faatiha')).toBe('/surah/1-al-faatiha');
    expect(buildAyahPath(2, 'Al-Baqara', 255)).toBe('/surah/2-al-baqara/ayah/255');
    expect(buildTafsirPath(2, 'Al-Baqara', 255)).toBe('/tafsir/2-al-baqara/255');
  });

  it('builds query-based popup paths', () => {
    expect(buildAyahPopupPath(2, 'Al-Baqara', 255)).toBe(
      '/surah/2-al-baqara?ayah=255'
    );
    expect(buildTafsirPopupPath(2, 'Al-Baqara', 255)).toBe(
      '/tafsir/2-al-baqara?ayah=255'
    );
  });

  it('builds padded verse-by-verse Urdu translation audio URLs', () => {
    expect(buildUrduAyahAudioUrl(2, 1)).toBe(
      'https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps/002001.mp3'
    );
    expect(buildUrduAyahAudioUrl(2, 286)).toBe(
      'https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps/002286.mp3'
    );
    expect(buildUrduAyahAudioUrl(114, 6)).toBe(
      'https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps/114006.mp3'
    );
  });
});
