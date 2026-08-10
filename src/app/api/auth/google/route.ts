import { NextResponse } from 'next/server';

import { verifyGoogleIdToken } from '@/lib/auth/google';
import { attachSessionCookie } from '@/lib/auth/session';
import {
  findOrCreateGoogleUser,
  type UserTrafficSource,
} from '@/lib/auth/users-store';

function normalizeTrafficSource(value: unknown): UserTrafficSource | null {
  return value === 'instagram' ? 'instagram' : null;
}

export async function POST(request: Request) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    return NextResponse.json(
      { message: 'Google sign-in is not configured on the server.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const idToken = String(body?.idToken ?? '').trim();
    const trafficSource = normalizeTrafficSource(body?.source);

    if (!idToken) {
      return NextResponse.json(
        { message: 'Missing Google ID token.' },
        { status: 400 }
      );
    }

    let payload;
    try {
      payload = await verifyGoogleIdToken(idToken, googleClientId);
    } catch (error) {
      console.warn('[Google Auth] Token verification failed.', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      return NextResponse.json(
        { message: 'Google account verification failed.' },
        { status: 401 }
      );
    }

    if (!payload.email || !payload.email_verified) {
      return NextResponse.json(
        { message: 'Google account verification failed.' },
        { status: 401 }
      );
    }

    const email = payload.email.trim().toLowerCase();
    const name = String(payload.name || email.split('@')[0]).trim() || 'Google User';
    const imageUrl = String(payload.picture ?? '').trim() || null;
    const user = await findOrCreateGoogleUser({
      name,
      email,
      imageUrl,
      trafficSource,
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          imageUrl: user.imageUrl,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );

    attachSessionCookie(response, {
      id: user.id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
      sessionVersion: user.sessionVersion,
    });

    return response;
  } catch (error) {
    console.error('[Google Auth] Unable to complete sign-in.', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { message: 'Unable to sign in with Google right now.' },
      { status: 500 }
    );
  }
}
