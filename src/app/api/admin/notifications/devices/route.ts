import { NextRequest, NextResponse } from 'next/server';

import {
  dashboardCorsHeaders,
  hasDashboardApiAccess,
  isAllowedDashboardOrigin,
} from '@/lib/auth/dashboard-access';
import { getCurrentAdminUser } from '@/lib/auth/current-user';
import { listUserPushDevicesForAdmin } from '@/lib/auth/users-store';
import {
  listGuestPushDevicesForAdmin,
} from '@/lib/push/guest-push-store';
import {
  dedupeAdminNotificationDevices,
  type AdminNotificationDevice,
} from '@/lib/admin-notification-devices';

export const dynamic = 'force-dynamic';

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: dashboardCorsHeaders(request),
  });
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
    const [guestDevices, userDevices] = await Promise.all([
      listGuestPushDevicesForAdmin(),
      listUserPushDevicesForAdmin(),
    ]);
    const normalizedGuestDevices = guestDevices.map((device) => ({
      ...device,
      ownerType: 'guest' as const,
    }));
    const devices: AdminNotificationDevice[] = dedupeAdminNotificationDevices([
      ...userDevices,
      ...normalizedGuestDevices,
    ]);
    const dedupedUserDevices = devices.filter(
      (device) => device.ownerType === 'user'
    );
    const dedupedGuestDevices = devices.filter(
      (device) => device.ownerType === 'guest'
    );
    const summary = devices.reduce(
      (result, device) => {
        result.enabledDevices += 1;
        if (device.ownerType === 'user') {
          result.signedInDevices += 1;
        } else {
          result.guestDevices += 1;
        }
        if (device.lastSentAt) {
          result.reachedDevices += 1;
        }
        if (device.failureCount > 0) {
          result.devicesWithFailures += 1;
        }
        result.notificationsSent += device.notificationSentCount;
        result.notificationVisits += device.notificationVisitCount;
        result.siteVisits += device.siteVisitCount;
        if (device.notificationVisitCount > 0) {
          result.devicesWithVisits += 1;
        }
        if (device.siteVisitCount > 0) {
          result.devicesWithSiteVisits += 1;
        }
        if (
          device.lastNotificationVisitAt &&
          (!result.lastNotificationVisitAt ||
            device.lastNotificationVisitAt.localeCompare(
              result.lastNotificationVisitAt
            ) > 0)
        ) {
          result.lastNotificationVisitAt = device.lastNotificationVisitAt;
        }
        if (
          device.lastSiteVisitAt &&
          (!result.lastSiteVisitAt ||
            device.lastSiteVisitAt.localeCompare(result.lastSiteVisitAt) > 0)
        ) {
          result.lastSiteVisitAt = device.lastSiteVisitAt;
        }
        return result;
      },
      {
        enabledDevices: 0,
        signedInDevices: 0,
        guestDevices: 0,
        reachedDevices: 0,
        devicesWithFailures: 0,
        notificationsSent: 0,
        notificationVisits: 0,
        siteVisits: 0,
        devicesWithVisits: 0,
        devicesWithSiteVisits: 0,
        lastNotificationVisitAt: null as string | null,
        lastSiteVisitAt: null as string | null,
      }
    );
    const summaryWithRate = {
      ...summary,
      notificationOpenRate:
        summary.notificationsSent > 0
          ? Number(
              ((summary.notificationVisits / summary.notificationsSent) * 100).toFixed(1)
            )
          : 0,
    };

    return NextResponse.json(
      {
        devices,
        guestDevices: dedupedGuestDevices,
        userDevices: dedupedUserDevices,
        summary: summaryWithRate,
      },
      { headers: dashboardCorsHeaders(request) }
    );
  } catch {
    return NextResponse.json(
      { message: 'Unable to load notification devices right now.' },
      { status: 500, headers: dashboardCorsHeaders(request) }
    );
  }
}
