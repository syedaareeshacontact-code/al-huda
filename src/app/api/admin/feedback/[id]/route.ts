import { NextRequest, NextResponse } from 'next/server';

import {
  dashboardCorsHeaders,
  isAllowedDashboardOrigin,
  isTrustedDashboardMutation,
} from '@/lib/auth/dashboard-access';
import { getCurrentAdminUser } from '@/lib/auth/current-user';
import { deleteFeedbackForAdmin } from '@/lib/feedback-store';

interface FeedbackRouteContext {
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

export async function DELETE(request: NextRequest, context: FeedbackRouteContext) {
  try {
    if (!isTrustedDashboardMutation(request)) {
      return NextResponse.json(
        { message: 'Origin is not allowed.' },
        { status: 403, headers: dashboardCorsHeaders(request, 'DELETE, OPTIONS') }
      );
    }

    const adminUser = await getCurrentAdminUser({
      includeDashboardSession: isAllowedDashboardOrigin(request),
    });
    if (!adminUser) {
      return NextResponse.json(
        { message: 'Forbidden' },
        { status: 403, headers: dashboardCorsHeaders(request, 'DELETE, OPTIONS') }
      );
    }

    const { id } = await context.params;
    const feedbackId = id.trim();
    if (!feedbackId) {
      return NextResponse.json(
        { message: 'Feedback id is required.' },
        { status: 400, headers: dashboardCorsHeaders(request, 'DELETE, OPTIONS') }
      );
    }

    const deleted = await deleteFeedbackForAdmin(feedbackId);
    if (!deleted) {
      return NextResponse.json(
        { message: 'Feedback not found.' },
        { status: 404, headers: dashboardCorsHeaders(request, 'DELETE, OPTIONS') }
      );
    }

    return NextResponse.json({ ok: true }, { headers: dashboardCorsHeaders(request, 'DELETE, OPTIONS') });
  } catch {
    return NextResponse.json(
      { message: 'Unable to delete feedback right now.' },
      { status: 500, headers: dashboardCorsHeaders(request, 'DELETE, OPTIONS') }
    );
  }
}
