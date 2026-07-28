import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  dashboardCorsHeaders,
  hasDashboardApiAccess,
  isAllowedDashboardOrigin,
  isTrustedDashboardMutation,
} from '@/lib/auth/dashboard-access';
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
  targetUserIds: z.array(z.string().trim().min(1)).max(500).optional(),
});

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: dashboardCorsHeaders(request, 'POST, OPTIONS'),
  });
}

export async function POST(request: NextRequest) {
  const serviceAccess = hasDashboardApiAccess(request);

  if (!serviceAccess && !isTrustedDashboardMutation(request)) {
    return NextResponse.json(
      { message: 'Origin is not allowed.' },
      { status: 403, headers: dashboardCorsHeaders(request, 'POST, OPTIONS') }
    );
  }

  const admin = serviceAccess
    ? { id: 'dashboard-service' }
    : await getCurrentAdminUser({
        includeDashboardSession: isAllowedDashboardOrigin(request),
      });
  if (!admin) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401, headers: dashboardCorsHeaders(request, 'POST, OPTIONS') }
    );
  }

  const parsed = broadcastSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid notification payload.' },
      { status: 400, headers: dashboardCorsHeaders(request, 'POST, OPTIONS') }
    );
  }

  const allUsers = await listUsersForAdmin();
  const targetUserIds = Array.from(new Set(parsed.data.targetUserIds ?? []));
  const targetUserIdSet = new Set(targetUserIds);
  const users =
    targetUserIds.length > 0
      ? allUsers.filter((user) => targetUserIdSet.has(user.id))
      : allUsers;

  if (parsed.data.targetUserIds && targetUserIds.length === 0) {
    return NextResponse.json(
      { message: 'Select at least one reader for a targeted notification.' },
      { status: 400, headers: dashboardCorsHeaders(request, 'POST, OPTIONS') }
    );
  }

  if (targetUserIds.length > 0 && users.length === 0) {
    return NextResponse.json(
      { message: 'Selected readers were not found.' },
      { status: 400, headers: dashboardCorsHeaders(request, 'POST, OPTIONS') }
    );
  }

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
          scope: targetUserIds.length > 0 ? 'selected' : 'all',
        },
      });

      if (notification) {
        inAppCreated += 1;
      }
    })
  );

  const pushSubscriptions = parsed.data.push
    ? (await listEnabledPushSubscriptions()).filter(
        (subscription) => targetUserIds.length === 0 || targetUserIdSet.has(subscription.userId)
      )
    : [];
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

  return NextResponse.json(
    {
      ok: true,
      users: users.length,
      totalUsers: allUsers.length,
      targetUserIds,
      inAppCreated,
      pushTargets: pushSubscriptions.length,
      push: pushResult,
    },
    { headers: dashboardCorsHeaders(request, 'POST, OPTIONS') }
  );
}
