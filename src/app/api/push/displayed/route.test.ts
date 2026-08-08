import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyPushTrackingToken: vi.fn(),
  recordPushDeliveryDisplayed: vi.fn(),
  ensureGuestPushNotificationAccepted: vi.fn(),
  completeGuestPushEngagementClaim: vi.fn(),
  markGuestPushNotificationDisplayed: vi.fn(),
  ensureUserPushNotificationAccepted: vi.fn(),
  recordUserPushNotificationDisplayed: vi.fn(),
}));

vi.mock('@/lib/push/push-open-tracking', () => ({
  verifyPushTrackingToken: mocks.verifyPushTrackingToken,
}));

vi.mock('@/lib/push/push-delivery-audit-store', () => ({
  recordPushDeliveryDisplayed: mocks.recordPushDeliveryDisplayed,
}));

vi.mock('@/lib/push/guest-push-store', () => ({
  completeGuestPushEngagementClaim: mocks.completeGuestPushEngagementClaim,
  ensureGuestPushNotificationAccepted:
    mocks.ensureGuestPushNotificationAccepted,
  markGuestPushNotificationDisplayed:
    mocks.markGuestPushNotificationDisplayed,
}));

vi.mock('@/lib/auth/users-store', () => ({
  ensureUserPushNotificationAccepted:
    mocks.ensureUserPushNotificationAccepted,
  recordUserPushNotificationDisplayed:
    mocks.recordUserPushNotificationDisplayed,
}));

import { POST } from './route';

function createRequest(body: unknown) {
  return new Request('https://www.readalquran.online/api/push/displayed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/push/displayed', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordPushDeliveryDisplayed.mockResolvedValue({
      audit: { status: 'displayed', acceptedAt: '2026-08-08T04:00:00.000Z' },
      recorded: true,
    });
    mocks.ensureGuestPushNotificationAccepted.mockResolvedValue(false);
    mocks.completeGuestPushEngagementClaim.mockResolvedValue(false);
    mocks.markGuestPushNotificationDisplayed.mockResolvedValue(false);
    mocks.ensureUserPushNotificationAccepted.mockResolvedValue(false);
    mocks.recordUserPushNotificationDisplayed.mockResolvedValue(false);
  });

  it('rejects malformed and invalid tracking tokens without writing', async () => {
    const malformedResponse = await POST(createRequest({ token: 'short' }));
    expect(malformedResponse.status).toBe(400);

    mocks.verifyPushTrackingToken.mockReturnValue(null);
    const invalidResponse = await POST(
      createRequest({ token: 'long-enough-but-invalid-tracking-token' })
    );
    expect(invalidResponse.status).toBe(401);
    expect(mocks.recordPushDeliveryDisplayed).not.toHaveBeenCalled();
    expect(mocks.ensureGuestPushNotificationAccepted).not.toHaveBeenCalled();
    expect(mocks.markGuestPushNotificationDisplayed).not.toHaveBeenCalled();
    expect(mocks.recordUserPushNotificationDisplayed).not.toHaveBeenCalled();
  });

  it('records both the durable audit and guest aggregate counter', async () => {
    const claims = {
      version: 2,
      ownerType: 'guest',
      ownerId: 'guest-device-1',
      deliveryId: 'delivery-1',
      campaignId: 'campaign-1',
      notificationKind: 'islamic',
      engagementLocalDateKey: '2026-08-08',
      issuedAt: Date.now(),
    } as const;
    mocks.verifyPushTrackingToken.mockReturnValue(claims);
    mocks.markGuestPushNotificationDisplayed.mockResolvedValue(true);

    const response = await POST(
      createRequest({ token: 'valid-guest-tracking-token-value' })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      audited: true,
      recorded: true,
    });
    expect(mocks.recordPushDeliveryDisplayed).toHaveBeenCalledWith({
      claims,
      displayedAt: expect.any(String),
    });
    expect(mocks.ensureGuestPushNotificationAccepted).toHaveBeenCalledWith({
      guestDeviceId: claims.ownerId,
      deliveryId: claims.deliveryId,
      campaignId: claims.campaignId,
      notificationKind: claims.notificationKind,
      acceptedAt: expect.any(String),
      engagementLocalDateKey: claims.engagementLocalDateKey,
    });
    expect(mocks.markGuestPushNotificationDisplayed).toHaveBeenCalledWith({
      guestDeviceId: claims.ownerId,
      deliveryId: claims.deliveryId,
      campaignId: claims.campaignId,
      notificationKind: claims.notificationKind,
      displayedAt: expect.any(String),
    });
    expect(mocks.completeGuestPushEngagementClaim).toHaveBeenCalledWith({
      guestDeviceId: claims.ownerId,
      localDateKey: claims.engagementLocalDateKey,
      completedAt: expect.any(String),
    });
  });

  it('uses the signed endpoint hash for a user aggregate counter', async () => {
    const claims = {
      version: 2,
      ownerType: 'user',
      ownerId: 'user-1',
      endpointHash: 'a'.repeat(64),
      deliveryId: 'delivery-2',
      campaignId: 'campaign-2',
      notificationKind: 'quran',
      issuedAt: Date.now(),
    } as const;
    mocks.verifyPushTrackingToken.mockReturnValue(claims);
    mocks.recordUserPushNotificationDisplayed.mockResolvedValue(false);

    const response = await POST(
      createRequest({ token: 'valid-user-tracking-token-value' })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      audited: true,
      recorded: false,
    });
    expect(mocks.recordUserPushNotificationDisplayed).toHaveBeenCalledWith({
      userId: claims.ownerId,
      endpointHash: claims.endpointHash,
      deliveryId: claims.deliveryId,
      campaignId: claims.campaignId,
      notificationKind: claims.notificationKind,
      displayedAt: expect.any(String),
    });
    expect(mocks.ensureUserPushNotificationAccepted).toHaveBeenCalledWith({
      userId: claims.ownerId,
      endpointHash: claims.endpointHash,
      deliveryId: claims.deliveryId,
      campaignId: claims.campaignId,
      notificationKind: claims.notificationKind,
      acceptedAt: expect.any(String),
      engagementLocalDateKey: undefined,
    });
    expect(mocks.markGuestPushNotificationDisplayed).not.toHaveBeenCalled();
  });

  it('persists the aggregate but asks the service worker to retry a missing audit', async () => {
    const claims = {
      version: 2,
      ownerType: 'guest',
      ownerId: 'guest-device-1',
      deliveryId: 'delivery-3',
      campaignId: 'campaign-3',
      notificationKind: 'hadith',
      issuedAt: Date.now(),
    } as const;
    mocks.verifyPushTrackingToken.mockReturnValue(claims);
    mocks.recordPushDeliveryDisplayed.mockRejectedValue(
      new Error('audit unavailable')
    );
    mocks.markGuestPushNotificationDisplayed.mockResolvedValue(true);

    const response = await POST(
      createRequest({ token: 'valid-fallback-tracking-token-value' })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: 'Unable to record the display receipt.',
    });
    expect(mocks.markGuestPushNotificationDisplayed).toHaveBeenCalled();
  });

  it('reports an unavailable receipt only when both stores fail', async () => {
    mocks.verifyPushTrackingToken.mockReturnValue({
      version: 2,
      ownerType: 'guest',
      ownerId: 'guest-device-1',
      deliveryId: 'delivery-4',
      campaignId: 'campaign-4',
      notificationKind: 'quran',
      issuedAt: Date.now(),
    });
    mocks.recordPushDeliveryDisplayed.mockRejectedValue(
      new Error('audit unavailable')
    );
    mocks.markGuestPushNotificationDisplayed.mockRejectedValue(
      new Error('aggregate unavailable')
    );

    const response = await POST(
      createRequest({ token: 'valid-failed-tracking-token-value' })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: 'Unable to record the display receipt.',
    });
  });

  it('asks for a retry when accepted-counter recovery fails', async () => {
    const claims = {
      version: 2,
      ownerType: 'guest',
      ownerId: 'guest-device-1',
      deliveryId: 'delivery-accepted-recovery',
      campaignId: 'campaign-accepted-recovery',
      notificationKind: 'quran',
      issuedAt: Date.now(),
    } as const;
    mocks.verifyPushTrackingToken.mockReturnValue(claims);
    mocks.ensureGuestPushNotificationAccepted.mockRejectedValue(
      new Error('accepted aggregate unavailable')
    );
    mocks.markGuestPushNotificationDisplayed.mockResolvedValue(true);

    const response = await POST(
      createRequest({ token: 'valid-accepted-recovery-token-value' })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: 'Unable to record the display receipt.',
    });
  });

  it('does not increment the aggregate again for a replayed receipt', async () => {
    const claims = {
      version: 2,
      ownerType: 'guest',
      ownerId: 'guest-device-1',
      deliveryId: 'delivery-replay',
      campaignId: 'campaign-replay',
      notificationKind: 'quran',
      issuedAt: Date.now(),
    } as const;
    mocks.verifyPushTrackingToken.mockReturnValue(claims);
    mocks.recordPushDeliveryDisplayed.mockResolvedValue({
      audit: { status: 'displayed', acceptedAt: '2026-08-08T04:00:00.000Z' },
      recorded: false,
    });
    mocks.markGuestPushNotificationDisplayed.mockResolvedValue(false);

    const response = await POST(
      createRequest({ token: 'valid-replayed-tracking-token-value' })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      audited: true,
      recorded: false,
    });
    expect(mocks.markGuestPushNotificationDisplayed).toHaveBeenCalled();
  });

  it('keeps legacy display receipts out of version 2 aggregate counters', async () => {
    const claims = {
      version: 1,
      ownerType: 'guest',
      ownerId: 'guest-device-legacy',
      deliveryId: 'delivery-legacy',
      campaignId: 'campaign-legacy',
      notificationKind: 'quran',
      issuedAt: Date.now(),
    } as const;
    mocks.verifyPushTrackingToken.mockReturnValue(claims);

    const response = await POST(
      createRequest({ token: 'valid-legacy-display-token-value' })
    );

    expect(response.status).toBe(200);
    expect(mocks.ensureGuestPushNotificationAccepted).not.toHaveBeenCalled();
    expect(mocks.markGuestPushNotificationDisplayed).not.toHaveBeenCalled();
  });
});
