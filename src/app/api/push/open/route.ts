import { NextResponse } from 'next/server';
import { z } from 'zod';

import { recordUserPushNotificationVisit } from '@/lib/auth/users-store';
import { recordGuestPushNotificationVisit } from '@/lib/push/guest-push-store';
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
  const commonInput = {
    deliveryId: claims.deliveryId,
    campaignId: claims.campaignId,
    notificationKind: claims.notificationKind,
    visitedAt,
  };
  const recorded =
    claims.ownerType === 'guest'
      ? await recordGuestPushNotificationVisit({
          guestDeviceId: claims.ownerId,
          ...commonInput,
        })
      : await recordUserPushNotificationVisit({
          userId: claims.ownerId,
          endpointHash: claims.endpointHash,
          ...commonInput,
        });

  return NextResponse.json(
    { ok: true, recorded },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
