import { NextRequest, NextResponse } from 'next/server';
import { dashboardCorsHeaders, isAllowedDashboardOrigin } from '@/lib/auth/dashboard-access';
import { getCurrentUser } from '@/lib/auth/current-user';
import { isAdminEmail } from '@/lib/auth/users-store';

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: dashboardCorsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser({
    includeDashboardSession: isAllowedDashboardOrigin(request),
  });
  if (!user) {
    return NextResponse.json(
      { user: null },
      {
        headers: {
          'Cache-Control': 'private, no-store',
          ...dashboardCorsHeaders(request),
        },
      }
    );
  }

  return NextResponse.json(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl,
        isAdmin: isAdminEmail(user.email),
      },
      settings: user.settings,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store',
        ...dashboardCorsHeaders(request),
      },
    }
  );
}
