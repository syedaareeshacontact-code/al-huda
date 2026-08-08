import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/mongodb', () => ({
  connectToMongoDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/push/engagement-types', () => ({
  normalizePushContentPreference: (value: unknown, fallback: string) =>
    value === 'hadith' || value === 'quran' || value === 'balanced'
      ? value
      : fallback,
}));

vi.mock('@/lib/push/site-visit-tracking', () => ({
  getSiteVisitCutoffIso: (value: string) => value,
}));

import {
  ensureGuestPushNotificationAccepted,
  markGuestPushSubscriptionFailure,
  markGuestPushSubscriptionSent,
} from './guest-push-store';

interface InspectedQuery {
  op: string;
  getFilter: () => Record<string, unknown>;
  getUpdate: () => Record<string, unknown>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('guest accepted delivery persistence', () => {
  it('records provider acceptance metadata, counters, and id in one atomic update', async () => {
    const execSpy = vi
      .spyOn(mongoose.Query.prototype, 'exec')
      .mockResolvedValue({ modifiedCount: 1 });

    await markGuestPushSubscriptionSent(
      'https://push.example/subscription-1',
      '2026-08-08T04:00:00.000Z',
      'islamic',
      {
        deliveryId: 'delivery-1',
        campaignId: 'campaign-1',
        notificationKind: 'islamic',
      },
      true
    );

    expect(execSpy).toHaveBeenCalledTimes(1);
    const query = execSpy.mock.instances[0] as unknown as InspectedQuery;
    expect(query.op).toBe('updateOne');
    expect(query.getFilter()).toEqual({
      endpoint: 'https://push.example/subscription-1',
      acceptedDeliveryIds: { $ne: 'delivery-1' },
    });
    expect(query.getUpdate()).toMatchObject({
      $set: {
        lastSentAt: '2026-08-08T04:00:00.000Z',
        lastEngagementKind: 'islamic',
        failureCount: 0,
      },
      $inc: {
        notificationSentCount: 1,
        notificationTrackedSentCount: 1,
      },
      $push: {
        acceptedDeliveryIds: {
          $each: ['delivery-1'],
        },
      },
    });
  });

  it('uses the same atomic delivery-id guard for receipt recovery', async () => {
    const execSpy = vi
      .spyOn(mongoose.Query.prototype, 'exec')
      .mockResolvedValue({ modifiedCount: 1 });

    await ensureGuestPushNotificationAccepted({
      guestDeviceId: 'guest-1',
      deliveryId: 'delivery-1',
      campaignId: 'campaign-1',
      notificationKind: 'islamic',
      engagementLocalDateKey: '2026-08-08',
      acceptedAt: '2026-08-08T04:00:01.000Z',
    });

    expect(execSpy).toHaveBeenCalledTimes(1);
    const query = execSpy.mock.instances[0] as unknown as InspectedQuery;
    expect(query.getFilter()).toEqual({
      id: 'guest-1',
      acceptedDeliveryIds: { $ne: 'delivery-1' },
    });
    expect(query.getUpdate()).toMatchObject({
      $set: {
        lastSentAt: '2026-08-08T04:00:01.000Z',
        lastEngagementAt: '2026-08-08T04:00:01.000Z',
        lastEngagementKind: 'islamic',
      },
      $inc: {
        notificationSentCount: 1,
        notificationTrackedSentCount: 1,
      },
      $push: {
        acceptedDeliveryIds: {
          $each: ['delivery-1'],
        },
      },
    });
  });

  it('does not apply a late transport failure after a display repaired acceptance', async () => {
    const execSpy = vi
      .spyOn(mongoose.Query.prototype, 'exec')
      .mockResolvedValue({ modifiedCount: 0 });

    await markGuestPushSubscriptionFailure(
      'https://push.example/subscription-1',
      false,
      'delivery-1'
    );

    const query = execSpy.mock.instances[0] as unknown as InspectedQuery;
    expect(query.getFilter()).toEqual({
      endpoint: 'https://push.example/subscription-1',
      acceptedDeliveryIds: { $ne: 'delivery-1' },
    });
  });
});
