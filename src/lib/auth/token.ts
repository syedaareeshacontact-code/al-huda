import { createHash } from 'node:crypto';

export const AUTH_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export function hashAuthToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
