import { NextRequest, NextResponse } from 'next/server';

import {
  dashboardCorsHeaders,
  hasDashboardApiAccess,
  isAllowedDashboardOrigin,
} from '@/lib/auth/dashboard-access';
import { getCurrentAdminUser } from '@/lib/auth/current-user';
import { listGuestPushDevicesForAdmin } from '@/lib/push/guest-push-store';
import { listRecentPushDeliveryAuditsForOwners } from '@/lib/push/push-delivery-audit-store';

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
    const guestDevices = await listGuestPushDevicesForAdmin();
    const deliveryAudit = await listRecentPushDeliveryAuditsForOwners(
      guestDevices.map((device) => ({
        ownerType: 'guest' as const,
        ownerId: device.id,
      })),
      { limitPerOwner: 10 }
    ).then(
      (deliveries) => ({ available: true, deliveries }),
      () => ({ available: false, deliveries: [] })
    );
    const recentDeliveries = deliveryAudit.deliveries;
    const deliveriesByOwnerId = new Map<string, typeof recentDeliveries>();
    for (const delivery of recentDeliveries) {
      if (!delivery.ownerId) continue;
      const ownerDeliveries = deliveriesByOwnerId.get(delivery.ownerId) ?? [];
      ownerDeliveries.push(delivery);
      deliveriesByOwnerId.set(delivery.ownerId, ownerDeliveries);
    }
    const devices = guestDevices.map((device) => ({
      ...device,
      recentDeliveries: deliveriesByOwnerId.get(device.id) ?? [],
    }));
    const summary = guestDevices.reduce(
      (result, device) => {
        if (device.enabled) {
          result.enabledDevices += 1;
        } else {
          result.disabledDevices += 1;
        }
        if (device.lastSentAt) {
          result.reachedDevices += 1;
        }
        if (device.failureCount > 0) {
          result.devicesWithFailures += 1;
        }
        return result;
      },
      {
        enabledDevices: 0,
        disabledDevices: 0,
        reachedDevices: 0,
        devicesWithFailures: 0,
      }
    );

    return NextResponse.json(
      { devices, summary, deliveryAuditAvailable: deliveryAudit.available },
      { headers: dashboardCorsHeaders(request) }
    );
  } catch {
    return NextResponse.json(
      { message: 'Unable to load guest notification devices right now.' },
      { status: 500, headers: dashboardCorsHeaders(request) }
    );
  }
}
