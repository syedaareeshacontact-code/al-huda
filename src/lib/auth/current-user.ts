import { cookies } from 'next/headers';

import {
  getDashboardSessionCookieName,
  getSessionCookieName,
  verifySessionToken,
} from '@/lib/auth/session';
import { findUserById, isAdminEmail } from '@/lib/auth/users-store';

export async function getCurrentUser(options?: { includeDashboardSession?: boolean }) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(getSessionCookieName())?.value ||
    (options?.includeDashboardSession
      ? cookieStore.get(getDashboardSessionCookieName())?.value
      : undefined);

  if (!token) {
    return null;
  }

  const session = verifySessionToken(token);
  if (!session?.id) {
    return null;
  }

  return findUserById(session.id);
}

export async function getCurrentAdminUser(options?: { includeDashboardSession?: boolean }) {
  const user = await getCurrentUser(options);
  if (!user || !isAdminEmail(user.email)) {
    return null;
  }

  return user;
}
