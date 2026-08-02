import { NextRequest, NextResponse } from 'next/server';

import {
  dashboardCorsHeaders,
  hasDashboardApiAccess,
  isAllowedDashboardOrigin,
} from '@/lib/auth/dashboard-access';
import { getCurrentAdminUser } from '@/lib/auth/current-user';
import { listSiteDeviceVisitsForAdmin } from '@/lib/engagement/site-device-store';
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
    const notificationDevices: AdminNotificationDevice[] = dedupeAdminNotificationDevices([
      ...userDevices,
      ...normalizedGuestDevices,
    ]);
    const siteVisits = await listSiteDeviceVisitsForAdmin(
      notificationDevices
        .map((device) => device.deviceId)
        .filter((deviceId): deviceId is string => Boolean(deviceId))
    );
    const visitsByDeviceId = new Map(
      siteVisits.map((visit) => [visit.deviceId, visit])
    );
    const devices = notificationDevices.map((device) => {
      const visit = device.deviceId
        ? visitsByDeviceId.get(device.deviceId)
        : undefined;
      return {
        ...device,
        totalVisitCount: visit?.totalVisitCount ?? 0,
        lastTotalVisitAt: visit?.lastVisitAt ?? null,
      };
    });
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
        result.totalVisits += device.totalVisitCount;
        if (device.notificationVisitCount > 0) {
          result.devicesWithVisits += 1;
        }
        if (device.totalVisitCount > 0) {
          result.devicesWithTotalVisits += 1;
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
          device.lastTotalVisitAt &&
          (!result.lastTotalVisitAt ||
            device.lastTotalVisitAt.localeCompare(result.lastTotalVisitAt) > 0)
        ) {
          result.lastTotalVisitAt = device.lastTotalVisitAt;
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
        totalVisits: 0,
        devicesWithVisits: 0,
        devicesWithTotalVisits: 0,
        lastNotificationVisitAt: null as string | null,
        lastTotalVisitAt: null as string | null,
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
