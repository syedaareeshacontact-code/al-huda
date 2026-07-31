import { NextRequest, NextResponse } from 'next/server';

import {
  dashboardCorsHeaders,
  hasDashboardApiAccess,
  isAllowedDashboardOrigin,
} from '@/lib/auth/dashboard-access';
import { getCurrentAdminUser } from '@/lib/auth/current-user';
import {
  ADMIN_EMAIL,
  listUserPushDevicesForAdmin,
  listUsersForAdmin,
} from '@/lib/auth/users-store';
import {
  dedupeAdminNotificationDevices,
  type AdminNotificationDevice,
} from '@/lib/admin-notification-devices';
import { listGuestPushDevicesForAdmin } from '@/lib/push/guest-push-store';

export const dynamic = 'force-dynamic';

interface AdminActivityNotification {
  id: string;
  type: 'user-login' | 'push-enabled';
  title: string;
  message: string;
  createdAt: string;
  href: string;
  ownerType: 'user' | 'guest';
  userAgent: string | null;
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: dashboardCorsHeaders(request),
  });
}

function buildPushEnabledNotification(
  device: AdminNotificationDevice
): AdminActivityNotification {
  if (device.ownerType === 'user') {
    return {
      id: `push-enabled:${device.id}:${device.createdAt}`,
      type: 'push-enabled',
      title: 'Signed-in notifications enabled',
      message: `${device.userName} (${device.userEmail}) enabled website notifications.`,
      createdAt: device.createdAt,
      href: '/operations/notification-devices',
      ownerType: 'user',
      userAgent: device.userAgent,
    };
  }

  const guestLabel = String(device.deviceId || device.id)
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase();

  return {
    id: `push-enabled:${device.id}:${device.createdAt}`,
    type: 'push-enabled',
    title: 'Guest notifications enabled',
    message: `Guest ${guestLabel || 'DEVICE'} enabled website notifications.`,
    createdAt: device.createdAt,
    href: '/operations/notification-devices',
    ownerType: 'guest',
    userAgent: device.userAgent,
  };
}

export async function GET(request: NextRequest) {
  const admin = hasDashboardApiAccess(request)
    ? { id: 'dashboard-service' }
    : await getCurrentAdminUser({
        includeDashboardSession: isAllowedDashboardOrigin(request),
      });

  if (!admin) {
    return NextResponse.json(
      { message: 'Forbidden' },
      { status: 403, headers: dashboardCorsHeaders(request) }
    );
  }

  try {
    const [users, guestDevices, userDevices] = await Promise.all([
      listUsersForAdmin(),
      listGuestPushDevicesForAdmin(),
      listUserPushDevicesForAdmin(),
    ]);
    const devices = dedupeAdminNotificationDevices([
      ...userDevices,
      ...guestDevices.map((device) => ({
        ...device,
        ownerType: 'guest' as const,
      })),
    ]);
    const notifications: AdminActivityNotification[] = [
      ...users
        .filter(
          (user) =>
            user.email !== ADMIN_EMAIL &&
            Boolean(user.lastLoginAt)
        )
        .map((user) => ({
          id: `user-login:${user.id}:${user.lastLoginAt}`,
          type: 'user-login' as const,
          title: user.loginCount <= 1 ? 'New reader signed in' : 'Reader signed in',
          message:
            user.loginCount <= 1
              ? `${user.name} (${user.email}) joined ReadAlQuran.`
              : `${user.name} (${user.email}) signed in to ReadAlQuran.`,
          createdAt: user.lastLoginAt!,
          href: '/operations/users',
          ownerType: 'user' as const,
          userAgent: null,
        })),
      ...devices.map(buildPushEnabledNotification),
    ]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 50);

    return NextResponse.json(
      { notifications },
      { headers: dashboardCorsHeaders(request) }
    );
  } catch {
    return NextResponse.json(
      { message: 'Unable to load dashboard notifications right now.' },
      { status: 500, headers: dashboardCorsHeaders(request) }
    );
  }
}
