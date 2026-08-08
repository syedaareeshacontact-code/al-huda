import { createHash, randomUUID } from 'node:crypto';

import type { PushSubscription } from 'web-push';

import {
  markPushSubscriptionSent,
  markPushSubscriptionFailure,
  type PushSubscriptionForDelivery,
} from '@/lib/auth/users-store';
import {
  completeGuestPushEngagementClaim,
  deferGuestPushEngagementClaim,
  markGuestPushSubscriptionFailure,
  markGuestPushSubscriptionSent,
  releaseGuestPushEngagementClaim,
  type GuestPushSubscriptionForDelivery,
} from '@/lib/push/guest-push-store';
import type { PushEngagementKind } from '@/lib/push/engagement-types';
import {
  recordPushDeliveryAccepted,
  recordPushDeliveryFailed,
  recordPushDeliveryPending,
  type PushDeliveryOwnerType,
  type PushDeliverySource,
} from '@/lib/push/push-delivery-audit-store';
import { createPushTrackingToken } from '@/lib/push/push-open-tracking';
import { getConfiguredWebPush } from '@/lib/push/web-push';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  renotify?: boolean;
  ttlSeconds?: number;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  data?: Record<string, string | number | boolean | null>;
}

export interface PushDeliveryResult {
  sent: number;
  failed: number;
  disabled: number;
  retried: number;
  persistenceFailed: number;
  unavailable: boolean;
}

export interface PushDeliveryOptions {
  engagementKind?: PushEngagementKind;
  engagementLocalDateKey?: string;
  deliverySource?: PushDeliverySource;
}

interface SingleDeliveryResult {
  sent: number;
  failed: number;
  disabled: number;
  retried: number;
  persistenceFailed: number;
}

const PUSH_DELIVERY_CONCURRENCY = 24;
const MAX_PUSH_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [250, 1_000] as const;
const TRANSIENT_SCHEDULE_RETRY_DELAY_MS = 2 * 60 * 60 * 1_000;
const TERMINAL_SCHEDULE_RETRY_DELAY_MS = 6 * 60 * 60 * 1_000;

function getPushStatusCode(error: unknown) {
  return error && typeof error === 'object' && 'statusCode' in error
    ? Number((error as { statusCode?: unknown }).statusCode)
    : 0;
}

function getPushErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string'
    ? error
    : 'Push provider request failed.';
}

function isRetryablePushFailure(statusCode: number) {
  return (
    statusCode === 0 ||
    statusCode === 408 ||
    statusCode === 425 ||
    statusCode === 429 ||
    statusCode >= 500
  );
}

function waitForRetry(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function getRetryAfterDelayMs(error: unknown) {
  if (!error || typeof error !== 'object' || !('headers' in error)) {
    return null;
  }

  const headers = (error as { headers?: unknown }).headers;
  let rawValue: unknown;
  if (headers && typeof headers === 'object' && 'get' in headers) {
    const get = (headers as { get?: unknown }).get;
    if (typeof get === 'function') {
      rawValue = get.call(headers, 'retry-after');
    }
  } else if (headers && typeof headers === 'object') {
    const entry = Object.entries(headers).find(
      ([key]) => key.toLowerCase() === 'retry-after'
    );
    rawValue = entry?.[1];
  }

  const seconds = Number(rawValue);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(30_000, Math.floor(seconds * 1_000));
  }

  const retryAt = Date.parse(String(rawValue ?? ''));
  return Number.isFinite(retryAt)
    ? Math.min(30_000, Math.max(0, retryAt - Date.now()))
    : null;
}

function getPushRetryDelayMs(error: unknown, attempt: number) {
  const defaultDelay = RETRY_DELAYS_MS[attempt - 1] ?? 1_000;
  return getPushStatusCode(error) === 429
    ? getRetryAfterDelayMs(error) ?? defaultDelay
    : defaultDelay;
}

function getPushTopic(campaignId: string) {
  return createHash('sha256')
    .update(campaignId)
    .digest('base64url')
    .slice(0, 32);
}

function normalizeTrackingText(value: unknown, fallback: string, maxLength: number) {
  const normalized = String(value ?? '').trim();
  return (normalized || fallback).slice(0, maxLength);
}

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
    const releaseResults = options.engagementLocalDateKey
      ? await Promise.allSettled(
          subscriptions.flatMap((subscription) =>
            isGuestPushSubscription(subscription)
              ? [
                  releaseGuestPushEngagementClaim({
                    guestDeviceId: subscription.guestDeviceId,
                    localDateKey: options.engagementLocalDateKey!,
                  }),
                ]
              : []
          )
        )
      : [];
    return {
      sent: 0,
      failed: 0,
      disabled: 0,
      retried: 0,
      persistenceFailed: releaseResults.filter(
        (result) => result.status === 'rejected'
      ).length,
      unavailable: true,
    };
  }

  const deliver = async (
    subscription: PushSubscriptionForDelivery | GuestPushSubscriptionForDelivery
  ): Promise<SingleDeliveryResult> => {
    const deliveryId = randomUUID();
    const campaignId = normalizeTrackingText(
      payload.data?.campaignId,
      payload.tag || 'push-notification',
      180
    );
    const notificationKind = normalizeTrackingText(
      options.engagementKind ?? payload.data?.kind ?? payload.data?.type,
      'general',
      80
    );
    const tracking = { deliveryId, campaignId, notificationKind };
    const ownerType: PushDeliveryOwnerType = isGuestPushSubscription(subscription)
      ? 'guest'
      : 'user';
    const ownerId = isGuestPushSubscription(subscription)
      ? subscription.guestDeviceId
      : subscription.userId;
    const auditOwner = {
      ownerType,
      ownerId,
      deviceId: subscription.deviceId,
      endpoint: subscription.endpoint,
      source: options.deliverySource ?? ('general' as const),
    };
    let pendingAuditFailed = false;
    const pendingAudit = Promise.resolve()
      .then(() =>
        recordPushDeliveryPending({
          tracking,
          ...auditOwner,
        })
      )
      .catch(() => {
        pendingAuditFailed = true;
        return null;
      });
    const trackingToken = isGuestPushSubscription(subscription)
      ? createPushTrackingToken({
          ownerType: 'guest',
          ownerId: subscription.guestDeviceId,
          engagementLocalDateKey: options.engagementLocalDateKey,
          ...tracking,
        })
      : createPushTrackingToken({
          ownerType: 'user',
          ownerId: subscription.userId,
          endpoint: subscription.endpoint,
          engagementLocalDateKey: options.engagementLocalDateKey,
          ...tracking,
        });
    const serializedPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/logos/pwa-192.png',
      badge: payload.badge || '/logos/favicon-48.png',
      tag: payload.tag || 'read-al-quran-notification',
      renotify: Boolean(payload.renotify),
      url: payload.url || '/',
      data: {
        url: payload.url || '/',
        ...(payload.data || {}),
        ...(trackingToken ? { trackingToken } : {}),
      },
    });

    let transportError: unknown = null;
    let attempts = 0;
    while (attempts < MAX_PUSH_ATTEMPTS) {
      attempts += 1;
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
            topic: getPushTopic(campaignId),
          }
        );
        transportError = null;
        break;
      } catch (error) {
        transportError = error;
        const statusCode = getPushStatusCode(error);
        if (!isRetryablePushFailure(statusCode) || attempts >= MAX_PUSH_ATTEMPTS) {
          break;
        }
        await waitForRetry(getPushRetryDelayMs(error, attempts));
      }
    }

    const retried = Math.max(0, attempts - 1);
    if (!transportError) {
      const sentAt = new Date().toISOString();
      const persistenceTasks: Promise<unknown>[] = [
        pendingAudit,
        isGuestPushSubscription(subscription)
          ? markGuestPushSubscriptionSent(
              subscription.endpoint,
              sentAt,
              options.engagementKind,
              tracking,
              Boolean(trackingToken)
            )
          : markPushSubscriptionSent(
              subscription.userId,
              subscription.endpoint,
              sentAt,
              options.engagementKind,
              tracking,
              Boolean(trackingToken)
            ),
        recordPushDeliveryAccepted({
          deliveryId,
          acceptedAt: sentAt,
          campaignId,
          notificationKind,
          ...auditOwner,
        }),
      ];
      if (
        isGuestPushSubscription(subscription) &&
        options.engagementLocalDateKey
      ) {
        persistenceTasks.push(
          completeGuestPushEngagementClaim({
            guestDeviceId: subscription.guestDeviceId,
            localDateKey: options.engagementLocalDateKey,
            completedAt: sentAt,
          })
        );
      }
      const persistenceResults = await Promise.allSettled(persistenceTasks);
      return {
        sent: 1,
        failed: 0,
        disabled: 0,
        retried,
        persistenceFailed:
          persistenceResults.filter((result) => result.status === 'rejected')
            .length + (pendingAuditFailed ? 1 : 0),
      };
    }

    const statusCode = getPushStatusCode(transportError);
    const shouldDisable = statusCode === 404 || statusCode === 410;
    const persistenceTasks: Promise<unknown>[] = [
      pendingAudit,
      isGuestPushSubscription(subscription)
        ? markGuestPushSubscriptionFailure(
            subscription.endpoint,
            shouldDisable,
            deliveryId
          )
        : markPushSubscriptionFailure(
            subscription.userId,
            subscription.endpoint,
            shouldDisable,
            deliveryId
          ),
      recordPushDeliveryFailed({
        deliveryId,
        failedAt: new Date().toISOString(),
        statusCode,
        errorMessage: getPushErrorMessage(transportError),
        disabled: shouldDisable,
        campaignId,
        notificationKind,
        ...auditOwner,
      }),
    ];
    // Keep a failed scheduled guest claim leased. A status-0/timeout response
    // is ambiguous and the provider may already have accepted the push. The
    // claim can be completed by a signed display/open receipt, or reclaimed
    // after its bounded stale window when the delivery truly failed.
    if (
      isGuestPushSubscription(subscription) &&
      options.engagementLocalDateKey &&
      !shouldDisable
    ) {
      const retryDelay = isRetryablePushFailure(statusCode)
        ? TRANSIENT_SCHEDULE_RETRY_DELAY_MS
        : TERMINAL_SCHEDULE_RETRY_DELAY_MS;
      persistenceTasks.push(
        deferGuestPushEngagementClaim({
          guestDeviceId: subscription.guestDeviceId,
          localDateKey: options.engagementLocalDateKey,
          retryAfter: new Date(Date.now() + retryDelay).toISOString(),
        })
      );
    }
    const persistenceResults = await Promise.allSettled(persistenceTasks);
    return {
      sent: 0,
      failed: 1,
      disabled: shouldDisable ? 1 : 0,
      retried,
      persistenceFailed:
        persistenceResults.filter((result) => result.status === 'rejected')
          .length + (pendingAuditFailed ? 1 : 0),
    };
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
      retried: summary.retried + result.retried,
      persistenceFailed: summary.persistenceFailed + result.persistenceFailed,
    }),
    { sent: 0, failed: 0, disabled: 0, retried: 0, persistenceFailed: 0 }
  );

  return {
    ...totals,
    unavailable: false,
  };
}
