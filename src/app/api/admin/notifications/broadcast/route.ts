import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentAdminUser } from '@/lib/auth/current-user';
import {
  createUserNotification,
  listEnabledPushSubscriptions,
  listUsersForAdmin,
} from '@/lib/auth/users-store';
import { sendPushNotificationToSubscriptions } from '@/lib/push/send-push-notification';
import type { NotificationType } from '@/types/notifications';

export const dynamic = 'force-dynamic';

const broadcastSchema = z.object({
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(5).max(420),
  href: z.string().trim().startsWith('/').max(240).optional(),
  type: z
    .enum(['prayer', 'quran', 'bookmark', 'audio', 'system', 'islamic'])
    .default('quran'),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  push: z.boolean().default(true),
});

export async function POST(request: Request) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const parsed = broadcastSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid notification payload.' },
      { status: 400 }
    );
  }

  const users = await listUsersForAdmin();
  let inAppCreated = 0;

  await Promise.all(
    users.map(async (user) => {
      const notification = await createUserNotification(user.id, {
        type: parsed.data.type as NotificationType,
        priority: parsed.data.priority,
        title: parsed.data.title,
        message: parsed.data.message,
        href: parsed.data.href ?? '/',
        metadata: {
          broadcast: true,
          adminId: admin.id,
        },
      });

      if (notification) {
        inAppCreated += 1;
      }
    })
  );

  const pushSubscriptions = parsed.data.push ? await listEnabledPushSubscriptions() : [];
  const pushResult = parsed.data.push
    ? await sendPushNotificationToSubscriptions(pushSubscriptions, {
        title: parsed.data.title,
        body: parsed.data.message,
        url: parsed.data.href ?? '/',
        tag: `admin-broadcast-${Date.now()}`,
        urgency: parsed.data.priority === 'high' ? 'high' : 'normal',
        data: {
          kind: 'admin-broadcast',
          type: parsed.data.type,
        },
      })
    : {
        sent: 0,
        failed: 0,
        disabled: 0,
        unavailable: false,
      };

  return NextResponse.json({
    ok: true,
    users: users.length,
    inAppCreated,
    pushTargets: pushSubscriptions.length,
    push: pushResult,
  });
}
