import { NextResponse } from 'next/server';

import {
  consumeAuthToken,
  deleteAuthTokensForUser,
} from '@/lib/auth/auth-token-store';
import { hashPassword } from '@/lib/auth/password';
import { checkAuthRateLimit, getRequestIp } from '@/lib/auth/rate-limit';
import { resetPasswordSchema } from '@/lib/auth/schemas';
import { attachSessionCookie } from '@/lib/auth/session';
import { markUserLogin, updateUserPassword } from '@/lib/auth/users-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.issues[0]?.message ?? 'Invalid password reset request.',
        },
        { status: 400 }
      );
    }

    const rateLimit = await checkAuthRateLimit({
      action: 'reset-password',
      identifier: getRequestIp(request),
      limit: 8,
      windowSeconds: 15 * 60,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'Too many reset attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    // Hash first so a temporary hashing failure cannot consume a valid token.
    const digest = await hashPassword(parsed.data.password);
    const authToken = await consumeAuthToken(
      parsed.data.token,
      'reset-password'
    );
    if (!authToken) {
      return NextResponse.json(
        {
          code: 'RESET_TOKEN_INVALID',
          message: 'This password reset link is invalid or has expired.',
        },
        { status: 400 }
      );
    }

    const updatedUser = await updateUserPassword(authToken.userId, digest);
    if (!updatedUser) {
      return NextResponse.json(
        { message: 'This password reset link is no longer valid.' },
        { status: 400 }
      );
    }

    await deleteAuthTokensForUser(updatedUser.id, 'reset-password');
    const loggedInUser = (await markUserLogin(updatedUser.id)) ?? updatedUser;
    const response = NextResponse.json(
      {
        message: 'Your password has been updated successfully.',
        user: {
          id: loggedInUser.id,
          name: loggedInUser.name,
          email: loggedInUser.email,
          imageUrl: loggedInUser.imageUrl,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );

    attachSessionCookie(response, {
      id: loggedInUser.id,
      name: loggedInUser.name,
      email: loggedInUser.email,
      imageUrl: loggedInUser.imageUrl,
      sessionVersion: loggedInUser.sessionVersion,
    });
    return response;
  } catch (error) {
    console.error('[Reset password] Unable to update password.', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { message: 'Unable to reset your password right now.' },
      { status: 500 }
    );
  }
}
