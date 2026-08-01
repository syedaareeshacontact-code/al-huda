import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/current-user';
import {
  listEnabledPushSubscriptionsForUser,
  removeUserPushSubscription,
  upsertUserPushSubscription,
} from '@/lib/auth/users-store';
import {
  getPushDeviceDetails,
  hasKnownPushDeviceDetails,
  samePushDeviceDetails,
} from '@/lib/push/device-details';
import { isWebPushConfigured } from '@/lib/push/web-push';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().trim().min(12),
    auth: z.string().trim().min(8),
  }),
  timeZone: z.string().trim().min(1).max(80).optional(),
  contentPreference: z.enum(['hadith', 'quran']).optional(),
  quranReminderEnabled: z.boolean().optional(),
  intervalMinutes: z.number().int().min(2).max(1440).optional(),
});

const removeSchema = z
  .object({
    endpoint: z.string().url().optional(),
    currentBrowser: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.endpoint || value.currentBrowser), {
    message: 'A subscription endpoint or current browser fallback is required.',
  });

async function removeCurrentBrowserSubscriptions(userId: string, userAgent: string | null) {
  const currentDevice = getPushDeviceDetails(userAgent);
  if (!hasKnownPushDeviceDetails(currentDevice)) {
    return 0;
  }

  const subscriptions = await listEnabledPushSubscriptionsForUser(userId);
  const matchingSubscriptions = subscriptions.filter((subscription) =>
    samePushDeviceDetails(
      getPushDeviceDetails(subscription.userAgent),
      currentDevice
    )
  );

  await Promise.all(
    matchingSubscriptions.map((subscription) =>
      removeUserPushSubscription(userId, subscription.endpoint)
    )
  );

  return matchingSubscriptions.length;
}

export async function POST(request: Request) {
  if (!isWebPushConfigured()) {
    return NextResponse.json({ message: 'Web push is not configured.' }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid push subscription.' }, { status: 400 });
  }

  const subscription = await upsertUserPushSubscription(user.id, {
    endpoint: parsed.data.endpoint,
    keys: parsed.data.keys,
    userAgent: request.headers.get('user-agent'),
    timeZone: parsed.data.timeZone,
    contentPreference: parsed.data.contentPreference,
    quranReminderEnabled: parsed.data.quranReminderEnabled ?? true,
    intervalMinutes: parsed.data.intervalMinutes ?? 2,
  });

  if (!subscription) {
    return NextResponse.json({ message: 'Unable to save push subscription.' }, { status: 400 });
  }

  return NextResponse.json({ subscription });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const parsed = removeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid push subscription.' }, { status: 400 });
  }

  if (parsed.data.endpoint) {
    await removeUserPushSubscription(user.id, parsed.data.endpoint);
    return NextResponse.json({ ok: true, removed: 1 });
  }

  const removed = await removeCurrentBrowserSubscriptions(
    user.id,
    request.headers.get('user-agent')
  );
  return NextResponse.json({ ok: true, removed });
}
