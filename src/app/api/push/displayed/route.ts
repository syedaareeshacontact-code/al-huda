import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  ensureUserPushNotificationAccepted,
  recordUserPushNotificationDisplayed,
} from '@/lib/auth/users-store';
import {
  ensureGuestPushNotificationAccepted,
  completeGuestPushEngagementClaim,
  markGuestPushNotificationDisplayed,
} from '@/lib/push/guest-push-store';
import { recordPushDeliveryDisplayed } from '@/lib/push/push-delivery-audit-store';
import { verifyPushTrackingToken } from '@/lib/push/push-open-tracking';

export const dynamic = 'force-dynamic';

const displayedSchema = z.object({
  token: z.string().trim().min(20).max(4096),
});

export async function POST(request: Request) {
  const parsed = displayedSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid tracking payload.' },
      { status: 400 }
    );
  }

  const claims = verifyPushTrackingToken(parsed.data.token);
  if (!claims) {
    return NextResponse.json(
      { message: 'Invalid or expired tracking token.' },
      { status: 401 }
    );
  }

  const displayedAt = new Date().toISOString();
  const trackingInput = {
    deliveryId: claims.deliveryId,
    campaignId: claims.campaignId,
    notificationKind: claims.notificationKind,
  };
  let audited = false;
  try {
    await recordPushDeliveryDisplayed({
      claims,
      displayedAt,
    });
    audited = true;
  } catch {
    // The bounded aggregate receipt below remains an independent fallback.
  }

  let aggregateFailed = false;
  let recorded = false;
  if (claims.version === 2) {
    const acceptedAt = displayedAt;
    const aggregateResults = await Promise.allSettled([
      claims.ownerType === 'guest'
        ? ensureGuestPushNotificationAccepted({
            guestDeviceId: claims.ownerId,
            ...trackingInput,
            acceptedAt,
            engagementLocalDateKey: claims.engagementLocalDateKey,
          })
        : ensureUserPushNotificationAccepted({
            userId: claims.ownerId,
            endpointHash: claims.endpointHash,
            ...trackingInput,
            acceptedAt,
            engagementLocalDateKey: claims.engagementLocalDateKey,
          }),
      claims.ownerType === 'guest'
        ? markGuestPushNotificationDisplayed({
            guestDeviceId: claims.ownerId,
            ...trackingInput,
            displayedAt,
          })
        : recordUserPushNotificationDisplayed({
            userId: claims.ownerId,
            endpointHash: claims.endpointHash,
            ...trackingInput,
            displayedAt,
          }),
      ...(claims.ownerType === 'guest' && claims.engagementLocalDateKey
        ? [
            completeGuestPushEngagementClaim({
              guestDeviceId: claims.ownerId,
              localDateKey: claims.engagementLocalDateKey,
              completedAt: displayedAt,
            }),
          ]
        : []),
    ]);
    aggregateFailed = aggregateResults.some(
      (result) => result.status === 'rejected'
    );
    recorded =
      aggregateResults[1]?.status === 'fulfilled'
        ? aggregateResults[1].value
        : false;
  }

  if (!audited || aggregateFailed) {
    return NextResponse.json(
      { message: 'Unable to record the display receipt.' },
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
