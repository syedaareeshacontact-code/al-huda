import { describe, expect, it } from 'vitest';

import {
  dedupeAdminNotificationDevices,
  type AdminNotificationDevice,
} from './admin-notification-devices';

const androidUserAgent =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/150.0.0.0 Mobile Safari/537.36';

function createUserDevice(
  overrides: Partial<Extract<AdminNotificationDevice, { ownerType: 'user' }>>
): Extract<AdminNotificationDevice, { ownerType: 'user' }> {
  return {
    id: 'device-1',
    ownerType: 'user',
    userId: 'user-1',
    userName: 'Reader',
    userEmail: 'reader@example.com',
    imageUrl: null,
    userAgent: androidUserAgent,
    timeZone: 'Asia/Karachi',
    contentPreference: 'balanced',
    enabled: true,
    quranReminderEnabled: true,
    failureCount: 0,
    createdAt: '2026-07-31T08:00:00.000Z',
    updatedAt: '2026-07-31T08:00:00.000Z',
    lastSeenAt: '2026-07-31T08:00:00.000Z',
    lastSentAt: null,
    lastEngagementAt: null,
    lastEngagementKind: null,
    notificationSentCount: 0,
    notificationVisitCount: 0,
    lastNotificationVisitAt: null,
    lastNotificationCampaignId: null,
    lastNotificationKind: null,
    ...overrides,
  };
}

describe('dedupeAdminNotificationDevices', () => {
  it('keeps the newest row for the same signed-in browser and platform', () => {
    const devices = dedupeAdminNotificationDevices([
      createUserDevice({ id: 'old-device' }),
      createUserDevice({
        id: 'new-device',
        createdAt: '2026-07-31T09:00:00.000Z',
        updatedAt: '2026-07-31T09:00:00.000Z',
        lastSeenAt: '2026-07-31T09:00:00.000Z',
      }),
    ]);

    expect(devices).toHaveLength(1);
    expect(devices[0]?.id).toBe('new-device');
  });

  it('keeps different platforms and different guest device ids separate', () => {
    const devices = dedupeAdminNotificationDevices([
      createUserDevice({ id: 'android-device' }),
      createUserDevice({
        id: 'linux-device',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/150.0.0.0 Safari/537.36',
      }),
      {
        id: 'guest-1',
        deviceId: 'guest-device-1',
        ownerType: 'guest',
        userAgent: androidUserAgent,
        timeZone: 'Asia/Karachi',
        contentPreference: 'hadith',
        enabled: true,
        failureCount: 0,
        createdAt: '2026-07-31T08:00:00.000Z',
        updatedAt: '2026-07-31T08:00:00.000Z',
        lastSeenAt: '2026-07-31T08:00:00.000Z',
        lastSentAt: null,
        lastEngagementAt: null,
        lastEngagementKind: null,
        notificationSentCount: 0,
        notificationVisitCount: 0,
        lastNotificationVisitAt: null,
        lastNotificationCampaignId: null,
        lastNotificationKind: null,
      },
      {
        id: 'guest-2',
        deviceId: 'guest-device-2',
        ownerType: 'guest',
        userAgent: androidUserAgent,
        timeZone: 'Asia/Karachi',
        contentPreference: 'hadith',
        enabled: true,
        failureCount: 0,
        createdAt: '2026-07-31T08:00:00.000Z',
        updatedAt: '2026-07-31T08:00:00.000Z',
        lastSeenAt: '2026-07-31T08:00:00.000Z',
        lastSentAt: null,
        lastEngagementAt: null,
        lastEngagementKind: null,
        notificationSentCount: 0,
        notificationVisitCount: 0,
        lastNotificationVisitAt: null,
        lastNotificationCampaignId: null,
        lastNotificationKind: null,
      },
    ]);

    expect(devices).toHaveLength(4);
  });

  it('aggregates delivery and visit metrics for duplicate logical devices', () => {
    const devices = dedupeAdminNotificationDevices([
      createUserDevice({
        id: 'old-device',
        notificationSentCount: 8,
        notificationVisitCount: 2,
        lastNotificationVisitAt: '2026-07-31T08:30:00.000Z',
        lastNotificationCampaignId: 'older-campaign',
        lastNotificationKind: 'hadith',
      }),
      createUserDevice({
        id: 'new-device',
        lastSeenAt: '2026-07-31T09:00:00.000Z',
        notificationSentCount: 4,
        notificationVisitCount: 1,
        lastNotificationVisitAt: '2026-07-31T09:30:00.000Z',
        lastNotificationCampaignId: 'newer-campaign',
        lastNotificationKind: 'quran',
      }),
    ]);

    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({
      notificationSentCount: 12,
      notificationVisitCount: 3,
      lastNotificationCampaignId: 'newer-campaign',
      lastNotificationKind: 'quran',
    });
  });
});
