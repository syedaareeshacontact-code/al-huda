import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/current-user';
import {
  removeUserPushSubscription,
  upsertUserPushSubscription,
} from '@/lib/auth/users-store';
import { isWebPushConfigured } from '@/lib/push/web-push';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().trim().min(12),
    auth: z.string().trim().min(8),
  }),
  quranReminderEnabled: z.boolean().optional(),
  intervalMinutes: z.number().int().min(2).max(1440).optional(),
});

const removeSchema = z.object({
  endpoint: z.string().url(),
});

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

  await removeUserPushSubscription(user.id, parsed.data.endpoint);
  return NextResponse.json({ ok: true });
}
