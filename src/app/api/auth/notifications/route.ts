import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/current-user';
import {
  createUserNotification,
  listEnabledPushSubscriptionsForUser,
  listUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
} from '@/lib/auth/users-store';
import { sendPushNotificationToSubscriptions } from '@/lib/push/send-push-notification';

const notificationSchema = z.object({
  type: z.enum(['prayer', 'quran', 'bookmark', 'audio', 'system', 'islamic']),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(420),
  href: z.string().trim().max(240).nullable().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

const patchSchema = z.union([
  z.object({ action: z.literal('mark-read'), notificationId: z.string().trim().min(1) }),
  z.object({ action: z.literal('mark-all-read') }),
]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const notifications = await listUserNotifications(user.id);
  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((notification) => !notification.readAt).length,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const parsed = notificationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid notification payload' }, { status: 400 });
  }

  const notification = await createUserNotification(user.id, {
    ...parsed.data,
    href: parsed.data.href ?? null,
    metadata: parsed.data.metadata ?? {},
  });

  if (!notification) {
    return NextResponse.json({ message: 'Unable to create notification' }, { status: 400 });
  }

  const subscriptions = await listEnabledPushSubscriptionsForUser(user.id);
  const push = await sendPushNotificationToSubscriptions(
    subscriptions,
    {
      title: notification.title,
      body: notification.message,
      url: notification.href ?? '/',
      tag: `${notification.type}-${notification.id}`,
      urgency: notification.priority === 'high' ? 'high' : 'normal',
      data: {
        kind: 'user-notification',
        notificationId: notification.id,
        type: notification.type,
      },
    },
    { deliverySource: 'user-notification' }
  );

  return NextResponse.json({ notification, pushTargets: subscriptions.length, push }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid notification action' }, { status: 400 });
  }

  const notifications =
    parsed.data.action === 'mark-all-read'
      ? await markAllUserNotificationsRead(user.id)
      : await markUserNotificationRead(user.id, parsed.data.notificationId);

  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((notification) => !notification.readAt).length,
  });
}
