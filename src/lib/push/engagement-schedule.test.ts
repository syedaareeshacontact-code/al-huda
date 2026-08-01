import { describe, expect, it } from 'vitest';

import {
  getEngagementDecision,
  getEngagementKind,
} from './engagement-schedule';

describe('getEngagementDecision', () => {
  it('delivers at 9 AM in the device timezone', () => {
    const now = new Date('2026-08-03T04:00:00.000Z');
    const base = {
      contentPreference: 'hadith' as const,
      lastSeenAt: '2026-08-02T10:00:00.000Z',
      lastEngagementAt: null,
    };

    expect(getEngagementDecision({ ...base, timeZone: 'Asia/Karachi' }, 'guest', now))
      .toMatchObject({ localDateKey: '2026-08-03', kind: 'hadith' });
    expect(
      getEngagementDecision({ ...base, timeZone: 'Europe/London' }, 'guest', now)
    ).toBeNull();
  });

  it('does not deliver twice on the same local day', () => {
    const decision = getEngagementDecision(
      {
        timeZone: 'Asia/Karachi',
        contentPreference: 'hadith',
        lastSeenAt: '2026-08-03T02:00:00.000Z',
        lastEngagementAt: '2026-08-03T03:45:00.000Z',
      },
      'guest',
      new Date('2026-08-03T04:15:00.000Z')
    );

    expect(decision).toBeNull();
  });

  it('reduces frequency as a reader becomes inactive', () => {
    const monday = new Date('2026-08-03T09:00:00.000Z');
    const tuesday = new Date('2026-08-04T09:00:00.000Z');
    const coolingReader = {
      timeZone: 'UTC',
      contentPreference: 'balanced' as const,
      lastSeenAt: '2026-07-14T09:00:00.000Z',
      lastEngagementAt: null,
    };
    const dormantReader = {
      ...coolingReader,
      lastSeenAt: '2026-05-01T09:00:00.000Z',
    };

    expect(getEngagementDecision(coolingReader, 'user', monday)?.cadence)
      .toBe('three-per-week');
    expect(getEngagementDecision(coolingReader, 'user', tuesday)).toBeNull();
    expect(getEngagementDecision(dormantReader, 'user', monday)).toBeNull();
    expect(
      getEngagementDecision(
        dormantReader,
        'user',
        new Date('2026-08-07T09:00:00.000Z')
      )?.cadence
    ).toBe('weekly');
  });
});

describe('getEngagementKind', () => {
  it('keeps the default guest mix Hadith-first', () => {
    const week = Array.from({ length: 7 }, (_, day) =>
      getEngagementKind('guest', 'hadith', day)
    );

    expect(week.filter((kind) => kind === 'hadith')).toHaveLength(5);
    expect(week).toContain('quran');
    expect(week).toContain('islamic');
  });

  it('keeps signed-in balanced readers varied', () => {
    const week = Array.from({ length: 7 }, (_, day) =>
      getEngagementKind('user', 'balanced', day)
    );

    expect(week.filter((kind) => kind === 'quran')).toHaveLength(3);
    expect(week.filter((kind) => kind === 'hadith')).toHaveLength(3);
    expect(week.filter((kind) => kind === 'islamic')).toHaveLength(1);
  });
});
