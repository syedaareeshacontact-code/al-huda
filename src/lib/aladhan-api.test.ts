import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPrayerTimesByCity } from './aladhan-api';

describe('aladhan-api resilience', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    global.fetch = originalFetch;
  });

  it('returns fallback prayer times when the Aladhan API request fails', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('offline'));

    const result = await getPrayerTimesByCity('Lahore', 'Pakistan');

    expect(result.timings.Fajr).toBeDefined();
    expect(result.timings.Dhuhr).toBeDefined();
    expect(result.timings.Maghrib).toBeDefined();
    expect(result.date.hijri.day).toBeDefined();
  });
});
