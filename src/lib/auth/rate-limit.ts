import { createHash } from 'node:crypto';

import mongoose, { Schema, type Model } from 'mongoose';

import { connectToMongoDatabase } from '@/lib/db/mongodb';

interface AuthRateLimitRecord {
  key: string;
  count: number;
  resetAt: Date;
  updatedAt: Date;
}

const RATE_LIMIT_MODEL_NAME = 'AuthRateLimit';
const RATE_LIMIT_COLLECTION = 'auth_rate_limits';

const authRateLimitSchema = new Schema<AuthRateLimitRecord>(
  {
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, min: 0, required: true },
    resetAt: { type: Date, required: true, index: { expires: 0 } },
    updatedAt: { type: Date, required: true },
  },
  {
    collection: RATE_LIMIT_COLLECTION,
    versionKey: false,
  }
);

function getRateLimitModel(): Model<AuthRateLimitRecord> {
  return (
    (mongoose.models[RATE_LIMIT_MODEL_NAME] as
      | Model<AuthRateLimitRecord>
      | undefined) ??
    mongoose.model<AuthRateLimitRecord>(RATE_LIMIT_MODEL_NAME, authRateLimitSchema)
  );
}

async function ensureRateLimitModel() {
  await connectToMongoDatabase();
  return getRateLimitModel();
}

function buildRateLimitKey(action: string, identifier: string) {
  return `${action}:${createHash('sha256')
    .update(identifier.trim().toLowerCase())
    .digest('hex')}`;
}

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip');
  return ip?.trim() || 'unknown-client';
}

export async function checkAuthRateLimit(input: {
  action: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}) {
  const RateLimit = await ensureRateLimitModel();
  const key = buildRateLimitKey(input.action, input.identifier);
  const now = new Date();
  const limit = Math.max(1, Math.floor(input.limit));
  const windowSeconds = Math.max(1, Math.floor(input.windowSeconds));
  const existing = await RateLimit.findOne({ key }).lean().exec();

  let record: AuthRateLimitRecord | null;
  if (existing && new Date(existing.resetAt).getTime() > now.getTime()) {
    record = await RateLimit.findOneAndUpdate(
      { key, resetAt: existing.resetAt },
      {
        $inc: { count: 1 },
        $set: { updatedAt: now },
      },
      { new: true }
    )
      .lean()
      .exec();
  } else {
    const resetAt = new Date(now.getTime() + windowSeconds * 1000);
    record = await RateLimit.findOneAndUpdate(
      { key },
      {
        $set: {
          count: 1,
          resetAt,
          updatedAt: now,
        },
      },
      { upsert: true, new: true }
    )
      .lean()
      .exec();
  }

  const count = record?.count ?? 1;
  const resetAt = new Date(record?.resetAt ?? now);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((resetAt.getTime() - now.getTime()) / 1000)
    ),
  };
}
