import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  ensureUserPushNotificationAccepted,
  recordUserPushNotificationDisplayed,
  recordUserPushNotificationVisit,
} from '@/lib/auth/users-store';
import {
  completeGuestPushEngagementClaim,
  ensureGuestPushNotificationAccepted,
  markGuestPushNotificationDisplayed,
  recordGuestPushNotificationVisit,
} from '@/lib/push/guest-push-store';
import { recordPushDeliveryOpened } from '@/lib/push/push-delivery-audit-store';
import { verifyPushTrackingToken } from '@/lib/push/push-open-tracking';

export const dynamic = 'force-dynamic';

const openSchema = z.object({
  token: z.string().trim().min(20).max(4096),
});

export async function POST(request: Request) {
  const parsed = openSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid tracking payload.' }, { status: 400 });
  }

  const claims = verifyPushTrackingToken(parsed.data.token);
  if (!claims) {
    return NextResponse.json({ message: 'Invalid or expired tracking token.' }, { status: 401 });
  }

  const visitedAt = new Date().toISOString();
  const trackingInput = {
    deliveryId: claims.deliveryId,
    campaignId: claims.campaignId,
    notificationKind: claims.notificationKind,
  };
  let audited = false;
  try {
    await recordPushDeliveryOpened({
      claims,
      openedAt: visitedAt,
    });
    audited = true;
  } catch {
    // The bounded aggregate receipt below remains an independent fallback.
  }

  const openAggregate =
    claims.ownerType === 'guest'
      ? recordGuestPushNotificationVisit({
          guestDeviceId: claims.ownerId,
          ...trackingInput,
          visitedAt,
          countTracked: claims.version === 2,
        })
      : recordUserPushNotificationVisit({
          userId: claims.ownerId,
          endpointHash: claims.endpointHash,
          ...trackingInput,
          visitedAt,
          countTracked: claims.version === 2,
        });
  const aggregateTasks: Promise<boolean>[] = [];
  let openAggregateIndex = 0;

  // An open proves that the notification was displayed. Version 2 counters
  // share one measurement window, so backfill a missing display receipt too.
  if (claims.version === 2) {
    aggregateTasks.push(
      claims.ownerType === 'guest'
        ? ensureGuestPushNotificationAccepted({
            guestDeviceId: claims.ownerId,
            ...trackingInput,
            acceptedAt: visitedAt,
            engagementLocalDateKey: claims.engagementLocalDateKey,
          })
        : ensureUserPushNotificationAccepted({
            userId: claims.ownerId,
            endpointHash: claims.endpointHash,
            ...trackingInput,
            acceptedAt: visitedAt,
            engagementLocalDateKey: claims.engagementLocalDateKey,
          })
    );
    openAggregateIndex = 1;
  }
  aggregateTasks.push(openAggregate);

  if (claims.version === 2) {
    aggregateTasks.push(
      claims.ownerType === 'guest'
        ? markGuestPushNotificationDisplayed({
            guestDeviceId: claims.ownerId,
            ...trackingInput,
            displayedAt: visitedAt,
          })
        : recordUserPushNotificationDisplayed({
            userId: claims.ownerId,
            endpointHash: claims.endpointHash,
            ...trackingInput,
            displayedAt: visitedAt,
          })
    );
    if (claims.ownerType === 'guest' && claims.engagementLocalDateKey) {
      aggregateTasks.push(
        completeGuestPushEngagementClaim({
          guestDeviceId: claims.ownerId,
          localDateKey: claims.engagementLocalDateKey,
          completedAt: visitedAt,
        })
      );
    }
  }

  const aggregateResults = await Promise.allSettled(aggregateTasks);
  const aggregateFailed = aggregateResults.some(
    (result) => result.status === 'rejected'
  );
  const openAggregateResult = aggregateResults[openAggregateIndex];
  const recorded =
    openAggregateResult?.status === 'fulfilled'
      ? openAggregateResult.value
      : false;

  if (!audited || aggregateFailed) {
    return NextResponse.json(
      { message: 'Unable to record the notification open.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      audited,
      recorded,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
