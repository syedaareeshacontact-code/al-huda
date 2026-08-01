import { describe, expect, it } from 'vitest';

import {
  buildQuranCampaign,
  selectHadithReference,
} from './engagement-content';

describe('engagement content', () => {
  it('selects a stable Hadith reference for a local date', () => {
    expect(selectHadithReference('2026-08-03')).toEqual(
      selectHadithReference('2026-08-03')
    );
  });

  it('targets Surah Al-Kahf on Friday', () => {
    const campaign = buildQuranCampaign('2026-08-07');

    expect(campaign.title).toContain('Surah Al-Kahf');
    expect(campaign.href).toBe('/surah/18-al-kahf');
  });

  it('continues a signed-in reader from their last ayah', () => {
    const campaign = buildQuranCampaign('2026-08-03', {
      surahId: 2,
      ayahNumber: 25,
      updatedAt: '2026-08-02T10:00:00.000Z',
    });

    expect(campaign.title).toBe('Continue Surah Al-Baqara');
    expect(campaign.href).toBe('/surah/2-al-baqara?ayah=25');
  });
});
