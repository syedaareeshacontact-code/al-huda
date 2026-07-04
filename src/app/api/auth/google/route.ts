import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

import { attachSessionCookie } from '@/lib/auth/session';
import { createUser, findUserByEmail, markUserLogin } from '@/lib/auth/users-store';
import { hashPassword } from '@/lib/auth/password';
import { verifyGoogleIdToken } from '@/lib/auth/google';

export async function POST(request: Request) {
  console.log('[Google Auth API] POST request received at', new Date().toISOString());
  
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  console.log('[Google Auth API] GOOGLE_CLIENT_ID from env:', googleClientId);
  
  if (!googleClientId) {
    console.error('[Google Auth API] GOOGLE_CLIENT_ID not configured');
    return NextResponse.json(
      { message: 'Google sign-in is not configured on the server.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const idToken = String(body?.idToken ?? '').trim();
    console.log('[Google Auth API] Received idToken. Length:', idToken.length, 'Has dots:', idToken.split('.').length - 1);

    if (!idToken) {
      console.warn('[Google Auth API] Missing idToken in request body');
      return NextResponse.json(
        { message: 'Missing Google ID token.' },
        { status: 400 }
      );
    }

    let payload;
    try {
      console.log('[Google Auth API] Starting token verification...');
      payload = await verifyGoogleIdToken(idToken, googleClientId);
      console.log('[Google Auth API] ✅ Token verified successfully. Email:', payload.email);
    } catch (err) {
      console.error('[Google Auth API] ❌ Token verification failed:', (err as Error).message);
      // Attempt to decode token header for debugging (do not log full token)
      try {
        const parts = idToken.split('.');
        const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
        const aud = (() => {
          try {
            const p = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
            return p.aud;
          } catch {
            return undefined;
          }
        })();
        console.error('[Google Auth API] [DEBUG] Token header:', JSON.stringify(header));
        console.error('[Google Auth API] [DEBUG] Token aud:', aud);
        console.error('[Google Auth API] [DEBUG] Expected audience:', googleClientId);
        console.error('[Google Auth API] [DEBUG] Error message:', (err as Error).message);
      } catch (decodeErr) {
        console.error('[Google Auth API] Could not decode token for debugging.', decodeErr);
      }

      const msg = (err as Error).message ?? 'Google ID token verification failed.';
      return NextResponse.json({ message: msg }, { status: 401 });
    }
    if (!payload.email || !payload.email_verified) {
      console.warn('[Google Auth API] Email missing or not verified. email:', payload.email, 'email_verified:', payload.email_verified);
      return NextResponse.json(
        { message: 'Google account verification failed.' },
        { status: 401 }
      );
    }
    console.log('[Google Auth API] Email verified:', payload.email);

    const email = payload.email.trim().toLowerCase();
    const name = String(payload.name || email.split('@')[0]).trim() || 'Google User';
    const imageUrl = String(payload.picture ?? '').trim() || null;
    console.log('[Google Auth API] Normalized email:', email, 'name:', name);

    console.log('[Google Auth API] Searching for existing user with email:', email);
    const existingUser = await findUserByEmail(email);
    console.log('[Google Auth API] Existing user found:', !!existingUser, existingUser ? 'id=' + existingUser.id : '');
    
    let user = existingUser;

    if (existingUser) {
      console.log('[Google Auth API] Marking user login for existing user:', existingUser.id);
      user = await markUserLogin(existingUser.id, { name, imageUrl });
      console.log('[Google Auth API] ✅ User login marked.');
    } else {
      console.log('[Google Auth API] Creating new user for email:', email);
      const randomSecret = randomBytes(32).toString('hex');
      const digest = await hashPassword(randomSecret);
      console.log('[Google Auth API] Password hash generated. Hash length:', digest.hash.length);
      
      user = await createUser({
        name,
        email,
        imageUrl,
        passwordHash: digest.hash,
        passwordSalt: digest.salt,
      });
      console.log('[Google Auth API] ✅ New user created. id=', user?.id);
    }

    if (!user) {
      console.error('[Google Auth API] ❌ User is null after creation/login attempt');
      return NextResponse.json(
        { message: 'Unable to sign in with Google right now.' },
        { status: 500 }
      );
    }
    console.log('[Google Auth API] User ready. id=', user.id, 'email=', user.email);

    console.log('[Google Auth API] Attaching session cookie for user:', user.id);
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          imageUrl: user.imageUrl,
        },
      },
      { status: existingUser ? 200 : 201 }
    );

    attachSessionCookie(response, {
      id: user.id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
    });
    console.log('[Google Auth API] ✅ SUCCESS. Response:', existingUser ? '200 (login)' : '201 (signup)');

    return response;
  } catch (error) {
    console.error('[Google Auth API] ❌ UNHANDLED ERROR:', error);
    const errorObject = error as { message?: string };
    return NextResponse.json(
      { message: errorObject.message ?? 'Unable to complete Google sign-in.' },
      { status: 500 }
    );
  }
}
