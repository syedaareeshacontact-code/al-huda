import { describe, expect, it } from 'vitest';

import {
  buildAyahAudioDownloadUrl,
  buildSurahAudioDownloadUrl,
  buildSurahPdfDownloadUrl,
} from './download-routes';

describe('protected download routes', () => {
  it('builds same-origin PDF download URLs', () => {
    expect(buildSurahPdfDownloadUrl(36, 'arabic')).toBe(
      '/api/surah/36/pdf?variant=arabic'
    );
    expect(buildSurahPdfDownloadUrl(36, 'arabic-urdu')).toBe(
      '/api/surah/36/pdf?variant=arabic-urdu'
    );
  });

  it('builds reciter-specific and Urdu surah audio URLs', () => {
    expect(buildSurahAudioDownloadUrl(55, 'arabic', 7)).toBe(
      '/api/surah/55/audio?variant=arabic&reciter=7'
    );
    expect(buildSurahAudioDownloadUrl(55, 'urdu')).toBe(
      '/api/surah/55/audio?variant=urdu'
    );
  });

  it('builds protected ayah audio URLs', () => {
    expect(buildAyahAudioDownloadUrl(2, 255, 'arabic')).toBe(
      '/api/surah/2/ayah/255/audio?variant=arabic'
    );
    expect(buildAyahAudioDownloadUrl(2, 255, 'urdu')).toBe(
      '/api/surah/2/ayah/255/audio?variant=urdu'
    );
  });
});
