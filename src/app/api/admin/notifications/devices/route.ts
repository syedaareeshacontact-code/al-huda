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
import { listRecentPushDeliveryAuditsForOwners } from '@/lib/push/push-delivery-audit-store';
import {
  reconcileNotificationDeviceOwnership,
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
    const notificationDevices: AdminNotificationDevice[] =
      reconcileNotificationDeviceOwnership(guestDevices, userDevices);
    const [siteVisits, deliveryAudit] = await Promise.all([
      listSiteDeviceVisitsForAdmin(
        notificationDevices
          .map((device) => device.deviceId)
          .filter((deviceId): deviceId is string => Boolean(deviceId))
      ),
      listRecentPushDeliveryAuditsForOwners(
        [
          ...guestDevices.map((device) => ({
            ownerType: 'guest' as const,
            ownerId: device.id,
          })),
          ...Array.from(new Set(userDevices.map((device) => device.userId))).map(
            (userId) => ({ ownerType: 'user' as const, ownerId: userId })
          ),
        ],
        { limitPerOwner: 10, includeEndpointHash: true }
      ).then(
        (deliveries) => ({ available: true, deliveries }),
        () => ({ available: false, deliveries: [] })
      ),
    ]);
    const recentDeliveries = deliveryAudit.deliveries;
    const visitsByDeviceId = new Map(
      siteVisits.map((visit) => [visit.deviceId, visit])
    );
    const guestDeviceIdByOwnerId = new Map(
      guestDevices.map((device) => [device.id, device.deviceId])
    );
    const deliveriesByDeviceId = new Map<
      string,
      typeof recentDeliveries
    >();
    const deliveriesByEndpointHash = new Map<
      string,
      typeof recentDeliveries
    >();
    for (const delivery of recentDeliveries) {
      const deviceId =
        delivery.deviceId ||
        (delivery.ownerType === 'guest' && delivery.ownerId
          ? guestDeviceIdByOwnerId.get(delivery.ownerId)
          : undefined);
      if (deviceId) {
        const deviceDeliveries = deliveriesByDeviceId.get(deviceId) ?? [];
        deviceDeliveries.push(delivery);
        deliveriesByDeviceId.set(deviceId, deviceDeliveries);
      }
      if (delivery.ownerType === 'user' && delivery.endpointHash) {
        const endpointDeliveries =
          deliveriesByEndpointHash.get(delivery.endpointHash) ?? [];
        endpointDeliveries.push(delivery);
        deliveriesByEndpointHash.set(
          delivery.endpointHash,
          endpointDeliveries
        );
      }
    }
    const devices = notificationDevices.map((device) => {
      const visit = device.deviceId
        ? visitsByDeviceId.get(device.deviceId)
        : undefined;
      const lastTotalVisitAt = [visit?.lastVisitAt, device.lastSiteVisitAt]
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null;
      const deviceDeliveries = (
        device.deviceId
          ? deliveriesByDeviceId.get(device.deviceId) ?? []
          : device.ownerType === 'user'
            ? deliveriesByEndpointHash.get(device.endpointHash) ?? []
            : []
      )
        .slice(0, 10)
        .map((delivery) => {
          const { endpointHash: _endpointHash, ...safeDelivery } = delivery;
          return safeDelivery;
        });
      const publicDevice =
        device.ownerType === 'user'
          ? (({ endpointHash: _endpointHash, ...safeDevice }) => safeDevice)(
              device
            )
          : device;
      return {
        ...publicDevice,
        totalVisitCount: Math.max(
          visit?.totalVisitCount ?? 0,
          device.siteVisitCount ?? 0
        ),
        lastTotalVisitAt,
        recentDeliveries: deviceDeliveries,
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
        if (device.enabled) {
          result.enabledDevices += 1;
        } else {
          result.disabledDevices += 1;
        }
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
        result.notificationsTrackedSent += device.notificationTrackedSentCount;
        result.notificationsDisplayed += device.notificationDisplayedCount;
        result.notificationVisits += device.notificationVisitCount;
        result.notificationTrackedVisits += device.notificationTrackedVisitCount;
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
        disabledDevices: 0,
        signedInDevices: 0,
        guestDevices: 0,
        reachedDevices: 0,
        devicesWithFailures: 0,
        notificationsSent: 0,
        notificationsTrackedSent: 0,
        notificationsDisplayed: 0,
        notificationVisits: 0,
        notificationTrackedVisits: 0,
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
      notificationDisplayRate:
        summary.notificationsTrackedSent > 0
          ? Number(
              ((summary.notificationsDisplayed /
                summary.notificationsTrackedSent) *
                100).toFixed(1)
            )
          : 0,
      notificationDisplayedOpenRate:
        summary.notificationsDisplayed > 0
          ? Number(
              ((summary.notificationTrackedVisits /
                summary.notificationsDisplayed) *
                100).toFixed(1)
            )
          : 0,
    };

    return NextResponse.json(
      {
        devices,
        guestDevices: dedupedGuestDevices,
        userDevices: dedupedUserDevices,
        summary: summaryWithRate,
        deliveryAuditAvailable: deliveryAudit.available,
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
