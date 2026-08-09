import mongoose, { Schema, type Model } from 'mongoose';

import { connectToMongoDatabase } from '@/lib/db/mongodb';
import {
  getSiteVisitCutoffIso,
  shouldCountSiteVisit,
} from '@/lib/push/site-visit-tracking';

export type SiteDeviceContentPreference = 'hadith' | 'quran' | 'balanced';

export interface StoredSiteDevice {
  deviceId: string;
  userId: string | null;
  userAgent: string | null;
  timeZone: string | null;
  contentPreference: SiteDeviceContentPreference;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
  totalVisitCount: number;
  lastVisitAt: string | null;
}

export interface SiteDeviceVisitForAdmin {
  deviceId: string;
  totalVisitCount: number;
  lastVisitAt: string | null;
}

const SITE_DEVICES_COLLECTION = 'site_devices';
const SITE_DEVICE_MODEL_NAME = 'SiteDevice';

const siteDeviceSchema = new Schema<StoredSiteDevice>(
  {
    deviceId: { type: String, required: true, unique: true, index: true, trim: true },
    userId: { type: String, default: null, index: true },
    userAgent: { type: String, default: null },
    timeZone: { type: String, default: null },
    contentPreference: {
      type: String,
      enum: ['hadith', 'quran', 'balanced'],
      default: 'balanced',
    },
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true },
    lastSeenAt: { type: String, required: true, index: true },
    totalVisitCount: { type: Number, min: 0, default: 0 },
    lastVisitAt: { type: String, default: null, index: true },
  },
  {
    collection: SITE_DEVICES_COLLECTION,
    versionKey: false,
  }
);

function getSiteDeviceModel(): Model<StoredSiteDevice> {
  return (
    (mongoose.models[SITE_DEVICE_MODEL_NAME] as Model<StoredSiteDevice> | undefined) ??
    mongoose.model<StoredSiteDevice>(SITE_DEVICE_MODEL_NAME, siteDeviceSchema)
  );
}

async function ensureSiteDeviceModel() {
  await connectToMongoDatabase();
  return getSiteDeviceModel();
}

function normalizeTimeZone(value: unknown) {
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

function normalizeContentPreference(value: unknown): SiteDeviceContentPreference {
  if (value === 'hadith' || value === 'quran') {
    return value;
  }
  return 'balanced';
}

function normalizeCount(value: unknown) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export async function recordSiteDeviceVisit(input: {
  deviceId: string;
  userId?: string | null;
  userAgent?: string | null;
  timeZone?: string | null;
  contentPreference?: SiteDeviceContentPreference;
  visitedAt?: string;
}) {
  const SiteDevice = await ensureSiteDeviceModel();
  const visitedAt = input.visitedAt ?? new Date().toISOString();
  const userId = String(input.userId ?? '').trim() || null;
  const metadata = {
    userId,
    userAgent: input.userAgent?.trim().slice(0, 320) || null,
    timeZone: normalizeTimeZone(input.timeZone),
    contentPreference: normalizeContentPreference(input.contentPreference),
    updatedAt: visitedAt,
    lastSeenAt: visitedAt,
  };

  const existing = await SiteDevice.findOneAndUpdate(
    { deviceId: input.deviceId },
    {
      $set: metadata,
      $setOnInsert: {
        deviceId: input.deviceId,
        createdAt: visitedAt,
        totalVisitCount: 0,
        lastVisitAt: null,
      },
    },
    { new: true, upsert: true }
  )
    .lean<StoredSiteDevice>()
    .exec();

  const shouldCount = shouldCountSiteVisit(existing?.lastVisitAt, visitedAt);
  if (!shouldCount) {
    return { counted: false, totalVisitCount: normalizeCount(existing?.totalVisitCount) };
  }

  const countResult = await SiteDevice.findOneAndUpdate(
    {
      deviceId: input.deviceId,
      $or: [
        { lastVisitAt: null },
        { lastVisitAt: { $exists: false } },
        { lastVisitAt: { $lt: getSiteVisitCutoffIso(visitedAt) } },
      ],
    },
    {
      $inc: { totalVisitCount: 1 },
      $set: {
        ...metadata,
        lastVisitAt: visitedAt,
      },
    },
    { new: true }
  )
    .lean<StoredSiteDevice>()
    .exec();

  return {
    counted: Boolean(countResult),
    totalVisitCount: normalizeCount(countResult?.totalVisitCount ?? existing?.totalVisitCount),
  };
}

export async function listSiteDeviceVisitsForAdmin(
  deviceIds: string[]
): Promise<SiteDeviceVisitForAdmin[]> {
  const uniqueDeviceIds = Array.from(
    new Set(deviceIds.map((deviceId) => String(deviceId).trim()).filter(Boolean))
  );
  if (uniqueDeviceIds.length === 0) {
    return [];
  }

  const SiteDevice = await ensureSiteDeviceModel();
  const entries = await SiteDevice.find(
    { deviceId: { $in: uniqueDeviceIds } },
    { _id: 0, deviceId: 1, totalVisitCount: 1, lastVisitAt: 1 }
  )
    .lean<SiteDeviceVisitForAdmin[]>()
    .exec();

  return entries.map((entry) => ({
    deviceId: String(entry.deviceId),
    totalVisitCount: normalizeCount(entry.totalVisitCount),
    lastVisitAt: entry.lastVisitAt ? String(entry.lastVisitAt) : null,
  }));
}

export async function deleteSiteDevicesForUser(userId: string) {
  const SiteDevice = await ensureSiteDeviceModel();
  const result = await SiteDevice.deleteMany({ userId }).exec();
  return result.deletedCount;
}
