import { NextRequest, NextResponse } from 'next/server';

import {
  dashboardCorsHeaders,
  hasDashboardApiAccess,
  isAllowedDashboardOrigin,
} from '@/lib/auth/dashboard-access';
import { getCurrentAdminUser } from '@/lib/auth/current-user';
import { listUsersForAdmin } from '@/lib/auth/users-store';
import { listFeedbackForAdmin } from '@/lib/feedback-store';

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: dashboardCorsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  try {
    const adminUser = hasDashboardApiAccess(request)
      ? { id: 'dashboard-service' }
      : await getCurrentAdminUser({
          includeDashboardSession: isAllowedDashboardOrigin(request),
        });
    if (!adminUser) {
      return NextResponse.json(
        { message: 'Forbidden' },
        { status: 403, headers: dashboardCorsHeaders(request) }
      );
    }

    const [users, feedback] = await Promise.all([
      listUsersForAdmin(),
      listFeedbackForAdmin(),
    ]);
    const summary = users.reduce(
      (acc, user) => {
        acc.totalUsers += 1;
        acc.totalSessionSeconds += user.totalSessionSeconds;
        acc.totalAudioSeconds += user.totalAudioSeconds;
        return acc;
      },
      {
        totalUsers: 0,
        totalSessionSeconds: 0,
        totalAudioSeconds: 0,
      }
    );

    return NextResponse.json({ users, feedback, summary }, { headers: dashboardCorsHeaders(request) });
  } catch {
    return NextResponse.json(
      { message: 'Unable to load users right now.' },
      { status: 500, headers: dashboardCorsHeaders(request) }
    );
  }
}
