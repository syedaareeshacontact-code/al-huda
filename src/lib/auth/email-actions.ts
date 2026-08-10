import {
  issueAuthToken,
  type AuthTokenPurpose,
} from '@/lib/auth/auth-token-store';
import type { StoredUser } from '@/lib/auth/users-store';
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '@/lib/email/auth-emails';

const VERIFICATION_TTL_SECONDS = 24 * 60 * 60;
const PASSWORD_RESET_TTL_SECONDS = 60 * 60;
export const AUTH_EMAIL_COOLDOWN_SECONDS = 60;

async function issueTokenForUser(input: {
  user: StoredUser;
  purpose: AuthTokenPurpose;
  ttlSeconds: number;
  cooldownSeconds?: number;
}) {
  return issueAuthToken({
    userId: input.user.id,
    email: input.user.email,
    purpose: input.purpose,
    ttlSeconds: input.ttlSeconds,
    cooldownSeconds: input.cooldownSeconds,
  });
}

export async function issueAndSendVerificationEmail(
  user: StoredUser,
  options?: { cooldownSeconds?: number }
) {
  const { token } = await issueTokenForUser({
    user,
    purpose: 'verify-email',
    ttlSeconds: VERIFICATION_TTL_SECONDS,
    cooldownSeconds: options?.cooldownSeconds,
  });

  await sendVerificationEmail({
    name: user.name,
    email: user.email,
    token,
  });
}

export async function issueAndSendPasswordResetEmail(
  user: StoredUser,
  options?: { cooldownSeconds?: number }
) {
  const { token } = await issueTokenForUser({
    user,
    purpose: 'reset-password',
    ttlSeconds: PASSWORD_RESET_TTL_SECONDS,
    cooldownSeconds: options?.cooldownSeconds,
  });

  await sendPasswordResetEmail({
    name: user.name,
    email: user.email,
    token,
  });
}
