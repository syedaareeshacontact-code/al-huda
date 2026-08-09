import { describe, expect, it } from 'vitest';

import { getPrayerReminderDecision } from './prayer-reminder-schedule';

const timings = {
  Fajr: '05:30',
  Dhuhr: '12:30',
  Asr: '16:30',
  Maghrib: '18:45',
  Isha: '20:00',
};

describe('getPrayerReminderDecision', () => {
  it('delivers a reminder in the configured prayer timezone', () => {
    const decision = getPrayerReminderDecision(
      {
        timings,
        timeZone: 'Asia/Karachi',
        city: 'Karachi',
        country: 'Pakistan',
        reminderMinutes: 30,
      },
      new Date('2026-08-09T07:00:00.000Z')
    );

    expect(decision).toMatchObject({
      prayer: 'Dhuhr',
      reminderKey: '2026-08-09:Pakistan:Karachi:Dhuhr:30',
    });
  });

  it('does not trigger before or after the delivery grace window', () => {
    const input = {
      timings,
      timeZone: 'Asia/Karachi',
      city: 'Karachi',
      country: 'Pakistan',
      reminderMinutes: 30,
    };

    expect(getPrayerReminderDecision(input, new Date('2026-08-09T06:59:00.000Z'))).toBeNull();
    expect(getPrayerReminderDecision(input, new Date('2026-08-09T07:16:00.000Z'))).toBeNull();
  });

  it('uses a distinct delivery key when the reminder offset changes', () => {
    const thirtyMinute = getPrayerReminderDecision(
      {
        timings,
        timeZone: 'Asia/Karachi',
        city: 'Karachi',
        country: 'Pakistan',
        reminderMinutes: 30,
      },
      new Date('2026-08-09T07:00:00.000Z')
    );
    const twentyMinute = getPrayerReminderDecision(
      {
        timings,
        timeZone: 'Asia/Karachi',
        city: 'Karachi',
        country: 'Pakistan',
        reminderMinutes: 20,
      },
      new Date('2026-08-09T07:10:00.000Z')
    );

    expect(thirtyMinute?.reminderKey).toContain(':30');
    expect(twentyMinute?.reminderKey).toContain(':20');
    expect(thirtyMinute?.reminderKey).not.toBe(twentyMinute?.reminderKey);
  });
});
