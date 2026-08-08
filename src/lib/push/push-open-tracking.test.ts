import { createHmac } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createPushTrackingToken,
  hashPushEndpoint,
  verifyPushTrackingToken,
} from './push-open-tracking';

const previousSecret = process.env.PUSH_TRACKING_SECRET;
const testSecret = 'test-push-tracking-secret';

function signClaims(claims: Record<string, unknown>) {
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', testSecret)
    .update(encodedClaims)
    .digest('base64url');
  return `${encodedClaims}.${signature}`;
}

describe('push open tracking tokens', () => {
  beforeEach(() => {
    process.env.PUSH_TRACKING_SECRET = testSecret;
  });

  afterEach(() => {
    if (previousSecret === undefined) {
      delete process.env.PUSH_TRACKING_SECRET;
    } else {
      process.env.PUSH_TRACKING_SECRET = previousSecret;
    }
  });

  it('signs and verifies a guest delivery', () => {
    const token = createPushTrackingToken({
      ownerType: 'guest',
      ownerId: 'guest-device-id',
      deliveryId: 'delivery-id',
      campaignId: 'campaign-id',
      notificationKind: 'hadith',
    });

    expect(token).toBeTruthy();
    expect(verifyPushTrackingToken(token!)).toMatchObject({
      version: 2,
      ownerType: 'guest',
      ownerId: 'guest-device-id',
      deliveryId: 'delivery-id',
    });
  });

  it('signs the scheduled guest date so a receipt can complete its claim', () => {
    const token = createPushTrackingToken({
      ownerType: 'guest',
      ownerId: 'guest-device-id',
      deliveryId: 'delivery-id',
      campaignId: 'campaign-id',
      notificationKind: 'hadith',
      engagementLocalDateKey: '2026-08-08',
    });

    expect(verifyPushTrackingToken(token!)).toMatchObject({
      version: 2,
      engagementLocalDateKey: '2026-08-08',
    });
  });

  it('accepts a legacy version 1 token inside the compatibility window', () => {
    const now = Date.now();
    const token = signClaims({
      version: 1,
      ownerType: 'guest',
      ownerId: 'guest-device-id',
      deliveryId: 'delivery-id',
      campaignId: 'campaign-id',
      notificationKind: 'hadith',
      issuedAt: now - 6 * 24 * 60 * 60 * 1000,
    });

    expect(verifyPushTrackingToken(token, now)).toMatchObject({ version: 1 });
  });

  it('rejects a token outside the 7 day replay window', () => {
    const now = Date.now();
    const token = signClaims({
      version: 2,
      ownerType: 'guest',
      ownerId: 'guest-device-id',
      deliveryId: 'delivery-id',
      campaignId: 'campaign-id',
      notificationKind: 'hadith',
      issuedAt: now - 8 * 24 * 60 * 60 * 1000,
    });

    expect(verifyPushTrackingToken(token, now)).toBeNull();
  });

  it('keeps a signed-in endpoint out of the token payload', () => {
    const endpoint = 'https://push.example.test/private-device-endpoint';
    const token = createPushTrackingToken({
      ownerType: 'user',
      ownerId: 'user-id',
      endpoint,
      deliveryId: 'delivery-id',
      campaignId: 'campaign-id',
      notificationKind: 'quran',
    });
    const claims = verifyPushTrackingToken(token!);

    expect(token).not.toContain(endpoint);
    expect(claims).toMatchObject({
      ownerType: 'user',
      endpointHash: hashPushEndpoint(endpoint),
    });
  });

  it('rejects a modified token', () => {
    const token = createPushTrackingToken({
      ownerType: 'guest',
      ownerId: 'guest-device-id',
      deliveryId: 'delivery-id',
      campaignId: 'campaign-id',
      notificationKind: 'hadith',
    });

    expect(verifyPushTrackingToken(`${token}changed`)).toBeNull();
  });
});
