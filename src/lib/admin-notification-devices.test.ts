import { describe, expect, it } from 'vitest';

import {
  dedupeAdminNotificationDevices,
  reconcileNotificationDeviceOwnership,
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
    endpointHash: 'a'.repeat(64),
    deviceId: null,
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
    notificationTrackedSentCount: 0,
    notificationDisplayedCount: 0,
    notificationVisitCount: 0,
    notificationTrackedVisitCount: 0,
    siteVisitCount: 0,
    lastSiteVisitAt: null,
    lastNotificationVisitAt: null,
    lastNotificationDisplayedAt: null,
    lastNotificationCampaignId: null,
    lastNotificationKind: null,
    ...overrides,
  };
}

function createGuestDevice(
  overrides: Partial<Extract<AdminNotificationDevice, { ownerType: 'guest' }>>
): Extract<AdminNotificationDevice, { ownerType: 'guest' }> {
  return {
    id: 'guest-1',
    deviceId: 'browser-device-1',
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
    notificationTrackedSentCount: 0,
    notificationDisplayedCount: 0,
    notificationVisitCount: 0,
    notificationTrackedVisitCount: 0,
    siteVisitCount: 0,
    lastSiteVisitAt: null,
    lastNotificationVisitAt: null,
    lastNotificationDisplayedAt: null,
    lastNotificationCampaignId: null,
    lastNotificationKind: null,
    disabledAt: null,
    disabledReason: null,
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
        notificationTrackedSentCount: 0,
        notificationDisplayedCount: 0,
        notificationVisitCount: 0,
        notificationTrackedVisitCount: 0,
        siteVisitCount: 0,
        lastSiteVisitAt: null,
        lastNotificationVisitAt: null,
        lastNotificationDisplayedAt: null,
        lastNotificationCampaignId: null,
        lastNotificationKind: null,
        disabledAt: null,
        disabledReason: null,
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
        notificationTrackedSentCount: 0,
        notificationDisplayedCount: 0,
        notificationVisitCount: 0,
        notificationTrackedVisitCount: 0,
        siteVisitCount: 0,
        lastSiteVisitAt: null,
        lastNotificationVisitAt: null,
        lastNotificationDisplayedAt: null,
        lastNotificationCampaignId: null,
        lastNotificationKind: null,
        disabledAt: null,
        disabledReason: null,
      },
    ]);

    expect(devices).toHaveLength(4);
  });

  it('keeps signed-in subscriptions separate when their browser device ids differ', () => {
    const devices = dedupeAdminNotificationDevices([
      createUserDevice({ id: 'first-device', deviceId: 'browser-device-1' }),
      createUserDevice({ id: 'second-device', deviceId: 'browser-device-2' }),
    ]);

    expect(devices).toHaveLength(2);
  });

  it('aggregates delivery and visit metrics for duplicate logical devices', () => {
    const devices = dedupeAdminNotificationDevices([
      createUserDevice({
        id: 'old-device',
        notificationSentCount: 8,
        notificationDisplayedCount: 6,
        notificationVisitCount: 2,
        siteVisitCount: 5,
        lastSiteVisitAt: '2026-07-31T08:45:00.000Z',
        lastNotificationVisitAt: '2026-07-31T08:30:00.000Z',
        lastNotificationDisplayedAt: '2026-07-31T08:20:00.000Z',
        lastNotificationCampaignId: 'older-campaign',
        lastNotificationKind: 'hadith',
      }),
      createUserDevice({
        id: 'new-device',
        lastSeenAt: '2026-07-31T09:00:00.000Z',
        notificationSentCount: 4,
        notificationDisplayedCount: 3,
        notificationVisitCount: 1,
        siteVisitCount: 7,
        lastSiteVisitAt: '2026-07-31T09:45:00.000Z',
        lastNotificationVisitAt: '2026-07-31T09:30:00.000Z',
        lastNotificationDisplayedAt: '2026-07-31T09:20:00.000Z',
        lastNotificationCampaignId: 'newer-campaign',
        lastNotificationKind: 'quran',
      }),
    ]);

    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({
      notificationSentCount: 12,
      notificationDisplayedCount: 9,
      notificationVisitCount: 3,
      siteVisitCount: 12,
      lastSiteVisitAt: '2026-07-31T09:45:00.000Z',
      lastNotificationDisplayedAt: '2026-07-31T09:20:00.000Z',
      lastNotificationCampaignId: 'newer-campaign',
      lastNotificationKind: 'quran',
    });
  });

  it('uses the newest logical subscription status instead of stale failures', () => {
    const devices = dedupeAdminNotificationDevices([
      createUserDevice({
        id: 'disabled-old',
        enabled: false,
        failureCount: 3,
      }),
      createUserDevice({
        id: 'enabled-new',
        enabled: true,
        failureCount: 0,
        lastSeenAt: '2026-08-01T09:00:00.000Z',
      }),
    ]);

    expect(devices[0]).toMatchObject({
      id: 'enabled-new',
      enabled: true,
      failureCount: 0,
    });
  });

  it('uses the canonical maximum visit count for duplicate guest rows', () => {
    const devices = dedupeAdminNotificationDevices([
      createGuestDevice({ id: 'old-guest', siteVisitCount: 100 }),
      createGuestDevice({
        id: 'new-guest',
        siteVisitCount: 110,
        lastSeenAt: '2026-08-01T09:00:00.000Z',
      }),
    ]);

    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({ id: 'new-guest', siteVisitCount: 110 });
  });
});

describe('reconcileNotificationDeviceOwnership', () => {
  it('merges a guest lifecycle into its current signed-in browser once', () => {
    const currentGuest = createGuestDevice({
      id: 'guest-current',
      deviceId: 'guest-browser',
    });
    const migratedGuest = createGuestDevice({
      id: 'guest-migrated',
      deviceId: 'signed-in-browser',
      enabled: false,
      disabledReason: 'signed-in-owner-migration',
      notificationSentCount: 5,
      notificationDisplayedCount: 4,
      notificationVisitCount: 3,
      siteVisitCount: 10,
      lastEngagementAt: '2026-08-08T04:00:00.000Z',
      lastEngagementKind: 'islamic',
    });
    const signedInDevice = createUserDevice({
      id: 'user-device',
      deviceId: 'signed-in-browser',
      notificationSentCount: 2,
      notificationDisplayedCount: 1,
      notificationVisitCount: 1,
      siteVisitCount: 10,
      lastEngagementAt: '2026-08-07T04:00:00.000Z',
      lastEngagementKind: 'quran',
    });

    const devices = reconcileNotificationDeviceOwnership(
      [currentGuest, migratedGuest],
      [signedInDevice]
    );

    expect(devices.map((device) => device.id).sort()).toEqual([
      'guest-current',
      'user-device',
    ]);
    expect(devices.find((device) => device.id === 'user-device')).toMatchObject({
      ownerType: 'user',
      notificationSentCount: 7,
      notificationDisplayedCount: 5,
      notificationVisitCount: 4,
      siteVisitCount: 10,
      lastEngagementAt: '2026-08-08T04:00:00.000Z',
      lastEngagementKind: 'islamic',
    });
  });

  it('surfaces an enabled cross-owner collision instead of hiding it', () => {
    const enabledGuest = createGuestDevice({
      id: 'guest-collision',
      deviceId: 'shared-browser',
      enabled: true,
    });
    const signedInDevice = createUserDevice({
      id: 'user-collision',
      deviceId: 'shared-browser',
    });

    const devices = reconcileNotificationDeviceOwnership(
      [enabledGuest],
      [signedInDevice]
    );

    expect(devices.map((device) => device.id).sort()).toEqual([
      'guest-collision',
      'user-collision',
    ]);
  });
});
