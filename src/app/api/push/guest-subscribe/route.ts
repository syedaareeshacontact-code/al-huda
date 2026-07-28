import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/current-user';
import {
  findUserByPushSubscriptionEndpoint,
  removeUserPushSubscription,
  upsertUserPushSubscription,
} from '@/lib/auth/users-store';
import {
  removeGuestPushSubscription,
  upsertGuestPushSubscription,
} from '@/lib/push/guest-push-store';
import { isWebPushConfigured } from '@/lib/push/web-push';

const subscriptionSchema = z.object({
  deviceId: z.string().uuid(),
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().trim().min(12).max(512),
    auth: z.string().trim().min(8).max(256),
  }),
});

const removeSchema = z.object({
  deviceId: z.string().uuid(),
  endpoint: z.string().url().max(2048).optional(),
});

function forbiddenResponse() {
  return NextResponse.json({ message: 'Origin is not allowed.' }, { status: 403 });
}

function isSameOriginMutation(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) {
    return true;
  }

  if (request.headers.get('sec-fetch-site') === 'same-origin') {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const requestOrigin = new URL(request.url).origin;
    const requestHosts = [
      request.headers.get('host'),
      request.headers.get('x-forwarded-host'),
    ].filter(Boolean);

    return (
      originUrl.origin === requestOrigin ||
      requestHosts.includes(originUrl.host)
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return forbiddenResponse();
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json({ message: 'Web push is not configured.' }, { status: 503 });
  }

  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid push subscription.' }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (user) {
    const subscription = await upsertUserPushSubscription(user.id, {
      endpoint: parsed.data.endpoint,
      keys: parsed.data.keys,
      userAgent: request.headers.get('user-agent'),
      quranReminderEnabled: true,
      intervalMinutes: 2,
    });

    if (!subscription) {
      return NextResponse.json(
        { message: 'Unable to save this push subscription.' },
        { status: 400 }
      );
    }

    await removeGuestPushSubscription({
      deviceId: parsed.data.deviceId,
      endpoint: parsed.data.endpoint,
    });

    return NextResponse.json({ ok: true, owner: 'user' });
  }

  const existingUserOwner = await findUserByPushSubscriptionEndpoint(
    parsed.data.endpoint
  );
  if (existingUserOwner) {
    await removeGuestPushSubscription({
      deviceId: parsed.data.deviceId,
      endpoint: parsed.data.endpoint,
    });
    return NextResponse.json({ ok: true, owner: 'user' });
  }

  const subscription = await upsertGuestPushSubscription({
    deviceId: parsed.data.deviceId,
    endpoint: parsed.data.endpoint,
    keys: parsed.data.keys,
    userAgent: request.headers.get('user-agent'),
  });

  if (!subscription) {
    return NextResponse.json(
      { message: 'Unable to save this guest device.' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    owner: 'guest',
    device: {
      id: subscription.id,
      deviceId: subscription.deviceId,
      enabled: subscription.enabled,
      lastSeenAt: subscription.lastSeenAt,
    },
  });
}

export async function DELETE(request: Request) {
  if (!isSameOriginMutation(request)) {
    return forbiddenResponse();
  }

  const parsed = removeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid guest device.' }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (user && parsed.data.endpoint) {
    await removeUserPushSubscription(user.id, parsed.data.endpoint);
  }

  await removeGuestPushSubscription({
    deviceId: parsed.data.deviceId,
    endpoint: parsed.data.endpoint,
  });

  return NextResponse.json({ ok: true });
}
