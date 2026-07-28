import { NextRequest, NextResponse } from 'next/server';

import {
  dashboardCorsHeaders,
  hasDashboardApiAccess,
  isAllowedDashboardOrigin,
} from '@/lib/auth/dashboard-access';
import { getCurrentAdminUser } from '@/lib/auth/current-user';
import { listGuestPushDevicesForAdmin } from '@/lib/push/guest-push-store';

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
    const devices = await listGuestPushDevicesForAdmin();
    const summary = devices.reduce(
      (result, device) => {
        result.enabledDevices += 1;
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
        reachedDevices: 0,
        devicesWithFailures: 0,
      }
    );

    return NextResponse.json(
      { devices, summary },
      { headers: dashboardCorsHeaders(request) }
    );
  } catch {
    return NextResponse.json(
      { message: 'Unable to load guest notification devices right now.' },
      { status: 500, headers: dashboardCorsHeaders(request) }
    );
  }
}
