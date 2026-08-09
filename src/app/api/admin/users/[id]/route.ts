import { NextRequest, NextResponse } from 'next/server';

import {
  dashboardCorsHeaders,
  hasDashboardApiAccess,
  isAllowedDashboardOrigin,
  isTrustedDashboardMutation,
} from '@/lib/auth/dashboard-access';
import { getCurrentAdminUser } from '@/lib/auth/current-user';
import { deleteUserForAdmin } from '@/lib/auth/users-store';

interface UserRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: dashboardCorsHeaders(request, 'DELETE, OPTIONS'),
  });
}

export async function DELETE(request: NextRequest, context: UserRouteContext) {
  try {
    const serviceAccess = hasDashboardApiAccess(request);

    if (!serviceAccess && !isTrustedDashboardMutation(request)) {
      return NextResponse.json(
        { message: 'Origin is not allowed.' },
        { status: 403, headers: dashboardCorsHeaders(request, 'DELETE, OPTIONS') }
      );
    }

    const adminUser = serviceAccess
      ? { id: 'dashboard-service' }
      : await getCurrentAdminUser({
          includeDashboardSession: isAllowedDashboardOrigin(request),
        });
    if (!adminUser) {
      return NextResponse.json(
        { message: 'Forbidden' },
        { status: 403, headers: dashboardCorsHeaders(request, 'DELETE, OPTIONS') }
      );
    }

    const { id } = await context.params;
    const userId = id.trim();
    if (!userId) {
      return NextResponse.json(
        { message: 'User id is required.' },
        { status: 400, headers: dashboardCorsHeaders(request, 'DELETE, OPTIONS') }
      );
    }

    const deleted = await deleteUserForAdmin(userId);
    if (!deleted) {
      return NextResponse.json(
        { message: 'User not found.' },
        { status: 404, headers: dashboardCorsHeaders(request, 'DELETE, OPTIONS') }
      );
    }

    return NextResponse.json(
      { ok: true },
      { headers: dashboardCorsHeaders(request, 'DELETE, OPTIONS') }
    );
  } catch {
    return NextResponse.json(
      { message: 'Unable to delete this user right now.' },
      { status: 500, headers: dashboardCorsHeaders(request, 'DELETE, OPTIONS') }
    );
  }
}
