import type { PushSubscription } from 'web-push';

import {
  markPushSubscriptionFailure,
  type PushSubscriptionForDelivery,
} from '@/lib/auth/users-store';
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

export async function sendPushNotificationToSubscriptions(
  subscriptions: PushSubscriptionForDelivery[],
  payload: PushPayload
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

  let sent = 0;
  let failed = 0;
  let disabled = 0;
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

  for (const subscription of subscriptions) {
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
      sent += 1;
    } catch (error) {
      const statusCode =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number((error as { statusCode?: unknown }).statusCode)
          : 0;
      const shouldDisable = statusCode === 404 || statusCode === 410;
      await markPushSubscriptionFailure(subscription.userId, subscription.endpoint, shouldDisable);
      failed += 1;
      if (shouldDisable) {
        disabled += 1;
      }
    }
  }

  return {
    sent,
    failed,
    disabled,
    unavailable: false,
  };
}
