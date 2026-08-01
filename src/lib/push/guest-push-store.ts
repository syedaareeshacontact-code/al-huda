import { randomUUID } from 'node:crypto';

import mongoose, { Schema, type Model } from 'mongoose';

import { connectToMongoDatabase } from '@/lib/db/mongodb';
import {
  normalizePushContentPreference,
  type PushContentPreference,
  type PushDeliveryTracking,
  type PushEngagementKind,
} from '@/lib/push/engagement-types';

export interface StoredGuestPushSubscription {
  id: string;
  deviceId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string | null;
  timeZone: string | null;
  contentPreference: PushContentPreference;
  enabled: boolean;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
  lastSentAt: string | null;
  lastEngagementAt: string | null;
  lastEngagementKind: PushEngagementKind | null;
  notificationSentCount: number;
  notificationVisitCount: number;
  lastNotificationVisitAt: string | null;
  lastNotificationCampaignId: string | null;
  lastNotificationKind: string | null;
  openedDeliveryIds: string[];
}

export interface GuestPushDeviceForAdmin {
  id: string;
  deviceId: string;
  userAgent: string | null;
  timeZone: string | null;
  contentPreference: PushContentPreference;
  enabled: boolean;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
  lastSentAt: string | null;
  lastEngagementAt: string | null;
  lastEngagementKind: PushEngagementKind | null;
  notificationSentCount: number;
  notificationVisitCount: number;
  lastNotificationVisitAt: string | null;
  lastNotificationCampaignId: string | null;
  lastNotificationKind: string | null;
}

export interface GuestPushSubscriptionForDelivery extends StoredGuestPushSubscription {
  ownerType: 'guest';
  guestDeviceId: string;
}

const GUEST_PUSH_COLLECTION = 'guest_push_subscriptions';
const GUEST_PUSH_MODEL_NAME = 'GuestPushSubscription';

const guestPushSubscriptionSchema = new Schema<StoredGuestPushSubscription>(
  {
    id: { type: String, required: true, unique: true, index: true },
    deviceId: { type: String, required: true, index: true, trim: true },
    endpoint: { type: String, required: true, unique: true, index: true, trim: true },
    keys: {
      p256dh: { type: String, required: true, trim: true },
      auth: { type: String, required: true, trim: true },
    },
    userAgent: { type: String, default: null },
    timeZone: { type: String, default: null },
    contentPreference: {
      type: String,
      enum: ['hadith', 'quran', 'balanced'],
      default: 'hadith',
    },
    enabled: { type: Boolean, default: true, index: true },
    failureCount: { type: Number, min: 0, default: 0 },
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true },
    lastSeenAt: { type: String, required: true, index: true },
    lastSentAt: { type: String, default: null },
    lastEngagementAt: { type: String, default: null },
    lastEngagementKind: {
      type: String,
      enum: ['hadith', 'quran', 'islamic'],
      default: null,
    },
    notificationSentCount: { type: Number, min: 0, default: 0 },
    notificationVisitCount: { type: Number, min: 0, default: 0 },
    lastNotificationVisitAt: { type: String, default: null },
    lastNotificationCampaignId: { type: String, default: null },
    lastNotificationKind: { type: String, default: null },
    openedDeliveryIds: { type: [String], default: [] },
  },
  {
    collection: GUEST_PUSH_COLLECTION,
    versionKey: false,
  }
);

function getGuestPushModel(): Model<StoredGuestPushSubscription> {
  return (
    (mongoose.models[GUEST_PUSH_MODEL_NAME] as
      | Model<StoredGuestPushSubscription>
      | undefined) ??
    mongoose.model<StoredGuestPushSubscription>(
      GUEST_PUSH_MODEL_NAME,
      guestPushSubscriptionSchema
    )
  );
}

async function ensureGuestPushModel() {
  await connectToMongoDatabase();
  return getGuestPushModel();
}

function normalizeGuestTimeZone(value: unknown) {
  const timeZone = String(value ?? '').trim();
  if (!timeZone || timeZone.length > 80) {
    return null;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return null;
  }
}

function normalizeGuestPushSubscription(
  entry: StoredGuestPushSubscription
): StoredGuestPushSubscription {
  return {
    id: String(entry.id),
    deviceId: String(entry.deviceId),
    endpoint: String(entry.endpoint),
    keys: {
      p256dh: String(entry.keys?.p256dh ?? ''),
      auth: String(entry.keys?.auth ?? ''),
    },
    userAgent: entry.userAgent ? String(entry.userAgent) : null,
    timeZone: normalizeGuestTimeZone(entry.timeZone),
    contentPreference: normalizePushContentPreference(
      entry.contentPreference,
      'hadith'
    ),
    enabled: entry.enabled !== false,
    failureCount: Math.max(0, Number(entry.failureCount) || 0),
    createdAt: String(entry.createdAt),
    updatedAt: String(entry.updatedAt),
    lastSeenAt: String(entry.lastSeenAt),
    lastSentAt: entry.lastSentAt ? String(entry.lastSentAt) : null,
    lastEngagementAt: entry.lastEngagementAt
      ? String(entry.lastEngagementAt)
      : null,
    lastEngagementKind:
      entry.lastEngagementKind === 'hadith' ||
      entry.lastEngagementKind === 'quran' ||
      entry.lastEngagementKind === 'islamic'
        ? entry.lastEngagementKind
        : null,
    notificationSentCount: Math.max(
      0,
      Math.floor(Number(entry.notificationSentCount) || 0)
    ),
    notificationVisitCount: Math.max(
      0,
      Math.floor(Number(entry.notificationVisitCount) || 0)
    ),
    lastNotificationVisitAt: entry.lastNotificationVisitAt
      ? String(entry.lastNotificationVisitAt)
      : null,
    lastNotificationCampaignId: entry.lastNotificationCampaignId
      ? String(entry.lastNotificationCampaignId).slice(0, 180)
      : null,
    lastNotificationKind: entry.lastNotificationKind
      ? String(entry.lastNotificationKind).slice(0, 80)
      : null,
    openedDeliveryIds: Array.isArray(entry.openedDeliveryIds)
      ? Array.from(
          new Set(
            entry.openedDeliveryIds
              .map((value) => String(value).trim())
              .filter(Boolean)
          )
        ).slice(-50)
      : [],
  };
}

export async function upsertGuestPushSubscription(input: {
  deviceId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string | null;
  timeZone?: string | null;
  contentPreference?: PushContentPreference;
}) {
  const GuestPush = await ensureGuestPushModel();
  const nowIso = new Date().toISOString();
  const [endpointMatch, deviceMatch] = await Promise.all([
    GuestPush.findOne(
      { endpoint: input.endpoint },
      { _id: 0, id: 1, timeZone: 1, contentPreference: 1 }
    ).lean().exec(),
    GuestPush.findOne(
      { deviceId: input.deviceId },
      { _id: 0, id: 1, timeZone: 1, contentPreference: 1 }
    ).lean().exec(),
  ]);
  const id = String(endpointMatch?.id ?? deviceMatch?.id ?? randomUUID());
  const existingSubscription = endpointMatch ?? deviceMatch;

  await GuestPush.updateOne(
    { id },
    {
      $set: {
        deviceId: input.deviceId,
        endpoint: input.endpoint,
        keys: input.keys,
        userAgent: input.userAgent?.trim() || null,
        timeZone:
          normalizeGuestTimeZone(input.timeZone) ??
          normalizeGuestTimeZone(existingSubscription?.timeZone),
        contentPreference: normalizePushContentPreference(
          input.contentPreference ?? existingSubscription?.contentPreference,
          'hadith'
        ),
        enabled: true,
        failureCount: 0,
        updatedAt: nowIso,
        lastSeenAt: nowIso,
      },
      $setOnInsert: {
        id,
        createdAt: nowIso,
        lastSentAt: null,
        lastEngagementAt: null,
        lastEngagementKind: null,
        notificationSentCount: 0,
        notificationVisitCount: 0,
        lastNotificationVisitAt: null,
        lastNotificationCampaignId: null,
        lastNotificationKind: null,
        openedDeliveryIds: [],
      },
    },
    { upsert: true }
  ).exec();

  await GuestPush.updateMany(
    {
      id: { $ne: id },
      $or: [{ endpoint: input.endpoint }, { deviceId: input.deviceId }],
    },
    {
      $set: {
        enabled: false,
        updatedAt: nowIso,
      },
    }
  ).exec();

  const stored = await GuestPush.findOne({ id }, { _id: 0 }).lean<StoredGuestPushSubscription>().exec();
  return stored ? normalizeGuestPushSubscription(stored) : null;
}

export async function removeGuestPushSubscription(input: {
  deviceId?: string;
  endpoint?: string;
}) {
  const filters: Array<Record<string, string>> = [];
  if (input.deviceId) {
    filters.push({ deviceId: input.deviceId });
  }
  if (input.endpoint) {
    filters.push({ endpoint: input.endpoint });
  }
  if (filters.length === 0) {
    return false;
  }

  const GuestPush = await ensureGuestPushModel();
  const result = await GuestPush.deleteMany({ $or: filters }).exec();
  return result.deletedCount > 0;
}

export async function listGuestPushDevicesForAdmin(): Promise<GuestPushDeviceForAdmin[]> {
  const GuestPush = await ensureGuestPushModel();
  const entries = await GuestPush.find({ enabled: true }, { _id: 0, endpoint: 0, keys: 0 })
    .sort({ lastSeenAt: -1 })
    .lean<GuestPushDeviceForAdmin[]>()
    .exec();

  return entries.map((entry) => ({
    id: String(entry.id),
    deviceId: String(entry.deviceId),
    userAgent: entry.userAgent ? String(entry.userAgent) : null,
    timeZone: normalizeGuestTimeZone(entry.timeZone),
    contentPreference: normalizePushContentPreference(
      entry.contentPreference,
      'hadith'
    ),
    enabled: entry.enabled !== false,
    failureCount: Math.max(0, Number(entry.failureCount) || 0),
    createdAt: String(entry.createdAt),
    updatedAt: String(entry.updatedAt),
    lastSeenAt: String(entry.lastSeenAt),
    lastSentAt: entry.lastSentAt ? String(entry.lastSentAt) : null,
    lastEngagementAt: entry.lastEngagementAt
      ? String(entry.lastEngagementAt)
      : null,
    lastEngagementKind:
      entry.lastEngagementKind === 'hadith' ||
      entry.lastEngagementKind === 'quran' ||
      entry.lastEngagementKind === 'islamic'
        ? entry.lastEngagementKind
        : null,
    notificationSentCount: Math.max(
      0,
      Math.floor(Number(entry.notificationSentCount) || 0)
    ),
    notificationVisitCount: Math.max(
      0,
      Math.floor(Number(entry.notificationVisitCount) || 0)
    ),
    lastNotificationVisitAt: entry.lastNotificationVisitAt
      ? String(entry.lastNotificationVisitAt)
      : null,
    lastNotificationCampaignId: entry.lastNotificationCampaignId
      ? String(entry.lastNotificationCampaignId).slice(0, 180)
      : null,
    lastNotificationKind: entry.lastNotificationKind
      ? String(entry.lastNotificationKind).slice(0, 80)
      : null,
  }));
}

export async function listEnabledGuestPushSubscriptions(): Promise<
  GuestPushSubscriptionForDelivery[]
> {
  const GuestPush = await ensureGuestPushModel();
  const entries = await GuestPush.find({ enabled: true }, { _id: 0 })
    .sort({ lastSeenAt: -1 })
    .lean<StoredGuestPushSubscription[]>()
    .exec();

  return entries.map((entry) => {
    const subscription = normalizeGuestPushSubscription(entry);
    return {
      ...subscription,
      ownerType: 'guest' as const,
      guestDeviceId: subscription.id,
    };
  });
}

export async function markGuestPushSubscriptionSent(
  endpoint: string,
  sentAt: string,
  engagementKind?: PushEngagementKind,
  tracking?: PushDeliveryTracking
) {
  const GuestPush = await ensureGuestPushModel();
  const update: Record<string, unknown> = {
    lastSentAt: sentAt,
    updatedAt: sentAt,
    failureCount: 0,
  };

  if (engagementKind) {
    update.lastEngagementAt = sentAt;
    update.lastEngagementKind = engagementKind;
  }

  if (tracking) {
    update.lastNotificationCampaignId = tracking.campaignId;
    update.lastNotificationKind = tracking.notificationKind;
  }

  await GuestPush.updateOne(
    { endpoint },
    {
      $set: update,
      $inc: { notificationSentCount: 1 },
    }
  ).exec();
}

export async function recordGuestPushNotificationVisit(input: {
  guestDeviceId: string;
  deliveryId: string;
  campaignId: string;
  notificationKind: string;
  visitedAt: string;
}) {
  const GuestPush = await ensureGuestPushModel();
  const result = await GuestPush.updateOne(
    {
      id: input.guestDeviceId,
      openedDeliveryIds: { $ne: input.deliveryId },
    },
    {
      $inc: { notificationVisitCount: 1 },
      $set: {
        lastNotificationVisitAt: input.visitedAt,
        lastNotificationCampaignId: input.campaignId,
        lastNotificationKind: input.notificationKind,
      },
      $push: {
        openedDeliveryIds: {
          $each: [input.deliveryId],
          $slice: -50,
        },
      },
    }
  ).exec();

  return result.modifiedCount > 0;
}

export async function markGuestPushSubscriptionFailure(
  endpoint: string,
  disable = false
) {
  const GuestPush = await ensureGuestPushModel();
  const nowIso = new Date().toISOString();
  const update: Record<string, unknown> = {
    updatedAt: nowIso,
  };

  if (disable) {
    update.enabled = false;
  }

  await GuestPush.updateOne(
    { endpoint },
    {
      $inc: { failureCount: 1 },
      $set: update,
    }
  ).exec();
}
