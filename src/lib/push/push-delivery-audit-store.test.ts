import { describe, expect, it } from 'vitest';

import {
  advancePushDeliveryAuditStatus,
  hashPushDeliveryEndpoint,
} from './push-delivery-audit-store';

describe('push delivery audit helpers', () => {
  it('keeps delivery status monotonic when receipts arrive out of order', () => {
    expect(advancePushDeliveryAuditStatus('pending', 'failed')).toBe('failed');
    expect(advancePushDeliveryAuditStatus('failed', 'accepted')).toBe('accepted');
    expect(advancePushDeliveryAuditStatus('accepted', 'displayed')).toBe(
      'displayed'
    );
    expect(advancePushDeliveryAuditStatus('displayed', 'accepted')).toBe(
      'displayed'
    );
    expect(advancePushDeliveryAuditStatus('opened', 'failed')).toBe('opened');
  });

  it('hashes endpoints without retaining the endpoint value', () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/private-subscription-token';
    const hash = hashPushDeliveryEndpoint(endpoint);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain('private-subscription-token');
    expect(hashPushDeliveryEndpoint(endpoint)).toBe(hash);
    expect(hashPushDeliveryEndpoint('')).toBeNull();
  });
});
