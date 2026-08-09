import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GuestPushSubscriptionForDelivery } from './guest-push-store';

const mocks = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  getConfiguredWebPush: vi.fn(),
  markGuestPushSubscriptionSent: vi.fn(),
  markGuestPushSubscriptionFailure: vi.fn(),
  completeGuestPushEngagementClaim: vi.fn(),
  deferGuestPushEngagementClaim: vi.fn(),
  releaseGuestPushEngagementClaim: vi.fn(),
  markPushSubscriptionSent: vi.fn(),
  markPushSubscriptionFailure: vi.fn(),
  createPushTrackingToken: vi.fn(),
  recordPushDeliveryPending: vi.fn(),
  recordPushDeliveryAccepted: vi.fn(),
  recordPushDeliveryFailed: vi.fn(),
}));

vi.mock('@/lib/push/web-push', () => ({
  getConfiguredWebPush: mocks.getConfiguredWebPush,
}));

vi.mock('@/lib/push/guest-push-store', () => ({
  markGuestPushSubscriptionSent: mocks.markGuestPushSubscriptionSent,
  markGuestPushSubscriptionFailure: mocks.markGuestPushSubscriptionFailure,
  completeGuestPushEngagementClaim: mocks.completeGuestPushEngagementClaim,
  deferGuestPushEngagementClaim: mocks.deferGuestPushEngagementClaim,
  releaseGuestPushEngagementClaim: mocks.releaseGuestPushEngagementClaim,
}));

vi.mock('@/lib/auth/users-store', () => ({
  markPushSubscriptionSent: mocks.markPushSubscriptionSent,
  markPushSubscriptionFailure: mocks.markPushSubscriptionFailure,
}));

vi.mock('@/lib/push/push-open-tracking', () => ({
  createPushTrackingToken: mocks.createPushTrackingToken,
}));

vi.mock('@/lib/push/push-delivery-audit-store', () => ({
  recordPushDeliveryPending: mocks.recordPushDeliveryPending,
  recordPushDeliveryAccepted: mocks.recordPushDeliveryAccepted,
  recordPushDeliveryFailed: mocks.recordPushDeliveryFailed,
}));

import { sendPushNotificationToSubscriptions } from './send-push-notification';

const guestSubscription = {
  id: 'guest-subscription-1',
  guestDeviceId: 'guest-subscription-1',
  ownerType: 'guest',
  deviceId: 'browser-device-1',
  endpoint: 'https://push.example/subscription-1',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
} as GuestPushSubscriptionForDelivery;

const payload = {
  title: 'Daily reminder',
  body: 'Read today\'s reminder.',
  tag: 'daily-reminder',
  data: { campaignId: 'daily-2026-08-08', kind: 'islamic' },
};

function pushError(statusCode: number, message = 'Provider unavailable') {
  return Object.assign(new Error(message), { statusCode });
}

describe('sendPushNotificationToSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConfiguredWebPush.mockReturnValue({
      sendNotification: mocks.sendNotification,
    });
    mocks.createPushTrackingToken.mockReturnValue('signed-tracking-token');
    mocks.markGuestPushSubscriptionSent.mockResolvedValue(undefined);
    mocks.markGuestPushSubscriptionFailure.mockResolvedValue(undefined);
    mocks.completeGuestPushEngagementClaim.mockResolvedValue(undefined);
    mocks.deferGuestPushEngagementClaim.mockResolvedValue(undefined);
    mocks.releaseGuestPushEngagementClaim.mockResolvedValue(undefined);
    mocks.markPushSubscriptionSent.mockResolvedValue(undefined);
    mocks.markPushSubscriptionFailure.mockResolvedValue(undefined);
    mocks.recordPushDeliveryPending.mockResolvedValue({ status: 'pending' });
    mocks.recordPushDeliveryAccepted.mockResolvedValue({ status: 'accepted' });
    mocks.recordPushDeliveryFailed.mockResolvedValue({ status: 'failed' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries transient provider failures and records an accepted delivery', async () => {
    vi.useFakeTimers();
    mocks.sendNotification
      .mockRejectedValueOnce(pushError(503))
      .mockRejectedValueOnce(pushError(429))
      .mockResolvedValueOnce(undefined);

    const delivery = sendPushNotificationToSubscriptions(
      [guestSubscription],
      payload,
      { deliverySource: 'scheduled', engagementKind: 'islamic' }
    );
    await vi.runAllTimersAsync();

    await expect(delivery).resolves.toMatchObject({
      sent: 1,
      failed: 0,
      disabled: 0,
      retried: 2,
      persistenceFailed: 0,
      unavailable: false,
    });
    expect(mocks.sendNotification).toHaveBeenCalledTimes(3);
    expect(mocks.sendNotification).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(String),
      expect.objectContaining({
        topic: expect.stringMatching(/^[A-Za-z0-9_-]{32}$/),
      })
    );
    const serializedPayload = String(
      mocks.sendNotification.mock.calls.at(-1)?.[1]
    );
    expect(JSON.parse(serializedPayload)).toMatchObject({
      icon: '/logos/pwa-192.png',
      badge: '/logos/notification-badge-96.png',
    });
    expect(mocks.recordPushDeliveryPending).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerType: 'guest',
        ownerId: guestSubscription.guestDeviceId,
        deviceId: guestSubscription.deviceId,
        endpoint: guestSubscription.endpoint,
        source: 'scheduled',
      })
    );
    expect(mocks.recordPushDeliveryAccepted).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryId: expect.any(String),
        acceptedAt: expect.any(String),
        ownerType: 'guest',
        ownerId: guestSubscription.guestDeviceId,
        deviceId: guestSubscription.deviceId,
        source: 'scheduled',
        campaignId: 'daily-2026-08-08',
        notificationKind: 'islamic',
      })
    );
    expect(mocks.recordPushDeliveryFailed).not.toHaveBeenCalled();
  });

  it('does not retry an expired subscription or release its daily claim', async () => {
    mocks.sendNotification.mockRejectedValueOnce(
      pushError(410, 'Subscription expired')
    );

    const result = await sendPushNotificationToSubscriptions(
      [guestSubscription],
      payload,
      {
        deliverySource: 'scheduled',
        engagementKind: 'islamic',
        engagementLocalDateKey: '2026-08-08',
      }
    );

    expect(result).toMatchObject({
      sent: 0,
      failed: 1,
      disabled: 1,
      retried: 0,
      persistenceFailed: 0,
    });
    expect(mocks.sendNotification).toHaveBeenCalledTimes(1);
    expect(mocks.markGuestPushSubscriptionFailure).toHaveBeenCalledWith(
      guestSubscription.endpoint,
      true,
      expect.any(String)
    );
    expect(mocks.releaseGuestPushEngagementClaim).not.toHaveBeenCalled();
    expect(mocks.recordPushDeliveryFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryId: expect.any(String),
        statusCode: 410,
        disabled: true,
      })
    );
  });

  it('keeps a provider success even when every persistence write fails', async () => {
    mocks.sendNotification.mockResolvedValueOnce(undefined);
    mocks.recordPushDeliveryPending.mockRejectedValueOnce(
      new Error('pending audit unavailable')
    );
    mocks.markGuestPushSubscriptionSent.mockRejectedValueOnce(
      new Error('guest store unavailable')
    );
    mocks.recordPushDeliveryAccepted.mockRejectedValueOnce(
      new Error('accepted audit unavailable')
    );

    const result = await sendPushNotificationToSubscriptions(
      [guestSubscription],
      payload,
      { deliverySource: 'admin-guest-broadcast' }
    );

    expect(result).toMatchObject({
      sent: 1,
      failed: 0,
      persistenceFailed: 3,
      unavailable: false,
    });
  });

  it('keeps accepted audit metadata when only the pending audit fails', async () => {
    mocks.sendNotification.mockResolvedValueOnce(undefined);
    mocks.recordPushDeliveryPending.mockRejectedValueOnce(
      new Error('pending audit unavailable')
    );

    const result = await sendPushNotificationToSubscriptions(
      [guestSubscription],
      payload,
      { deliverySource: 'scheduled', engagementKind: 'islamic' }
    );

    expect(result).toMatchObject({ sent: 1, persistenceFailed: 1 });
    expect(mocks.recordPushDeliveryAccepted).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerType: 'guest',
        ownerId: guestSubscription.guestDeviceId,
        deviceId: guestSubscription.deviceId,
        endpoint: guestSubscription.endpoint,
        source: 'scheduled',
        campaignId: 'daily-2026-08-08',
        notificationKind: 'islamic',
      })
    );
  });

  it('backs off a scheduled guest after final transient provider failure', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-08T04:00:00.000Z'));
    mocks.sendNotification.mockRejectedValue(pushError(503));

    const delivery = sendPushNotificationToSubscriptions(
      [guestSubscription],
      payload,
      {
        deliverySource: 'scheduled',
        engagementKind: 'islamic',
        engagementLocalDateKey: '2026-08-08',
      }
    );
    await vi.runAllTimersAsync();

    await expect(delivery).resolves.toMatchObject({
      sent: 0,
      failed: 1,
      retried: 2,
    });
    expect(mocks.deferGuestPushEngagementClaim).toHaveBeenCalledWith({
      guestDeviceId: guestSubscription.guestDeviceId,
      localDateKey: '2026-08-08',
      retryAfter: '2026-08-08T06:00:01.250Z',
    });
    expect(mocks.releaseGuestPushEngagementClaim).not.toHaveBeenCalled();
  });

  it('finalizes the daily claim even if the aggregate sent counter fails', async () => {
    mocks.sendNotification.mockResolvedValueOnce(undefined);
    mocks.markGuestPushSubscriptionSent.mockRejectedValueOnce(
      new Error('guest aggregate unavailable')
    );

    const result = await sendPushNotificationToSubscriptions(
      [guestSubscription],
      payload,
      {
        deliverySource: 'scheduled',
        engagementKind: 'islamic',
        engagementLocalDateKey: '2026-08-08',
      }
    );

    expect(result).toMatchObject({ sent: 1, persistenceFailed: 1 });
    expect(mocks.completeGuestPushEngagementClaim).toHaveBeenCalledWith({
      guestDeviceId: guestSubscription.guestDeviceId,
      localDateKey: '2026-08-08',
      completedAt: expect.any(String),
    });
    expect(mocks.createPushTrackingToken).toHaveBeenCalledWith(
      expect.objectContaining({
        engagementLocalDateKey: '2026-08-08',
      })
    );
  });
});
