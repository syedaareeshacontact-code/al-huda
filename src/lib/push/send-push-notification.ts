import type { PushSubscription } from 'web-push';

import {
  markPushSubscriptionSent,
  markPushSubscriptionFailure,
  type PushSubscriptionForDelivery,
} from '@/lib/auth/users-store';
import {
  markGuestPushSubscriptionFailure,
  markGuestPushSubscriptionSent,
  type GuestPushSubscriptionForDelivery,
} from '@/lib/push/guest-push-store';
import type { PushEngagementKind } from '@/lib/push/engagement-types';
import { getConfiguredWebPush } from '@/lib/push/web-push';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  ttlSeconds?: number;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  data?: Record<string, string | number | boolean | null>;
}

export interface PushDeliveryResult {
  sent: number;
  failed: number;
  disabled: number;
  unavailable: boolean;
}

export interface PushDeliveryOptions {
  engagementKind?: PushEngagementKind;
}

interface SingleDeliveryResult {
  sent: number;
  failed: number;
  disabled: number;
}

const PUSH_DELIVERY_CONCURRENCY = 8;

function isGuestPushSubscription(
  subscription:
    | PushSubscriptionForDelivery
    | GuestPushSubscriptionForDelivery
): subscription is GuestPushSubscriptionForDelivery {
  return 'ownerType' in subscription && subscription.ownerType === 'guest';
}

export async function sendPushNotificationToSubscriptions(
  subscriptions: Array<
    PushSubscriptionForDelivery | GuestPushSubscriptionForDelivery
  >,
  payload: PushPayload,
  options: PushDeliveryOptions = {}
): Promise<PushDeliveryResult> {
  const push = getConfiguredWebPush();
  if (!push) {
    return {
      sent: 0,
      failed: 0,
      disabled: 0,
      unavailable: true,
    };
  }

  const serializedPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/logos/pwa-192.png',
    badge: payload.badge || '/logos/favicon-48.png',
    tag: payload.tag || 'read-al-quran-notification',
    url: payload.url || '/',
    data: {
      url: payload.url || '/',
      ...(payload.data || {}),
    },
  });

  const deliver = async (
    subscription: PushSubscriptionForDelivery | GuestPushSubscriptionForDelivery
  ): Promise<SingleDeliveryResult> => {
    try {
      await push.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        } satisfies PushSubscription,
        serializedPayload,
        {
          TTL: payload.ttlSeconds ?? 86_400,
          urgency: payload.urgency ?? 'normal',
        }
      );
      const sentAt = new Date().toISOString();
      if (isGuestPushSubscription(subscription)) {
        await markGuestPushSubscriptionSent(
          subscription.endpoint,
          sentAt,
          options.engagementKind
        );
      } else {
        await markPushSubscriptionSent(
          subscription.userId,
          subscription.endpoint,
          sentAt,
          options.engagementKind
        );
      }
      return { sent: 1, failed: 0, disabled: 0 };
    } catch (error) {
      const statusCode =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number((error as { statusCode?: unknown }).statusCode)
          : 0;
      const shouldDisable = statusCode === 404 || statusCode === 410;
      if (isGuestPushSubscription(subscription)) {
        await markGuestPushSubscriptionFailure(
          subscription.endpoint,
          shouldDisable
        );
      } else {
        await markPushSubscriptionFailure(
          subscription.userId,
          subscription.endpoint,
          shouldDisable
        );
      }
      return {
        sent: 0,
        failed: 1,
        disabled: shouldDisable ? 1 : 0,
      };
    }
  };

  const results = new Array<SingleDeliveryResult>(subscriptions.length);
  let nextIndex = 0;
  const workerCount = Math.min(PUSH_DELIVERY_CONCURRENCY, subscriptions.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < subscriptions.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await deliver(subscriptions[index]);
      }
    })
  );

  const totals = results.reduce(
    (summary, result) => ({
      sent: summary.sent + result.sent,
      failed: summary.failed + result.failed,
      disabled: summary.disabled + result.disabled,
    }),
    { sent: 0, failed: 0, disabled: 0 }
  );

  return {
    ...totals,
    unavailable: false,
  };
}
