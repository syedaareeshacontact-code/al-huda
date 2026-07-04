import { cookies } from 'next/headers';

import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';
import { findUserById, isAdminEmail } from '@/lib/auth/users-store';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (!token) {
    return null;
  }

  const session = verifySessionToken(token);
  if (!session?.id) {
    return null;
  }

  return findUserById(session.id);
}

export async function getCurrentAdminUser() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    return null;
  }

  return user;
}
