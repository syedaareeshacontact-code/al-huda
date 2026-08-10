import { NextResponse } from 'next/server';

import { AuthTokenCooldownError } from '@/lib/auth/auth-token-store';
import {
  AUTH_EMAIL_COOLDOWN_SECONDS,
  issueAndSendVerificationEmail,
} from '@/lib/auth/email-actions';
import { checkAuthRateLimit, getRequestIp } from '@/lib/auth/rate-limit';
import { emailActionSchema } from '@/lib/auth/schemas';
import { findUserByEmail } from '@/lib/auth/users-store';

const genericMessage =
  'If an unverified account exists for this email, a verification link has been sent.';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = emailActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Enter a valid email address.' },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const rateLimit = await checkAuthRateLimit({
      action: 'resend-verification',
      identifier: `${getRequestIp(request)}:${email}`,
      limit: 4,
      windowSeconds: 15 * 60,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'Please wait before requesting another verification email.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const user = await findUserByEmail(email);
    if (!user || user.emailVerifiedAt) {
      return NextResponse.json(
        { message: genericMessage },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    try {
      await issueAndSendVerificationEmail(user, {
        cooldownSeconds: AUTH_EMAIL_COOLDOWN_SECONDS,
      });
    } catch (error) {
      if (error instanceof AuthTokenCooldownError) {
        return NextResponse.json(
          { message: 'A verification email was sent recently. Please check your inbox.' },
          {
            status: 429,
            headers: { 'Retry-After': String(error.retryAfterSeconds) },
          }
        );
      }
      throw error;
    }

    return NextResponse.json(
      { message: genericMessage },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[Resend verification] Unable to send email.', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { message: 'Unable to send a verification email right now.' },
      { status: 503 }
    );
  }
}
