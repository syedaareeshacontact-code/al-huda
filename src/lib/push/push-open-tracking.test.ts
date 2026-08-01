import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createPushTrackingToken,
  hashPushEndpoint,
  verifyPushTrackingToken,
} from './push-open-tracking';

const previousSecret = process.env.PUSH_TRACKING_SECRET;

describe('push open tracking tokens', () => {
  beforeEach(() => {
    process.env.PUSH_TRACKING_SECRET = 'test-push-tracking-secret';
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
      ownerType: 'guest',
      ownerId: 'guest-device-id',
      deliveryId: 'delivery-id',
    });
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
