import { NextResponse } from 'next/server';

import { AuthTokenCooldownError } from '@/lib/auth/auth-token-store';
import {
  AUTH_EMAIL_COOLDOWN_SECONDS,
  issueAndSendVerificationEmail,
} from '@/lib/auth/email-actions';
import { hashPassword } from '@/lib/auth/password';
import { checkAuthRateLimit, getRequestIp } from '@/lib/auth/rate-limit';
import { signUpSchema } from '@/lib/auth/schemas';
import { createUser, findUserByEmail } from '@/lib/auth/users-store';

const verificationResponse = (email: string, status = 201) =>
  NextResponse.json(
    {
      message: 'Check your email to verify and activate your account.',
      email,
      verificationRequired: true,
    },
    {
      status,
      headers: { 'Cache-Control': 'private, no-store' },
    }
  );

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: parsed.error.issues[0]?.message ?? 'Invalid signup payload.',
        },
        { status: 400 }
      );
    }

    const rateLimit = await checkAuthRateLimit({
      action: 'signup',
      identifier: getRequestIp(request),
      limit: 6,
      windowSeconds: 60 * 60,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'Too many signup attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      if (!existingUser.emailVerifiedAt) {
        try {
          await issueAndSendVerificationEmail(existingUser, {
            cooldownSeconds: AUTH_EMAIL_COOLDOWN_SECONDS,
          });
        } catch (error) {
          if (!(error instanceof AuthTokenCooldownError)) {
            throw error;
          }
        }
        return verificationResponse(email, 202);
      }

      return NextResponse.json(
        { message: 'This email is already registered. Please sign in instead.' },
        { status: 409 }
      );
    }

    const digest = await hashPassword(parsed.data.password);
    const user = await createUser({
      name: parsed.data.name,
      email,
      passwordHash: digest.hash,
      passwordSalt: digest.salt,
      emailVerifiedAt: null,
      recordInitialLogin: false,
    });

    try {
      await issueAndSendVerificationEmail(user);
    } catch (error) {
      console.error('[Signup] Account created but verification email failed.', {
        userId: user.id,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      return NextResponse.json(
        {
          code: 'EMAIL_DELIVERY_FAILED',
          email,
          verificationRequired: true,
          message:
            'Your account was created, but the verification email could not be sent. Please use Resend verification.',
        },
        { status: 503 }
      );
    }

    return verificationResponse(email);
  } catch (error) {
    const errorObject = error as { message?: string };

    if (errorObject.message === 'EMAIL_ALREADY_EXISTS') {
      return NextResponse.json(
        { message: 'This email is already registered. Please sign in instead.' },
        { status: 409 }
      );
    }

    console.error('[Signup] Unable to complete signup.', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { message: 'Unable to complete signup right now.' },
      { status: 500 }
    );
  }
}
