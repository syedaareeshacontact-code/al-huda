import { NextRequest, NextResponse } from 'next/server';

import { dashboardCorsHeaders, isAllowedDashboardOrigin } from '@/lib/auth/dashboard-access';
import { verifyPassword } from '@/lib/auth/password';
import { signInSchema } from '@/lib/auth/schemas';
import { attachSessionCookie } from '@/lib/auth/session';
import { findUserByEmail, isAdminEmail, markUserLogin } from '@/lib/auth/users-store';

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: dashboardCorsHeaders(request, 'POST, OPTIONS'),
  });
}

export async function POST(request: NextRequest) {
  if (!isAllowedDashboardOrigin(request)) {
    return NextResponse.json({ message: 'Dashboard origin is not allowed.' }, { status: 403 });
  }

  try {
    const parsed = signInSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Invalid signin payload.' },
        { status: 400, headers: dashboardCorsHeaders(request, 'POST, OPTIONS') }
      );
    }

    const user = await findUserByEmail(parsed.data.email.trim().toLowerCase());
    const passwordIsValid = user
      ? await verifyPassword(parsed.data.password, user.passwordSalt, user.passwordHash)
      : false;

    if (!user || !passwordIsValid || !isAdminEmail(user.email)) {
      return NextResponse.json(
        { message: 'Invalid email or password.' },
        { status: 401, headers: dashboardCorsHeaders(request, 'POST, OPTIONS') }
      );
    }

    const authenticatedUser = (await markUserLogin(user.id)) ?? user;
    const response = NextResponse.json(
      {
        user: {
          id: authenticatedUser.id,
          name: authenticatedUser.name,
          email: authenticatedUser.email,
          imageUrl: authenticatedUser.imageUrl,
          isAdmin: true,
        },
      },
      { headers: dashboardCorsHeaders(request, 'POST, OPTIONS') }
    );

    attachSessionCookie(response, authenticatedUser);
    return response;
  } catch {
    return NextResponse.json(
      { message: 'Unable to sign in right now.' },
      { status: 500, headers: dashboardCorsHeaders(request, 'POST, OPTIONS') }
    );
  }
}
