import { randomUUID } from 'node:crypto';

import mongoose, { Schema, type Model } from 'mongoose';

import { connectToMongoDatabase } from '@/lib/db/mongodb';
import {
  normalizePushContentPreference,
  type PushContentPreference,
  type PushDeliveryTracking,
  type PushEngagementKind,
} from '@/lib/push/engagement-types';
import { getSiteVisitCutoffIso } from '@/lib/push/site-visit-tracking';

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
  notificationTrackedSentCount: number;
  notificationDisplayedCount: number;
  notificationVisitCount: number;
  notificationTrackedVisitCount: number;
  siteVisitCount: number;
  lastSiteVisitAt: string | null;
  lastNotificationVisitAt: string | null;
  lastNotificationDisplayedAt: string | null;
  lastNotificationCampaignId: string | null;
  lastNotificationKind: string | null;
  disabledAt: string | null;
  disabledReason: string | null;
  engagementClaimKey: string | null;
  engagementClaimedAt: string | null;
  engagementClaimCompletedAt: string | null;
  engagementClaimRetryAfter: string | null;
  acceptedDeliveryIds: string[];
  displayedDeliveryIds: string[];
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
  notificationTrackedSentCount: number;
  notificationDisplayedCount: number;
  notificationVisitCount: number;
  notificationTrackedVisitCount: number;
  siteVisitCount: number;
  lastSiteVisitAt: string | null;
  lastNotificationVisitAt: string | null;
  lastNotificationDisplayedAt: string | null;
  lastNotificationCampaignId: string | null;
  lastNotificationKind: string | null;
  disabledAt: string | null;
  disabledReason: string | null;
}

export interface GuestPushSubscriptionForDelivery extends StoredGuestPushSubscription {
  ownerType: 'guest';
  guestDeviceId: string;
}

const GUEST_PUSH_COLLECTION = 'guest_push_subscriptions';
const GUEST_PUSH_MODEL_NAME = 'GuestPushSubscription';
const DELIVERY_ID_RETENTION_LIMIT = 512;

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
    notificationTrackedSentCount: { type: Number, min: 0, default: 0 },
    notificationDisplayedCount: { type: Number, min: 0, default: 0 },
    notificationVisitCount: { type: Number, min: 0, default: 0 },
    notificationTrackedVisitCount: { type: Number, min: 0, default: 0 },
    siteVisitCount: { type: Number, min: 0, default: 0 },
    lastSiteVisitAt: { type: String, default: null },
    lastNotificationVisitAt: { type: String, default: null },
    lastNotificationDisplayedAt: { type: String, default: null },
    lastNotificationCampaignId: { type: String, default: null },
    lastNotificationKind: { type: String, default: null },
    disabledAt: { type: String, default: null, index: true },
    disabledReason: { type: String, default: null },
    engagementClaimKey: { type: String, default: null, index: true },
    engagementClaimedAt: { type: String, default: null },
    engagementClaimCompletedAt: { type: String, default: null },
    engagementClaimRetryAfter: { type: String, default: null },
    acceptedDeliveryIds: { type: [String], default: [] },
    displayedDeliveryIds: { type: [String], default: [] },
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
    notificationTrackedSentCount: Math.max(
      0,
      Math.floor(Number(entry.notificationTrackedSentCount) || 0)
    ),
    notificationDisplayedCount: Math.max(
      0,
      Math.floor(Number(entry.notificationDisplayedCount) || 0)
    ),
    notificationVisitCount: Math.max(
      0,
      Math.floor(Number(entry.notificationVisitCount) || 0)
    ),
    notificationTrackedVisitCount: Math.max(
      0,
      Math.floor(Number(entry.notificationTrackedVisitCount) || 0)
    ),
    siteVisitCount: Math.max(
      0,
      Math.floor(Number(entry.siteVisitCount) || 0)
    ),
    lastSiteVisitAt: entry.lastSiteVisitAt ? String(entry.lastSiteVisitAt) : null,
    lastNotificationVisitAt: entry.lastNotificationVisitAt
      ? String(entry.lastNotificationVisitAt)
      : null,
    lastNotificationDisplayedAt: entry.lastNotificationDisplayedAt
      ? String(entry.lastNotificationDisplayedAt)
      : null,
    lastNotificationCampaignId: entry.lastNotificationCampaignId
      ? String(entry.lastNotificationCampaignId).slice(0, 180)
      : null,
    lastNotificationKind: entry.lastNotificationKind
      ? String(entry.lastNotificationKind).slice(0, 80)
      : null,
    disabledAt: entry.disabledAt ? String(entry.disabledAt) : null,
    disabledReason: entry.disabledReason
      ? String(entry.disabledReason).slice(0, 120)
      : null,
    engagementClaimKey: entry.engagementClaimKey
      ? String(entry.engagementClaimKey).slice(0, 120)
      : null,
    engagementClaimedAt: entry.engagementClaimedAt
      ? String(entry.engagementClaimedAt)
      : null,
    engagementClaimCompletedAt: entry.engagementClaimCompletedAt
      ? String(entry.engagementClaimCompletedAt)
      : null,
    engagementClaimRetryAfter: entry.engagementClaimRetryAfter
      ? String(entry.engagementClaimRetryAfter)
      : null,
    acceptedDeliveryIds: Array.isArray(entry.acceptedDeliveryIds)
      ? Array.from(
          new Set(
            entry.acceptedDeliveryIds
              .map((value) => String(value).trim())
              .filter(Boolean)
          )
        ).slice(-DELIVERY_ID_RETENTION_LIMIT)
      : [],
    displayedDeliveryIds: Array.isArray(entry.displayedDeliveryIds)
      ? Array.from(
          new Set(
            entry.displayedDeliveryIds
              .map((value) => String(value).trim())
              .filter(Boolean)
          )
        ).slice(-DELIVERY_ID_RETENTION_LIMIT)
      : [],
    openedDeliveryIds: Array.isArray(entry.openedDeliveryIds)
      ? Array.from(
          new Set(
            entry.openedDeliveryIds
              .map((value) => String(value).trim())
              .filter(Boolean)
          )
        ).slice(-DELIVERY_ID_RETENTION_LIMIT)
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
        disabledAt: null,
        disabledReason: null,
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
        notificationTrackedSentCount: 0,
        notificationDisplayedCount: 0,
        notificationVisitCount: 0,
        notificationTrackedVisitCount: 0,
        siteVisitCount: 0,
        lastSiteVisitAt: null,
        lastNotificationVisitAt: null,
        lastNotificationDisplayedAt: null,
        lastNotificationCampaignId: null,
        lastNotificationKind: null,
        engagementClaimKey: null,
        engagementClaimedAt: null,
        engagementClaimCompletedAt: null,
        engagementClaimRetryAfter: null,
        acceptedDeliveryIds: [],
        displayedDeliveryIds: [],
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
        disabledAt: nowIso,
        disabledReason: 'replaced-by-newer-subscription',
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
  reason?: string;
  preserveHistory?: boolean;
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
  if (!input.preserveHistory) {
    const result = await GuestPush.deleteMany({ $or: filters }).exec();
    return result.deletedCount > 0;
  }

  const disabledAt = new Date().toISOString();
  const result = await GuestPush.updateMany(
    { enabled: true, $or: filters },
    {
      $set: {
        enabled: false,
        disabledAt,
        disabledReason: String(input.reason ?? 'permission-removed').slice(0, 120),
        updatedAt: disabledAt,
      },
    }
  ).exec();
  return result.modifiedCount > 0;
}

export async function listGuestPushDevicesForAdmin(): Promise<GuestPushDeviceForAdmin[]> {
  const GuestPush = await ensureGuestPushModel();
  const entries = await GuestPush.find(
    {},
    {
      _id: 0,
      endpoint: 0,
      keys: 0,
      acceptedDeliveryIds: 0,
      displayedDeliveryIds: 0,
      openedDeliveryIds: 0,
      engagementClaimKey: 0,
      engagementClaimedAt: 0,
      engagementClaimCompletedAt: 0,
      engagementClaimRetryAfter: 0,
    }
  )
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
    notificationTrackedSentCount: Math.max(
      0,
      Math.floor(Number(entry.notificationTrackedSentCount) || 0)
    ),
    notificationDisplayedCount: Math.max(
      0,
      Math.floor(Number(entry.notificationDisplayedCount) || 0)
    ),
    notificationVisitCount: Math.max(
      0,
      Math.floor(Number(entry.notificationVisitCount) || 0)
    ),
    notificationTrackedVisitCount: Math.max(
      0,
      Math.floor(Number(entry.notificationTrackedVisitCount) || 0)
    ),
    siteVisitCount: Math.max(
      0,
      Math.floor(Number(entry.siteVisitCount) || 0)
    ),
    lastSiteVisitAt: entry.lastSiteVisitAt ? String(entry.lastSiteVisitAt) : null,
    lastNotificationVisitAt: entry.lastNotificationVisitAt
      ? String(entry.lastNotificationVisitAt)
      : null,
    lastNotificationDisplayedAt: entry.lastNotificationDisplayedAt
      ? String(entry.lastNotificationDisplayedAt)
      : null,
    lastNotificationCampaignId: entry.lastNotificationCampaignId
      ? String(entry.lastNotificationCampaignId).slice(0, 180)
      : null,
    lastNotificationKind: entry.lastNotificationKind
      ? String(entry.lastNotificationKind).slice(0, 80)
      : null,
    disabledAt: entry.disabledAt ? String(entry.disabledAt) : null,
    disabledReason: entry.disabledReason
      ? String(entry.disabledReason).slice(0, 120)
      : null,
  }));
}

export async function listEnabledGuestPushSubscriptions(): Promise<
  GuestPushSubscriptionForDelivery[]
> {
  const GuestPush = await ensureGuestPushModel();
  const entries = await GuestPush.find(
    { enabled: true },
    {
      _id: 0,
      acceptedDeliveryIds: 0,
      displayedDeliveryIds: 0,
      openedDeliveryIds: 0,
    }
  )
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
  tracking?: PushDeliveryTracking,
  displayTrackingEnabled = false
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

  if (tracking && displayTrackingEnabled) {
    await GuestPush.updateOne(
      {
        endpoint,
        acceptedDeliveryIds: { $ne: tracking.deliveryId },
      },
      {
        $set: update,
        $inc: {
          notificationSentCount: 1,
          notificationTrackedSentCount: 1,
        },
        $push: {
          acceptedDeliveryIds: {
            $each: [tracking.deliveryId],
            $slice: -DELIVERY_ID_RETENTION_LIMIT,
          },
        }
      }
    ).exec();
    return;
  }

  await GuestPush.updateOne(
    { endpoint },
    {
      $set: update,
      $inc: { notificationSentCount: 1 },
    }
  ).exec();
}

export async function ensureGuestPushNotificationAccepted(input: {
  guestDeviceId: string;
  deliveryId: string;
  campaignId: string;
  notificationKind: string;
  acceptedAt: string;
  engagementLocalDateKey?: string;
}) {
  const GuestPush = await ensureGuestPushModel();
  const engagementKind =
    input.engagementLocalDateKey &&
    (input.notificationKind === 'hadith' ||
      input.notificationKind === 'quran' ||
      input.notificationKind === 'islamic')
      ? input.notificationKind
      : null;
  const countResult = await GuestPush.updateOne(
    {
      id: input.guestDeviceId,
      acceptedDeliveryIds: { $ne: input.deliveryId },
    },
    {
      $inc: {
        notificationSentCount: 1,
        notificationTrackedSentCount: 1,
      },
      $set: {
        lastSentAt: input.acceptedAt,
        lastNotificationCampaignId: input.campaignId,
        lastNotificationKind: input.notificationKind,
        ...(engagementKind
          ? {
              lastEngagementAt: input.acceptedAt,
              lastEngagementKind: engagementKind,
            }
          : {}),
        failureCount: 0,
        updatedAt: input.acceptedAt,
      },
      $push: {
        acceptedDeliveryIds: {
          $each: [input.deliveryId],
          $slice: -DELIVERY_ID_RETENTION_LIMIT,
        },
      },
    }
  ).exec();

  return countResult.modifiedCount > 0;
}

export async function markGuestPushNotificationDisplayed(input: {
  guestDeviceId: string;
  deliveryId: string;
  campaignId: string;
  notificationKind: string;
  displayedAt: string;
}) {
  const GuestPush = await ensureGuestPushModel();
  const result = await GuestPush.updateOne(
    {
      id: input.guestDeviceId,
      displayedDeliveryIds: { $ne: input.deliveryId },
    },
    {
      $inc: { notificationDisplayedCount: 1 },
      $set: {
        lastNotificationDisplayedAt: input.displayedAt,
        lastNotificationCampaignId: input.campaignId,
        lastNotificationKind: input.notificationKind,
      },
      $push: {
        displayedDeliveryIds: {
          $each: [input.deliveryId],
          $slice: -DELIVERY_ID_RETENTION_LIMIT,
        },
      },
    }
  ).exec();

  return result.modifiedCount > 0;
}

export async function recordGuestPushNotificationVisit(input: {
  guestDeviceId: string;
  deliveryId: string;
  campaignId: string;
  notificationKind: string;
  visitedAt: string;
  countTracked?: boolean;
}) {
  const GuestPush = await ensureGuestPushModel();
  const increment: Record<string, number> = { notificationVisitCount: 1 };
  if (input.countTracked) {
    increment.notificationTrackedVisitCount = 1;
  }
  const result = await GuestPush.updateOne(
    {
      id: input.guestDeviceId,
      openedDeliveryIds: { $ne: input.deliveryId },
    },
    {
      $inc: increment,
      $set: {
        lastNotificationVisitAt: input.visitedAt,
        lastNotificationCampaignId: input.campaignId,
        lastNotificationKind: input.notificationKind,
      },
      $push: {
        openedDeliveryIds: {
          $each: [input.deliveryId],
          $slice: -DELIVERY_ID_RETENTION_LIMIT,
        },
      },
    }
  ).exec();

  return result.modifiedCount > 0;
}

export async function recordGuestPushSiteVisit(input: {
  deviceId?: string;
  endpoint?: string;
  userAgent?: string | null;
  timeZone?: string | null;
  contentPreference?: PushContentPreference;
  visitedAt?: string;
  canonicalTotalVisitCount?: number;
}) {
  const filters: Array<Record<string, string>> = [];
  if (input.deviceId) {
    filters.push({ deviceId: input.deviceId });
  }
  if (input.endpoint) {
    filters.push({ endpoint: input.endpoint });
  }
  if (filters.length === 0) {
    return { matched: false, counted: false };
  }

  const GuestPush = await ensureGuestPushModel();
  const visitedAt = input.visitedAt ?? new Date().toISOString();
  const update: Record<string, unknown> = {
    lastSeenAt: visitedAt,
    updatedAt: visitedAt,
  };
  const normalizedTimeZone = normalizeGuestTimeZone(input.timeZone);

  if (input.userAgent !== undefined) {
    update.userAgent = input.userAgent?.trim().slice(0, 320) || null;
  }
  if (normalizedTimeZone) {
    update.timeZone = normalizedTimeZone;
  }
  if (input.contentPreference) {
    update.contentPreference = normalizePushContentPreference(
      input.contentPreference,
      'hadith'
    );
  }

  const baseFilter = { enabled: true, $or: filters };
  const seenResult = await GuestPush.updateOne(baseFilter, { $set: update }).exec();
  if (seenResult.matchedCount === 0) {
    return { matched: false, counted: false };
  }

  const requestedCanonicalTotal = Number(input.canonicalTotalVisitCount);
  const canonicalTotalVisitCount = Number.isFinite(requestedCanonicalTotal)
    ? Math.max(0, Math.floor(requestedCanonicalTotal))
    : null;
  if (canonicalTotalVisitCount !== null) {
    const syncResult = await GuestPush.updateOne(baseFilter, {
      $set: {
        ...update,
        lastSiteVisitAt: visitedAt,
      },
      $max: { siteVisitCount: canonicalTotalVisitCount },
    }).exec();
    return { matched: true, counted: syncResult.modifiedCount > 0 };
  }

  const countResult = await GuestPush.updateOne(
    {
      $and: [
        baseFilter,
        {
          $or: [
            { lastSiteVisitAt: null },
            { lastSiteVisitAt: { $exists: false } },
            { lastSiteVisitAt: { $lt: getSiteVisitCutoffIso(visitedAt) } },
          ],
        },
      ],
    },
    {
      $inc: { siteVisitCount: 1 },
      $set: {
        lastSiteVisitAt: visitedAt,
        lastSeenAt: visitedAt,
        updatedAt: visitedAt,
      },
    }
  ).exec();

  return { matched: true, counted: countResult.modifiedCount > 0 };
}

export async function markGuestPushSubscriptionFailure(
  endpoint: string,
  disable = false,
  deliveryId?: string
) {
  const GuestPush = await ensureGuestPushModel();
  const nowIso = new Date().toISOString();
  const update: Record<string, unknown> = {
    updatedAt: nowIso,
  };

  if (disable) {
    update.enabled = false;
    update.disabledAt = nowIso;
    update.disabledReason = 'push-endpoint-expired';
  }

  await GuestPush.updateOne(
    {
      endpoint,
      ...(deliveryId ? { acceptedDeliveryIds: { $ne: deliveryId } } : {}),
    },
    {
      $inc: { failureCount: 1 },
      $set: update,
    }
  ).exec();
}

const ENGAGEMENT_CLAIM_STALE_MS = 30 * 60 * 1000;

export async function claimGuestPushEngagement(input: {
  guestDeviceId: string;
  localDateKey: string;
  claimedAt: string;
}) {
  const GuestPush = await ensureGuestPushModel();
  const claimedTime = Date.parse(input.claimedAt);
  const staleBefore = new Date(
    (Number.isFinite(claimedTime) ? claimedTime : Date.now()) -
      ENGAGEMENT_CLAIM_STALE_MS
  ).toISOString();
  const result = await GuestPush.updateOne(
    {
      id: input.guestDeviceId,
      enabled: true,
      $or: [
        { engagementClaimKey: { $ne: input.localDateKey } },
        {
          $and: [
            { engagementClaimKey: input.localDateKey },
            {
              $or: [
                { engagementClaimCompletedAt: null },
                { engagementClaimCompletedAt: { $exists: false } },
              ],
            },
            {
              $or: [
                { engagementClaimRetryAfter: null },
                { engagementClaimRetryAfter: { $exists: false } },
                { engagementClaimRetryAfter: { $lte: input.claimedAt } },
              ],
            },
            {
              $or: [
                { engagementClaimedAt: null },
                { engagementClaimedAt: { $exists: false } },
                { engagementClaimedAt: { $lt: staleBefore } },
              ],
            },
          ],
        },
      ],
    },
    {
      $set: {
        engagementClaimKey: input.localDateKey,
        engagementClaimedAt: input.claimedAt,
        engagementClaimCompletedAt: null,
        engagementClaimRetryAfter: null,
      },
    }
  ).exec();

  return result.modifiedCount > 0;
}

export async function completeGuestPushEngagementClaim(input: {
  guestDeviceId: string;
  localDateKey: string;
  completedAt: string;
}) {
  const GuestPush = await ensureGuestPushModel();
  const result = await GuestPush.updateOne(
    {
      id: input.guestDeviceId,
      engagementClaimKey: input.localDateKey,
    },
    {
      $set: {
        engagementClaimCompletedAt: input.completedAt,
        engagementClaimRetryAfter: null,
      },
    }
  ).exec();

  return result.modifiedCount > 0;
}

export async function deferGuestPushEngagementClaim(input: {
  guestDeviceId: string;
  localDateKey: string;
  retryAfter: string;
}) {
  const GuestPush = await ensureGuestPushModel();
  const result = await GuestPush.updateOne(
    {
      id: input.guestDeviceId,
      engagementClaimKey: input.localDateKey,
      engagementClaimCompletedAt: null,
    },
    {
      $set: {
        engagementClaimRetryAfter: input.retryAfter,
      },
    }
  ).exec();

  return result.modifiedCount > 0;
}

export async function releaseGuestPushEngagementClaim(input: {
  guestDeviceId: string;
  localDateKey: string;
}) {
  const GuestPush = await ensureGuestPushModel();
  const result = await GuestPush.updateOne(
    {
      id: input.guestDeviceId,
      engagementClaimKey: input.localDateKey,
    },
    {
      $set: {
        engagementClaimKey: null,
        engagementClaimedAt: null,
        engagementClaimCompletedAt: null,
        engagementClaimRetryAfter: null,
      },
    }
  ).exec();

  return result.modifiedCount > 0;
}
