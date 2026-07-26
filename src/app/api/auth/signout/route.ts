import { NextRequest, NextResponse } from 'next/server';

import { dashboardCorsHeaders, isTrustedDashboardMutation } from '@/lib/auth/dashboard-access';
import { clearSessionCookie } from '@/lib/auth/session';

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: dashboardCorsHeaders(request, 'POST, OPTIONS'),
  });
}

export async function POST(request: NextRequest) {
  if (!isTrustedDashboardMutation(request)) {
    return NextResponse.json({ message: 'Origin is not allowed.' }, { status: 403 });
  }

  const response = NextResponse.json(
    { ok: true },
    { headers: dashboardCorsHeaders(request, 'POST, OPTIONS') }
  );
  clearSessionCookie(response);
  return response;
}
