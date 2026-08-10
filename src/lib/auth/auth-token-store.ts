import { randomBytes, randomUUID } from 'node:crypto';

import mongoose, { Schema, type Model } from 'mongoose';

import { connectToMongoDatabase } from '@/lib/db/mongodb';
import { AUTH_TOKEN_PATTERN, hashAuthToken } from '@/lib/auth/token';

export type AuthTokenPurpose = 'verify-email' | 'reset-password';

interface AuthTokenRecord {
  id: string;
  userId: string;
  email: string;
  purpose: AuthTokenPurpose;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
}

const AUTH_TOKEN_MODEL_NAME = 'AuthToken';
const AUTH_TOKEN_COLLECTION = 'auth_tokens';

const authTokenSchema = new Schema<AuthTokenRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    purpose: {
      type: String,
      enum: ['verify-email', 'reset-password'],
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  {
    collection: AUTH_TOKEN_COLLECTION,
    versionKey: false,
  }
);

authTokenSchema.index({ userId: 1, purpose: 1, createdAt: -1 });

function getAuthTokenModel(): Model<AuthTokenRecord> {
  return (
    (mongoose.models[AUTH_TOKEN_MODEL_NAME] as Model<AuthTokenRecord> | undefined) ??
    mongoose.model<AuthTokenRecord>(AUTH_TOKEN_MODEL_NAME, authTokenSchema)
  );
}

async function ensureAuthTokenModel() {
  await connectToMongoDatabase();
  return getAuthTokenModel();
}

export class AuthTokenCooldownError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super('AUTH_TOKEN_COOLDOWN');
    this.name = 'AuthTokenCooldownError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function issueAuthToken(input: {
  userId: string;
  email: string;
  purpose: AuthTokenPurpose;
  ttlSeconds: number;
  cooldownSeconds?: number;
}) {
  const Token = await ensureAuthTokenModel();
  const now = new Date();
  const cooldownSeconds = Math.max(0, Math.floor(input.cooldownSeconds ?? 0));

  if (cooldownSeconds > 0) {
    const latest = await Token.findOne({
      userId: input.userId,
      purpose: input.purpose,
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (latest) {
      const elapsedSeconds = Math.floor(
        (now.getTime() - new Date(latest.createdAt).getTime()) / 1000
      );
      if (elapsedSeconds < cooldownSeconds) {
        throw new AuthTokenCooldownError(cooldownSeconds - elapsedSeconds);
      }
    }
  }

  await Token.deleteMany({
    userId: input.userId,
    purpose: input.purpose,
  }).exec();

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(
    now.getTime() + Math.max(60, Math.floor(input.ttlSeconds)) * 1000
  );

  await Token.create({
    id: randomUUID(),
    userId: input.userId,
    email: input.email.trim().toLowerCase(),
    purpose: input.purpose,
    tokenHash: hashAuthToken(token),
    createdAt: now,
    expiresAt,
  });

  return {
    token,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function consumeAuthToken(
  token: string,
  purpose: AuthTokenPurpose
): Promise<AuthTokenRecord | null> {
  const normalizedToken = token.trim().toLowerCase();
  if (!AUTH_TOKEN_PATTERN.test(normalizedToken)) {
    return null;
  }

  const Token = await ensureAuthTokenModel();
  return Token.findOneAndDelete({
    tokenHash: hashAuthToken(normalizedToken),
    purpose,
    expiresAt: { $gt: new Date() },
  })
    .lean()
    .exec();
}

export async function deleteAuthTokensForUser(
  userId: string,
  purpose?: AuthTokenPurpose
) {
  const Token = await ensureAuthTokenModel();
  await Token.deleteMany({
    userId,
    ...(purpose ? { purpose } : {}),
  }).exec();
}
