import { NextResponse } from 'next/server';

import { verifyPassword } from '@/lib/auth/password';
import { checkAuthRateLimit, getRequestIp } from '@/lib/auth/rate-limit';
import { signInSchema } from '@/lib/auth/schemas';
import { attachSessionCookie } from '@/lib/auth/session';
import {
  findUserByEmail,
  getLoginLockSeconds,
  markUserLogin,
  recordFailedLoginAttempt,
} from '@/lib/auth/users-store';

const DUMMY_PASSWORD_SALT = '00000000000000000000000000000000';
const DUMMY_PASSWORD_HASH = '0'.repeat(128);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: parsed.error.issues[0]?.message ?? 'Invalid signin payload.',
        },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const rateLimit = await checkAuthRateLimit({
      action: 'signin',
      identifier: `${getRequestIp(request)}:${email}`,
      limit: 12,
      windowSeconds: 15 * 60,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'Too many sign-in attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      await verifyPassword(
        parsed.data.password,
        DUMMY_PASSWORD_SALT,
        DUMMY_PASSWORD_HASH
      );
      return NextResponse.json(
        { message: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const lockSeconds = getLoginLockSeconds(user);
    if (lockSeconds > 0) {
      return NextResponse.json(
        { message: 'Too many failed attempts. Please try again in a few minutes.' },
        {
          status: 429,
          headers: { 'Retry-After': String(lockSeconds) },
        }
      );
    }

    const isValid = await verifyPassword(
      parsed.data.password,
      user.passwordSalt,
      user.passwordHash
    );

    if (!isValid) {
      const failedAttempt = await recordFailedLoginAttempt(user);
      return NextResponse.json(
        {
          message: failedAttempt.locked
            ? 'Too many failed attempts. Please try again in 15 minutes.'
            : 'Invalid email or password.',
        },
        {
          status: failedAttempt.locked ? 429 : 401,
          ...(failedAttempt.locked
            ? { headers: { 'Retry-After': String(failedAttempt.retryAfterSeconds) } }
            : {}),
        }
      );
    }

    if (!user.emailVerifiedAt) {
      return NextResponse.json(
        {
          code: 'EMAIL_NOT_VERIFIED',
          email: user.email,
          message: 'Please verify your email address before signing in.',
        },
        { status: 403 }
      );
    }

    const updatedUser = await markUserLogin(user.id);
    const authUser = updatedUser ?? user;
    const response = NextResponse.json(
      {
        user: {
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
          imageUrl: authUser.imageUrl,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );

    attachSessionCookie(response, {
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      imageUrl: authUser.imageUrl,
      sessionVersion: authUser.sessionVersion,
    });

    return response;
  } catch (error) {
    console.error('[Signin] Unable to complete sign-in.', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { message: 'Unable to sign in right now.' },
      { status: 500 }
    );
  }
}
