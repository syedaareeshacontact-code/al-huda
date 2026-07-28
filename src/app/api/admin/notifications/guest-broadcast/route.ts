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
  listEnabledGuestPushSubscriptions,
} from '@/lib/push/guest-push-store';
import { sendPushNotificationToSubscriptions } from '@/lib/push/send-push-notification';

export const dynamic = 'force-dynamic';

const guestBroadcastSchema = z.object({
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(5).max(420),
  href: z.string().trim().startsWith('/').max(240).optional(),
  type: z
    .enum(['prayer', 'quran', 'bookmark', 'audio', 'system', 'islamic'])
    .default('quran'),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  targetDeviceIds: z.array(z.string().uuid()).max(500).optional(),
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

  const parsed = guestBroadcastSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid notification payload.' },
      { status: 400, headers: dashboardCorsHeaders(request, 'POST, OPTIONS') }
    );
  }

  const allSubscriptions = await listEnabledGuestPushSubscriptions();
  const targetDeviceIds = Array.from(new Set(parsed.data.targetDeviceIds ?? []));
  const targetDeviceIdSet = new Set(targetDeviceIds);
  const subscriptions =
    targetDeviceIds.length > 0
      ? allSubscriptions.filter((subscription) =>
          targetDeviceIdSet.has(subscription.guestDeviceId)
        )
      : allSubscriptions;

  if (parsed.data.targetDeviceIds && targetDeviceIds.length === 0) {
    return NextResponse.json(
      { message: 'Select at least one guest device for targeted delivery.' },
      { status: 400, headers: dashboardCorsHeaders(request, 'POST, OPTIONS') }
    );
  }

  if (targetDeviceIds.length > 0 && subscriptions.length === 0) {
    return NextResponse.json(
      { message: 'Selected guest devices were not found or are no longer enabled.' },
      { status: 400, headers: dashboardCorsHeaders(request, 'POST, OPTIONS') }
    );
  }

  if (subscriptions.length === 0) {
    return NextResponse.json(
      { message: 'No enabled guest notification devices are available.' },
      { status: 400, headers: dashboardCorsHeaders(request, 'POST, OPTIONS') }
    );
  }

  const pushResult = await sendPushNotificationToSubscriptions(subscriptions, {
    title: parsed.data.title,
    body: parsed.data.message,
    url: parsed.data.href ?? '/',
    tag: `admin-guest-broadcast-${Date.now()}`,
    urgency: parsed.data.priority === 'high' ? 'high' : 'normal',
    data: {
      kind: 'admin-guest-broadcast',
      type: parsed.data.type,
      adminId: admin.id,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      devices: subscriptions.length,
      totalDevices: allSubscriptions.length,
      targetDeviceIds,
      pushTargets: subscriptions.length,
      push: pushResult,
    },
    { headers: dashboardCorsHeaders(request, 'POST, OPTIONS') }
  );
}
