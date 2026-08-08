import mongoose from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/mongodb', () => ({
  connectToMongoDatabase: vi.fn().mockResolvedValue(undefined),
}));

import {
  recordPushDeliveryDisplayed,
  recordPushDeliveryPending,
} from './push-delivery-audit-store';

const storedAudit = {
  deliveryId: 'delivery-1',
  ownerType: 'guest',
  ownerId: 'guest-1',
  deviceId: 'browser-1',
  endpointHash: null,
  source: 'scheduled',
  campaignId: 'campaign-1',
  notificationKind: 'islamic',
  status: 'pending',
  acceptedAt: null,
  failedAt: null,
  displayedAt: null,
  openedAt: null,
  statusCode: null,
  errorMessage: null,
  disabled: false,
  createdAt: '2026-08-08T04:00:00.000Z',
  updatedAt: '2026-08-08T04:00:00.000Z',
};

const pendingInput = {
  tracking: {
    deliveryId: 'delivery-1',
    campaignId: 'campaign-1',
    notificationKind: 'islamic',
  },
  ownerType: 'guest' as const,
  ownerId: 'guest-1',
  deviceId: 'browser-1',
  endpoint: 'https://push.example/subscription-1',
  source: 'scheduled' as const,
  createdAt: '2026-08-08T04:00:00.000Z',
};

interface InspectedQuery {
  op: string;
  _mongooseOptions: { updatePipeline?: boolean };
  getFilter: () => unknown;
  getOptions: () => Record<string, unknown>;
  getUpdate: () => unknown;
}

function inspectQuery(instance: unknown) {
  return instance as InspectedQuery;
}

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(mongoose.Model, 'init').mockResolvedValue(undefined as never);
});

describe('push delivery audit persistence', () => {
  it('constructs a real Mongoose pipeline upsert with pipeline mode enabled', async () => {
    const execSpy = vi
      .spyOn(mongoose.Query.prototype, 'exec')
      .mockResolvedValueOnce({ modifiedCount: 1 })
      .mockResolvedValueOnce(storedAudit);

    await recordPushDeliveryPending(pendingInput);

    const updateQuery = inspectQuery(execSpy.mock.instances[0]);
    expect(updateQuery.op).toBe('updateOne');
    expect(updateQuery.getFilter()).toEqual({ deliveryId: 'delivery-1' });
    expect(updateQuery.getOptions()).toMatchObject({ upsert: true });
    expect(updateQuery._mongooseOptions.updatePipeline).toBe(true);
    expect(updateQuery.getUpdate()).toEqual(expect.any(Array));
  });

  it('keeps real Mongoose pipeline mode enabled on duplicate-key retry', async () => {
    const execSpy = vi
      .spyOn(mongoose.Query.prototype, 'exec')
      .mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: 11000 }))
      .mockResolvedValueOnce({ modifiedCount: 1 })
      .mockResolvedValueOnce(storedAudit);

    await recordPushDeliveryPending(pendingInput);

    const firstUpdate = inspectQuery(execSpy.mock.instances[0]);
    const retryUpdate = inspectQuery(execSpy.mock.instances[1]);
    expect(firstUpdate.op).toBe('updateOne');
    expect(retryUpdate.op).toBe('updateOne');
    expect(firstUpdate._mongooseOptions.updatePipeline).toBe(true);
    expect(retryUpdate._mongooseOptions.updatePipeline).toBe(true);
    expect(retryUpdate.getFilter()).toEqual({ deliveryId: 'delivery-1' });
    expect(retryUpdate.getOptions()).not.toHaveProperty('upsert');
    expect(retryUpdate.getUpdate()).toEqual(expect.any(Array));
  });

  it('reports a durable display receipt replay without rewriting aggregates', async () => {
    const execSpy = vi
      .spyOn(mongoose.Query.prototype, 'exec')
      .mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: 11000 }))
      .mockResolvedValueOnce({ modifiedCount: 0, upsertedCount: 0 })
      .mockResolvedValueOnce({ ...storedAudit, status: 'displayed' });

    const result = await recordPushDeliveryDisplayed({
      claims: {
        version: 1,
        ownerType: 'guest',
        ownerId: 'guest-1',
        deliveryId: 'delivery-1',
        campaignId: 'campaign-1',
        notificationKind: 'islamic',
        issuedAt: Date.now(),
      },
      displayedAt: '2026-08-08T04:00:10.000Z',
    });

    expect(result.recorded).toBe(false);
    const initialUpdate = inspectQuery(execSpy.mock.instances[0]);
    const retryUpdate = inspectQuery(execSpy.mock.instances[1]);
    expect(initialUpdate.getFilter()).toEqual({
      deliveryId: 'delivery-1',
      $or: [
        { displayedAt: null },
        { displayedAt: { $exists: false } },
      ],
    });
    expect(initialUpdate._mongooseOptions.updatePipeline).toBe(true);
    expect(retryUpdate._mongooseOptions.updatePipeline).toBe(true);
    expect(retryUpdate.getFilter()).toEqual({ deliveryId: 'delivery-1' });
  });
});
