import { NextResponse } from 'next/server';

import {
  consumeAuthToken,
  deleteAuthTokensForUser,
} from '@/lib/auth/auth-token-store';
import { attachSessionCookie } from '@/lib/auth/session';
import {
  markUserEmailVerified,
  markUserLogin,
} from '@/lib/auth/users-store';
import { getPublicSiteUrl } from '@/lib/email/auth-emails';

function verificationRedirect(status: 'success' | 'invalid' | 'error') {
  return new URL(`/auth/verified?status=${status}`, getPublicSiteUrl());
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')?.trim() ?? '';
  if (!token) {
    return NextResponse.redirect(verificationRedirect('invalid'));
  }

  try {
    const authToken = await consumeAuthToken(token, 'verify-email');
    if (!authToken) {
      return NextResponse.redirect(verificationRedirect('invalid'));
    }

    const verifiedUser = await markUserEmailVerified(authToken.userId);
    if (!verifiedUser) {
      return NextResponse.redirect(verificationRedirect('invalid'));
    }

    await deleteAuthTokensForUser(verifiedUser.id, 'verify-email');
    const loggedInUser = (await markUserLogin(verifiedUser.id)) ?? verifiedUser;
    const response = NextResponse.redirect(verificationRedirect('success'));
    response.headers.set('Cache-Control', 'private, no-store');
    attachSessionCookie(response, {
      id: loggedInUser.id,
      name: loggedInUser.name,
      email: loggedInUser.email,
      imageUrl: loggedInUser.imageUrl,
      sessionVersion: loggedInUser.sessionVersion,
    });
    return response;
  } catch (error) {
    console.error('[Verify email] Unable to verify token.', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.redirect(verificationRedirect('error'));
  }
}
