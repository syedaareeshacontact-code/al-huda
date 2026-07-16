import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPrayerTimesByCity, toAladhanDate } from './aladhan-api';

describe('aladhan-api resilience', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    global.fetch = originalFetch;
  });

  it('returns an unavailable response instead of invented prayer times', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('offline'));

    const result = await getPrayerTimesByCity('Lahore', 'Pakistan', '2026-07-16');

    expect(result.available).toBe(false);
    expect(result.requestedDate).toBe('2026-07-16');
    expect(result.timings.Fajr).toBe('');
    expect(result.date.hijri.day).toBe('');
  });

  it('uses the date format required by the Aladhan API', () => {
    expect(toAladhanDate('2026-07-16')).toBe('16-07-2026');
  });

  it('rejects an API response for a different date', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: 200,
        data: {
          timings: {
            Fajr: '04:00',
            Sunrise: '05:30',
            Dhuhr: '12:15',
            Asr: '17:00',
            Sunset: '19:15',
            Maghrib: '19:15',
            Isha: '20:45',
          },
          date: {
            readable: '16 Jul 2016',
            hijri: {
              date: '10-10-1437',
              day: '10',
              month: { number: 10, en: 'Shawwal', ar: 'شوّال' },
              year: '1437',
              weekday: { en: 'Saturday', ar: 'السبت' },
            },
            gregorian: { date: '16-07-2016', weekday: { en: 'Saturday' } },
          },
          meta: {
            latitude: 31.52,
            longitude: 74.35,
            timezone: 'Asia/Karachi',
            method: { id: 1, name: 'Karachi' },
          },
        },
      }),
    } as Response);

    const result = await getPrayerTimesByCity('Lahore', 'Pakistan', '2026-07-16');
    expect(result.available).toBe(false);
  });
});
