import mongoose, { Schema, type Model } from 'mongoose';

import { connectToMongoDatabase } from '@/lib/db/mongodb';

export interface StoredRealtimeActivityRow {
  minutesAgo: number;
  device: string;
  country: string;
  city: string;
  pageTitle: string;
  eventName: string;
  activeUsers: number;
  eventCount: number;
  pageViews: number;
  isAggregateFallback?: boolean;
}

export interface StoredRealtimeSnapshot {
  id: string;
  propertyId: string;
  bucketStartAt: string;
  windowStartAt: string;
  windowEndAt: string;
  capturedAt: string;
  updatedAt: string;
  expiresAt: Date | string;
  activeUsers: number;
  eventCount: number;
  pageViews: number;
  activityGroups: number;
  activity: StoredRealtimeActivityRow[];
}

const REALTIME_SNAPSHOT_COLLECTION = 'analytics_realtime_snapshots';
const REALTIME_SNAPSHOT_MODEL_NAME = 'AnalyticsRealtimeSnapshot';
const SNAPSHOT_WINDOW_MINUTES = 30;
const STORED_ACTIVITY_LIMIT = 25;
const SNAPSHOT_RETENTION_DAYS = 7;

const realtimeActivitySchema = new Schema<StoredRealtimeActivityRow>(
  {
    minutesAgo: { type: Number, default: 0 },
    device: { type: String, default: '(not set)' },
    country: { type: String, default: '(not set)' },
    city: { type: String, default: '(not set)' },
    pageTitle: { type: String, default: '(not set)' },
    eventName: { type: String, default: '(not set)' },
    activeUsers: { type: Number, default: 0 },
    eventCount: { type: Number, default: 0 },
    pageViews: { type: Number, default: 0 },
    isAggregateFallback: { type: Boolean, default: false },
  },
  {
    _id: false,
  }
);

const realtimeSnapshotSchema = new Schema<StoredRealtimeSnapshot>(
  {
    id: { type: String, required: true, unique: true, index: true },
    propertyId: { type: String, required: true, index: true },
    bucketStartAt: { type: String, required: true, index: true },
    windowStartAt: { type: String, required: true, index: true },
    windowEndAt: { type: String, required: true, index: true },
    capturedAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    activeUsers: { type: Number, default: 0 },
    eventCount: { type: Number, default: 0 },
    pageViews: { type: Number, default: 0 },
    activityGroups: { type: Number, default: 0 },
    activity: { type: [realtimeActivitySchema], default: [] },
  },
  {
    collection: REALTIME_SNAPSHOT_COLLECTION,
    versionKey: false,
  }
);

realtimeSnapshotSchema.index({ propertyId: 1, bucketStartAt: -1 }, { unique: true });
realtimeSnapshotSchema.index({ propertyId: 1, capturedAt: -1 });
realtimeSnapshotSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

function getRealtimeSnapshotModel(): Model<StoredRealtimeSnapshot> {
  return (
    (mongoose.models[REALTIME_SNAPSHOT_MODEL_NAME] as
      | Model<StoredRealtimeSnapshot>
      | undefined) ??
    mongoose.model<StoredRealtimeSnapshot>(
      REALTIME_SNAPSHOT_MODEL_NAME,
      realtimeSnapshotSchema
    )
  );
}

async function ensureRealtimeSnapshotModel() {
  await connectToMongoDatabase();
  return getRealtimeSnapshotModel();
}

function getBucketStart(date: Date) {
  const bucketStart = new Date(date);
  const bucketMinute =
    Math.floor(bucketStart.getUTCMinutes() / SNAPSHOT_WINDOW_MINUTES) *
    SNAPSHOT_WINDOW_MINUTES;

  bucketStart.setUTCMinutes(bucketMinute, 0, 0);

  return bucketStart;
}

function normalizeActivityRow(row: StoredRealtimeActivityRow): StoredRealtimeActivityRow {
  return {
    minutesAgo: Number(row.minutesAgo) || 0,
    device: row.device || '(not set)',
    country: row.country || '(not set)',
    city: row.city || '(not set)',
    pageTitle: row.pageTitle || '(not set)',
    eventName: row.eventName || '(not set)',
    activeUsers: Number(row.activeUsers) || 0,
    eventCount: Number(row.eventCount) || 0,
    pageViews: Number(row.pageViews) || 0,
    isAggregateFallback: Boolean(row.isAggregateFallback),
  };
}

function normalizeSnapshot(snapshot: StoredRealtimeSnapshot): StoredRealtimeSnapshot {
  return {
    id: String(snapshot.id),
    propertyId: String(snapshot.propertyId),
    bucketStartAt: String(snapshot.bucketStartAt),
    windowStartAt: String(snapshot.windowStartAt),
    windowEndAt: String(snapshot.windowEndAt),
    capturedAt: String(snapshot.capturedAt),
    updatedAt: String(snapshot.updatedAt),
    expiresAt: snapshot.expiresAt,
    activeUsers: Number(snapshot.activeUsers) || 0,
    eventCount: Number(snapshot.eventCount) || 0,
    pageViews: Number(snapshot.pageViews) || 0,
    activityGroups: Number(snapshot.activityGroups) || 0,
    activity: (snapshot.activity || []).map(normalizeActivityRow),
  };
}

export async function saveRealtimeSnapshot(input: {
  propertyId: string;
  capturedAt: string;
  activeUsers: number;
  activity: StoredRealtimeActivityRow[];
}) {
  const RealtimeSnapshot = await ensureRealtimeSnapshotModel();
  const capturedDate = new Date(input.capturedAt);
  const bucketStart = getBucketStart(capturedDate);
  const bucketStartAt = bucketStart.toISOString();
  const bucketEndAt = new Date(
    bucketStart.getTime() + SNAPSHOT_WINDOW_MINUTES * 60_000
  ).toISOString();
  const windowStartAt = bucketStartAt;
  const expiresAt = new Date(
    capturedDate.getTime() + SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
  const activity = input.activity
    .slice(0, STORED_ACTIVITY_LIMIT)
    .map(normalizeActivityRow);
  const eventCount = activity.reduce((total, row) => total + row.eventCount, 0);
  const pageViews = activity.reduce((total, row) => total + row.pageViews, 0);
  const id = `${input.propertyId}:${bucketStartAt}`;

  const snapshot = await RealtimeSnapshot.findOneAndUpdate(
    { propertyId: input.propertyId, bucketStartAt },
    {
      $set: {
        windowStartAt,
        windowEndAt: bucketEndAt,
        capturedAt: input.capturedAt,
        updatedAt: input.capturedAt,
        expiresAt,
        activeUsers: Number(input.activeUsers) || 0,
        eventCount,
        pageViews,
        activityGroups: activity.length,
        activity,
      },
      $setOnInsert: {
        id,
        propertyId: input.propertyId,
        bucketStartAt,
      },
    },
    {
      new: true,
      upsert: true,
      projection: { _id: 0 },
    }
  )
    .lean<StoredRealtimeSnapshot>()
    .exec();

  return snapshot ? normalizeSnapshot(snapshot) : null;
}

export async function listRecentRealtimeSnapshots(input: {
  propertyId: string;
  days?: number;
  limit?: number;
}) {
  const RealtimeSnapshot = await ensureRealtimeSnapshotModel();
  const days = Math.max(1, Math.min(Number(input.days) || 7, 30));
  const limit = Math.max(1, Math.min(Number(input.limit) || 336, 1000));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const snapshots = await RealtimeSnapshot.find(
    {
      propertyId: input.propertyId,
      bucketStartAt: { $gte: since },
    },
    { _id: 0 }
  )
    .sort({ bucketStartAt: -1 })
    .limit(limit)
    .lean<StoredRealtimeSnapshot[]>()
    .exec();

  return snapshots.map(normalizeSnapshot);
}
