import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyPushTrackingToken: vi.fn(),
  recordPushDeliveryOpened: vi.fn(),
  ensureGuestPushNotificationAccepted: vi.fn(),
  completeGuestPushEngagementClaim: vi.fn(),
  markGuestPushNotificationDisplayed: vi.fn(),
  recordGuestPushNotificationVisit: vi.fn(),
  ensureUserPushNotificationAccepted: vi.fn(),
  recordUserPushNotificationDisplayed: vi.fn(),
  recordUserPushNotificationVisit: vi.fn(),
}));

vi.mock('@/lib/push/push-open-tracking', () => ({
  verifyPushTrackingToken: mocks.verifyPushTrackingToken,
}));

vi.mock('@/lib/push/push-delivery-audit-store', () => ({
  recordPushDeliveryOpened: mocks.recordPushDeliveryOpened,
}));

vi.mock('@/lib/push/guest-push-store', () => ({
  completeGuestPushEngagementClaim: mocks.completeGuestPushEngagementClaim,
  ensureGuestPushNotificationAccepted: mocks.ensureGuestPushNotificationAccepted,
  markGuestPushNotificationDisplayed: mocks.markGuestPushNotificationDisplayed,
  recordGuestPushNotificationVisit: mocks.recordGuestPushNotificationVisit,
}));

vi.mock('@/lib/auth/users-store', () => ({
  ensureUserPushNotificationAccepted: mocks.ensureUserPushNotificationAccepted,
  recordUserPushNotificationDisplayed: mocks.recordUserPushNotificationDisplayed,
  recordUserPushNotificationVisit: mocks.recordUserPushNotificationVisit,
}));

import { POST } from './route';

function createRequest(token = 'valid-open-tracking-token-value') {
  return new Request('https://www.readalquran.online/api/push/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

const guestClaims = {
  version: 2,
  ownerType: 'guest',
  ownerId: 'guest-device-1',
  deliveryId: 'delivery-1',
  campaignId: 'campaign-1',
  notificationKind: 'islamic',
  engagementLocalDateKey: '2026-08-08',
  issuedAt: Date.now(),
} as const;

const userClaims = {
  version: 2,
  ownerType: 'user',
  ownerId: 'user-1',
  endpointHash: 'a'.repeat(64),
  deliveryId: 'delivery-2',
  campaignId: 'campaign-2',
  notificationKind: 'quran',
  issuedAt: Date.now(),
} as const;

describe('POST /api/push/open', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordPushDeliveryOpened.mockResolvedValue({
      audit: { status: 'opened', acceptedAt: '2026-08-08T04:00:00.000Z' },
      recorded: true,
    });
    mocks.markGuestPushNotificationDisplayed.mockResolvedValue(true);
    mocks.ensureGuestPushNotificationAccepted.mockResolvedValue(false);
    mocks.completeGuestPushEngagementClaim.mockResolvedValue(false);
    mocks.recordUserPushNotificationDisplayed.mockResolvedValue(true);
    mocks.ensureUserPushNotificationAccepted.mockResolvedValue(false);
    mocks.recordGuestPushNotificationVisit.mockResolvedValue(false);
    mocks.recordUserPushNotificationVisit.mockResolvedValue(false);
  });

  it('records both the durable audit and guest aggregate visit', async () => {
    mocks.verifyPushTrackingToken.mockReturnValue(guestClaims);
    mocks.recordGuestPushNotificationVisit.mockResolvedValue(true);

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      audited: true,
      recorded: true,
    });
    expect(mocks.recordPushDeliveryOpened).toHaveBeenCalledWith({
      claims: guestClaims,
      openedAt: expect.any(String),
    });
    expect(mocks.recordGuestPushNotificationVisit).toHaveBeenCalledWith({
      guestDeviceId: guestClaims.ownerId,
      deliveryId: guestClaims.deliveryId,
      campaignId: guestClaims.campaignId,
      notificationKind: guestClaims.notificationKind,
      visitedAt: expect.any(String),
      countTracked: true,
    });
    expect(mocks.ensureGuestPushNotificationAccepted).toHaveBeenCalledWith({
      guestDeviceId: guestClaims.ownerId,
      deliveryId: guestClaims.deliveryId,
      campaignId: guestClaims.campaignId,
      notificationKind: guestClaims.notificationKind,
      acceptedAt: expect.any(String),
      engagementLocalDateKey: guestClaims.engagementLocalDateKey,
    });
    expect(mocks.markGuestPushNotificationDisplayed).toHaveBeenCalledWith({
      guestDeviceId: guestClaims.ownerId,
      deliveryId: guestClaims.deliveryId,
      campaignId: guestClaims.campaignId,
      notificationKind: guestClaims.notificationKind,
      displayedAt: expect.any(String),
    });
    expect(mocks.completeGuestPushEngagementClaim).toHaveBeenCalledWith({
      guestDeviceId: guestClaims.ownerId,
      localDateKey: guestClaims.engagementLocalDateKey,
      completedAt: expect.any(String),
    });
    expect(mocks.recordUserPushNotificationVisit).not.toHaveBeenCalled();
    expect(mocks.recordUserPushNotificationDisplayed).not.toHaveBeenCalled();
  });

  it('uses the signed endpoint hash for a user aggregate visit', async () => {
    mocks.verifyPushTrackingToken.mockReturnValue(userClaims);
    mocks.recordUserPushNotificationVisit.mockResolvedValue(true);

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      audited: true,
      recorded: true,
    });
    expect(mocks.recordUserPushNotificationVisit).toHaveBeenCalledWith({
      userId: userClaims.ownerId,
      endpointHash: userClaims.endpointHash,
      deliveryId: userClaims.deliveryId,
      campaignId: userClaims.campaignId,
      notificationKind: userClaims.notificationKind,
      visitedAt: expect.any(String),
      countTracked: true,
    });
    expect(mocks.ensureUserPushNotificationAccepted).toHaveBeenCalledWith({
      userId: userClaims.ownerId,
      endpointHash: userClaims.endpointHash,
      deliveryId: userClaims.deliveryId,
      campaignId: userClaims.campaignId,
      notificationKind: userClaims.notificationKind,
      acceptedAt: expect.any(String),
      engagementLocalDateKey: undefined,
    });
    expect(mocks.recordUserPushNotificationDisplayed).toHaveBeenCalledWith({
      userId: userClaims.ownerId,
      endpointHash: userClaims.endpointHash,
      deliveryId: userClaims.deliveryId,
      campaignId: userClaims.campaignId,
      notificationKind: userClaims.notificationKind,
      displayedAt: expect.any(String),
    });
    expect(mocks.recordGuestPushNotificationVisit).not.toHaveBeenCalled();
    expect(mocks.markGuestPushNotificationDisplayed).not.toHaveBeenCalled();
    expect(mocks.ensureGuestPushNotificationAccepted).not.toHaveBeenCalled();
    expect(mocks.completeGuestPushEngagementClaim).not.toHaveBeenCalled();
  });

  it('asks the client to retry when an aggregate write fails after the audit', async () => {
    mocks.verifyPushTrackingToken.mockReturnValue(guestClaims);
    mocks.recordGuestPushNotificationVisit.mockRejectedValue(
      new Error('aggregate unavailable')
    );

    const response = await POST(createRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: 'Unable to record the notification open.',
    });
  });

  it('persists aggregates but asks the client to retry a missing audit', async () => {
    mocks.verifyPushTrackingToken.mockReturnValue(guestClaims);
    mocks.recordPushDeliveryOpened.mockRejectedValue(
      new Error('audit unavailable')
    );
    mocks.recordGuestPushNotificationVisit.mockResolvedValue(true);

    const response = await POST(createRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: 'Unable to record the notification open.',
    });
  });

  it('returns unavailable only when both receipt stores fail', async () => {
    mocks.verifyPushTrackingToken.mockReturnValue(guestClaims);
    mocks.recordPushDeliveryOpened.mockRejectedValue(
      new Error('audit unavailable')
    );
    mocks.recordGuestPushNotificationVisit.mockRejectedValue(
      new Error('aggregate unavailable')
    );

    const response = await POST(createRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: 'Unable to record the notification open.',
    });
  });

  it('retries both idempotent aggregates for a replayed version 2 open', async () => {
    mocks.verifyPushTrackingToken.mockReturnValue(guestClaims);
    mocks.recordPushDeliveryOpened.mockResolvedValue({
      audit: { status: 'opened', acceptedAt: '2026-08-08T04:00:00.000Z' },
      recorded: false,
    });
    mocks.recordGuestPushNotificationVisit.mockResolvedValue(false);
    mocks.markGuestPushNotificationDisplayed.mockResolvedValue(false);

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      audited: true,
      recorded: false,
    });
    expect(mocks.recordGuestPushNotificationVisit).toHaveBeenCalledWith(
      expect.objectContaining({ countTracked: true })
    );
    expect(mocks.markGuestPushNotificationDisplayed).toHaveBeenCalled();
  });

  it('keeps legacy opens outside the version 2 tracked window', async () => {
    const legacyClaims = { ...guestClaims, version: 1 as const };
    mocks.verifyPushTrackingToken.mockReturnValue(legacyClaims);
    mocks.recordGuestPushNotificationVisit.mockResolvedValue(true);

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    expect(mocks.recordGuestPushNotificationVisit).toHaveBeenCalledWith(
      expect.objectContaining({ countTracked: false })
    );
    expect(mocks.markGuestPushNotificationDisplayed).not.toHaveBeenCalled();
    expect(mocks.completeGuestPushEngagementClaim).not.toHaveBeenCalled();
  });

  it('records tracked counters even when display/open arrive before acceptance', async () => {
    mocks.verifyPushTrackingToken.mockReturnValue(guestClaims);
    mocks.recordPushDeliveryOpened.mockResolvedValue({
      audit: { status: 'opened', acceptedAt: null },
      recorded: true,
    });
    mocks.recordGuestPushNotificationVisit.mockResolvedValue(true);

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    expect(mocks.recordGuestPushNotificationVisit).toHaveBeenCalledWith(
      expect.objectContaining({ countTracked: true })
    );
  });
});
