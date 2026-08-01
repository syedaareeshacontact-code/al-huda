import { describe, expect, it } from 'vitest';

import {
  isQuranReminderDueForSubscription,
  normalizeReminderTimeZone,
} from './quran-reminder-schedule';

describe('quran reminder schedule', () => {
  it('uses the subscription timezone for local 9 AM delivery', () => {
    const now = new Date('2026-08-01T04:00:00.000Z');

    expect(
      isQuranReminderDueForSubscription({ timeZone: 'Asia/Karachi' }, now)
    ).toBe(true);
    expect(
      isQuranReminderDueForSubscription({ timeZone: 'Europe/London' }, now)
    ).toBe(false);
  });

  it('supports quarter-hour offset timezones', () => {
    const now = new Date('2026-08-01T03:15:00.000Z');

    expect(
      isQuranReminderDueForSubscription({ timeZone: 'Asia/Kathmandu' }, now)
    ).toBe(true);
  });

  it('does not send twice on the same local day', () => {
    const now = new Date('2026-08-01T04:30:00.000Z');

    expect(
      isQuranReminderDueForSubscription(
        {
          timeZone: 'Asia/Karachi',
          lastReminderAt: '2026-08-01T04:00:00.000Z',
        },
        now
      )
    ).toBe(false);
  });

  it('falls back to UTC for invalid or missing timezones', () => {
    expect(normalizeReminderTimeZone('Not/A_Zone')).toBe('UTC');
    expect(
      isQuranReminderDueForSubscription({}, new Date('2026-08-01T09:00:00.000Z'))
    ).toBe(true);
  });
});
