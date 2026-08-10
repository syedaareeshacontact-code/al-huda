import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password';
import { resetPasswordSchema, signUpSchema } from './schemas';
import { createSessionToken, verifySessionToken } from './session';
import { hashAuthToken } from './token';

describe('authentication security primitives', () => {
  it('hashes and verifies passwords without accepting a different password', async () => {
    const digest = await hashPassword('correct horse battery staple');

    await expect(
      verifyPassword('correct horse battery staple', digest.salt, digest.hash)
    ).resolves.toBe(true);
    await expect(
      verifyPassword('different password', digest.salt, digest.hash)
    ).resolves.toBe(false);
  });

  it('rejects tampered session tokens and retains the session version', () => {
    const token = createSessionToken({
      id: 'user-1',
      name: 'Reader',
      email: 'reader@example.com',
      sessionVersion: 3,
    });
    const verified = verifySessionToken(token);

    expect(verified?.sessionVersion).toBe(3);
    const [payload, signature] = token.split('.');
    const tamperedSignature = `${signature.slice(0, -1)}${signature.endsWith('a') ? 'b' : 'a'}`;
    expect(verifySessionToken(`${payload}.${tamperedSignature}`)).toBeNull();
  });

  it('stores only deterministic SHA-256 token hashes', () => {
    const token = 'a'.repeat(64);
    expect(hashAuthToken(token)).toHaveLength(64);
    expect(hashAuthToken(token)).toBe(hashAuthToken(token));
    expect(hashAuthToken(token)).not.toBe(hashAuthToken('b'.repeat(64)));
  });

  it('validates account and reset payload boundaries', () => {
    expect(
      signUpSchema.safeParse({
        name: 'Reader',
        email: 'reader@example.com',
        password: 'secure-passphrase',
      }).success
    ).toBe(true);
    expect(
      signUpSchema.safeParse({
        name: 'R',
        email: 'not-an-email',
        password: 'short',
      }).success
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({
        token: 'a'.repeat(64),
        password: 'new-secure-password',
      }).success
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({
        token: 'invalid-token',
        password: 'new-secure-password',
      }).success
    ).toBe(false);
  });
});
