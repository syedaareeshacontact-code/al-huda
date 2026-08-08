import { createHash } from 'node:crypto';

import mongoose, { Schema, type Model } from 'mongoose';

import { connectToMongoDatabase } from '../db/mongodb';
import type { PushDeliveryTracking } from './engagement-types';
import type { PushTrackingClaims } from './push-open-tracking';

export type PushDeliveryOwnerType = 'guest' | 'user';
export type PushDeliverySource =
  | 'scheduled'
  | 'admin-guest-broadcast'
  | 'admin-user-broadcast'
  | 'user-notification'
  | 'general';
export type PushDeliveryAuditStatus =
  | 'pending'
  | 'failed'
  | 'accepted'
  | 'displayed'
  | 'opened';

export interface StoredPushDeliveryAudit {
  deliveryId: string;
  ownerType: PushDeliveryOwnerType | null;
  ownerId: string | null;
  deviceId: string | null;
  endpointHash: string | null;
  source: PushDeliverySource | null;
  campaignId: string | null;
  notificationKind: string | null;
  status: PushDeliveryAuditStatus;
  acceptedAt: string | null;
  failedAt: string | null;
  displayedAt: string | null;
  openedAt: string | null;
  statusCode: number | null;
  errorMessage: string | null;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  purgeAt: Date | null;
}

export type PushDeliveryAuditForAdmin = Omit<
  StoredPushDeliveryAudit,
  'endpointHash' | 'purgeAt'
> & { endpointHash?: string | null };

export interface PushDeliveryOwnerRef {
  ownerType: PushDeliveryOwnerType;
  ownerId: string;
}

export interface RecordPushDeliveryPendingInput {
  tracking: PushDeliveryTracking;
  ownerType: PushDeliveryOwnerType;
  ownerId: string;
  deviceId?: string | null;
  endpoint?: string | null;
  source: PushDeliverySource;
  createdAt?: string;
}

export interface RecordPushDeliveryAcceptedInput {
  deliveryId: string;
  acceptedAt?: string;
  ownerType?: PushDeliveryOwnerType;
  ownerId?: string | null;
  deviceId?: string | null;
  endpoint?: string | null;
  source?: PushDeliverySource;
  campaignId?: string | null;
  notificationKind?: string | null;
}

export interface RecordPushDeliveryFailedInput {
  deliveryId: string;
  failedAt?: string;
  statusCode?: number | null;
  errorMessage?: string | null;
  disabled?: boolean;
  ownerType?: PushDeliveryOwnerType;
  ownerId?: string | null;
  deviceId?: string | null;
  endpoint?: string | null;
  source?: PushDeliverySource;
  campaignId?: string | null;
  notificationKind?: string | null;
}

export interface RecordPushDeliveryDisplayedInput {
  claims: PushTrackingClaims;
  displayedAt?: string;
}

export interface RecordPushDeliveryOpenedInput {
  claims: PushTrackingClaims;
  openedAt?: string;
}

const PUSH_DELIVERY_AUDIT_COLLECTION = 'push_delivery_audits';
const PUSH_DELIVERY_AUDIT_MODEL_NAME = 'PushDeliveryAudit';
const STATUS_ORDER: readonly PushDeliveryAuditStatus[] = [
  'pending',
  'failed',
  'accepted',
  'displayed',
  'opened',
];
const SOURCE_VALUES: readonly PushDeliverySource[] = [
  'scheduled',
  'admin-guest-broadcast',
  'admin-user-broadcast',
  'user-notification',
  'general',
];
const MAX_OWNER_REFS = 500;
const MAX_RECORDS_PER_OWNER = 50;
const MAX_RECENT_RECORDS = 5_000;
const AUDIT_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;

const pushDeliveryAuditSchema = new Schema<StoredPushDeliveryAudit>(
  {
    deliveryId: { type: String, required: true, unique: true, index: true },
    ownerType: {
      type: String,
      enum: ['guest', 'user'],
      default: null,
      index: true,
    },
    ownerId: { type: String, default: null, index: true },
    deviceId: { type: String, default: null, index: true },
    endpointHash: { type: String, default: null },
    source: {
      type: String,
      enum: SOURCE_VALUES,
      default: null,
      index: true,
    },
    campaignId: { type: String, default: null, index: true },
    notificationKind: { type: String, default: null },
    status: {
      type: String,
      enum: STATUS_ORDER,
      default: 'pending',
      index: true,
    },
    acceptedAt: { type: String, default: null },
    failedAt: { type: String, default: null },
    displayedAt: { type: String, default: null, index: true },
    openedAt: { type: String, default: null, index: true },
    statusCode: { type: Number, default: null },
    errorMessage: { type: String, default: null },
    disabled: { type: Boolean, default: false },
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true },
    purgeAt: { type: Date, default: null, expires: 0 },
  },
  {
    collection: PUSH_DELIVERY_AUDIT_COLLECTION,
    versionKey: false,
  }
);

pushDeliveryAuditSchema.index({ ownerType: 1, ownerId: 1, createdAt: -1 });
pushDeliveryAuditSchema.index({ campaignId: 1, createdAt: -1 });

function getPushDeliveryAuditModel(): Model<StoredPushDeliveryAudit> {
  return (
    (mongoose.models[PUSH_DELIVERY_AUDIT_MODEL_NAME] as
      | Model<StoredPushDeliveryAudit>
      | undefined) ??
    mongoose.model<StoredPushDeliveryAudit>(
      PUSH_DELIVERY_AUDIT_MODEL_NAME,
      pushDeliveryAuditSchema
    )
  );
}

async function ensurePushDeliveryAuditModel() {
  await connectToMongoDatabase();
  const PushDeliveryAudit = getPushDeliveryAuditModel();
  // This collection is created by the notification audit feature. Await the
  // unique deliveryId index before the first upsert so first-deploy receipts
  // cannot create duplicate delivery rows while indexes are still building.
  await PushDeliveryAudit.init();
  return PushDeliveryAudit;
}

function normalizeRequiredText(value: unknown, maxLength: number, field: string) {
  const normalized = String(value ?? '').trim().slice(0, maxLength);
  if (!normalized) {
    throw new TypeError(`${field} is required.`);
  }
  return normalized;
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeIsoDate(value: unknown, fallback = new Date()) {
  const parsed = new Date(String(value ?? ''));
  return Number.isNaN(parsed.getTime()) ? fallback.toISOString() : parsed.toISOString();
}

function normalizeStatusCode(value: unknown) {
  const statusCode = Number(value);
  return Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599
    ? statusCode
    : null;
}

function sanitizeErrorMessage(value: unknown) {
  const message = normalizeOptionalText(value, 500);
  if (!message) {
    return null;
  }

  return message
    .replace(/https?:\/\/\S+/gi, '[redacted-url]')
    .replace(/[A-Za-z0-9_-]{80,}/g, '[redacted-token]')
    .slice(0, 240);
}

function normalizeSource(value: unknown): PushDeliverySource {
  return SOURCE_VALUES.includes(value as PushDeliverySource)
    ? (value as PushDeliverySource)
    : 'general';
}

function normalizeStatus(value: unknown): PushDeliveryAuditStatus {
  return STATUS_ORDER.includes(value as PushDeliveryAuditStatus)
    ? (value as PushDeliveryAuditStatus)
    : 'pending';
}

function normalizeStoredPushDeliveryAudit(
  entry: StoredPushDeliveryAudit
): StoredPushDeliveryAudit {
  return {
    deliveryId: String(entry.deliveryId),
    ownerType:
      entry.ownerType === 'guest' || entry.ownerType === 'user'
        ? entry.ownerType
        : null,
    ownerId: normalizeOptionalText(entry.ownerId, 160),
    deviceId: normalizeOptionalText(entry.deviceId, 160),
    endpointHash: normalizeOptionalText(entry.endpointHash, 64),
    source: SOURCE_VALUES.includes(entry.source as PushDeliverySource)
      ? (entry.source as PushDeliverySource)
      : null,
    campaignId: normalizeOptionalText(entry.campaignId, 180),
    notificationKind: normalizeOptionalText(entry.notificationKind, 80),
    status: normalizeStatus(entry.status),
    acceptedAt: entry.acceptedAt ? String(entry.acceptedAt) : null,
    failedAt: entry.failedAt ? String(entry.failedAt) : null,
    displayedAt: entry.displayedAt ? String(entry.displayedAt) : null,
    openedAt: entry.openedAt ? String(entry.openedAt) : null,
    statusCode: normalizeStatusCode(entry.statusCode),
    errorMessage: sanitizeErrorMessage(entry.errorMessage),
    disabled: entry.disabled === true,
    createdAt: String(entry.createdAt),
    updatedAt: String(entry.updatedAt),
    purgeAt:
      entry.purgeAt instanceof Date && !Number.isNaN(entry.purgeAt.getTime())
        ? entry.purgeAt
        : null,
  };
}

export function hashPushDeliveryEndpoint(endpoint: string | null | undefined) {
  const normalized = String(endpoint ?? '').trim();
  return normalized
    ? createHash('sha256').update(normalized).digest('hex')
    : null;
}

export function advancePushDeliveryAuditStatus(
  current: PushDeliveryAuditStatus | null | undefined,
  next: PushDeliveryAuditStatus
) {
  const currentStatus = normalizeStatus(current);
  return STATUS_ORDER.indexOf(next) > STATUS_ORDER.indexOf(currentStatus)
    ? next
    : currentStatus;
}

function literal(value: unknown) {
  return { $literal: value };
}

function fillMissingExpression(field: keyof StoredPushDeliveryAudit, value: unknown) {
  return {
    $ifNull: [`$${field}`, value === null ? null : literal(value)],
  };
}

function earliestDateExpression(
  field: keyof StoredPushDeliveryAudit,
  value: string
) {
  return {
    $cond: [
      {
        $or: [
          { $eq: [{ $type: `$${field}` }, 'missing'] },
          { $eq: [`$${field}`, null] },
          { $gt: [`$${field}`, literal(value)] },
        ],
      },
      literal(value),
      `$${field}`,
    ],
  };
}

function statusExpression(next: PushDeliveryAuditStatus) {
  return {
    $let: {
      vars: {
        currentStatus: {
          $cond: [
            { $in: ['$status', STATUS_ORDER] },
            '$status',
            'pending',
          ],
        },
      },
      in: {
        $cond: [
          {
            $lt: [
              { $indexOfArray: [STATUS_ORDER, '$$currentStatus'] },
              STATUS_ORDER.indexOf(next),
            ],
          },
          next,
          '$$currentStatus',
        ],
      },
    },
  };
}

interface AuditEventInput {
  deliveryId: string;
  status: PushDeliveryAuditStatus;
  eventAt: string;
  ownerType?: PushDeliveryOwnerType | null;
  ownerId?: string | null;
  deviceId?: string | null;
  endpointHash?: string | null;
  source?: PushDeliverySource | null;
  campaignId?: string | null;
  notificationKind?: string | null;
  statusCode?: number | null;
  errorMessage?: string | null;
  disabled?: boolean;
}

function buildAuditUpdatePipeline(input: AuditEventInput, updatedAt: string) {
  const eventTimestampField =
    input.status === 'accepted'
      ? 'acceptedAt'
      : input.status === 'failed'
        ? 'failedAt'
        : input.status === 'displayed'
          ? 'displayedAt'
          : input.status === 'opened'
            ? 'openedAt'
            : null;
  const setStage: Record<string, unknown> = {
    deliveryId: fillMissingExpression('deliveryId', input.deliveryId),
    ownerType: fillMissingExpression('ownerType', input.ownerType ?? null),
    ownerId: fillMissingExpression('ownerId', input.ownerId ?? null),
    deviceId: fillMissingExpression('deviceId', input.deviceId ?? null),
    endpointHash: fillMissingExpression(
      'endpointHash',
      input.endpointHash ?? null
    ),
    source: fillMissingExpression('source', input.source ?? null),
    campaignId: fillMissingExpression('campaignId', input.campaignId ?? null),
    notificationKind: fillMissingExpression(
      'notificationKind',
      input.notificationKind ?? null
    ),
    status: statusExpression(input.status),
    statusCode: fillMissingExpression('statusCode', input.statusCode ?? null),
    errorMessage: fillMissingExpression(
      'errorMessage',
      input.errorMessage ?? null
    ),
    disabled: input.disabled
      ? true
      : { $ifNull: ['$disabled', false] },
    createdAt: earliestDateExpression('createdAt', input.eventAt),
    updatedAt: literal(updatedAt),
    purgeAt: fillMissingExpression(
      'purgeAt',
      new Date(Date.parse(input.eventAt) + AUDIT_RETENTION_MS)
    ),
  };

  if (eventTimestampField) {
    setStage[eventTimestampField] = earliestDateExpression(
      eventTimestampField as keyof StoredPushDeliveryAudit,
      input.eventAt
    );
  }
  if (input.status === 'opened') {
    // An open is also proof that the browser displayed the notification.
    setStage.displayedAt = earliestDateExpression('displayedAt', input.eventAt);
  }

  return [{ $set: setStage }];
}

function isDuplicateKeyError(error: unknown) {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    Number((error as { code?: unknown }).code) === 11000
  );
}

async function recordPushDeliveryAuditEvent(input: AuditEventInput) {
  const PushDeliveryAudit = await ensurePushDeliveryAuditModel();
  const deliveryId = normalizeRequiredText(input.deliveryId, 80, 'deliveryId');
  const eventAt = normalizeIsoDate(input.eventAt);
  const normalizedInput: AuditEventInput = {
    ...input,
    deliveryId,
    eventAt,
    ownerId: normalizeOptionalText(input.ownerId, 160),
    deviceId: normalizeOptionalText(input.deviceId, 160),
    endpointHash: normalizeOptionalText(input.endpointHash, 64),
    campaignId: normalizeOptionalText(input.campaignId, 180),
    notificationKind: normalizeOptionalText(input.notificationKind, 80),
    source: input.source ? normalizeSource(input.source) : null,
    statusCode: normalizeStatusCode(input.statusCode),
    errorMessage: sanitizeErrorMessage(input.errorMessage),
  };
  const pipeline = buildAuditUpdatePipeline(
    normalizedInput,
    new Date().toISOString()
  );
  const receiptField =
    input.status === 'displayed'
      ? 'displayedAt'
      : input.status === 'opened'
        ? 'openedAt'
        : null;
  const filter = receiptField
    ? {
        deliveryId,
        $or: [
          { [receiptField]: null },
          { [receiptField]: { $exists: false } },
        ],
      }
    : { deliveryId };
  let recorded = true;

  try {
    const result = await PushDeliveryAudit.updateOne(
      filter,
      pipeline,
      { upsert: true, updatePipeline: true }
    ).exec();
    if (receiptField) {
      recorded = result.modifiedCount > 0 || result.upsertedCount > 0;
    }
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    // A concurrent first event can win the unique-key upsert. Re-apply this
    // monotonic event to the record that now exists.
    await PushDeliveryAudit.updateOne(
      { deliveryId },
      pipeline,
      { updatePipeline: true }
    ).exec();
    if (receiptField) {
      // The unique-key conflict means another request already claimed this
      // receipt. Re-apply the monotonic pipeline only to preserve an earlier
      // timestamp; aggregate counters remain independently idempotent.
      recorded = false;
    }
  }

  const stored = await PushDeliveryAudit.findOne(
    { deliveryId },
    { _id: 0 }
  )
    .lean<StoredPushDeliveryAudit>()
    .exec();
  return {
    audit: stored ? normalizeStoredPushDeliveryAudit(stored) : null,
    recorded,
  };
}

export function recordPushDeliveryPending(
  input: RecordPushDeliveryPendingInput
) {
  const createdAt = normalizeIsoDate(input.createdAt);
  return recordPushDeliveryAuditEvent({
    deliveryId: input.tracking.deliveryId,
    status: 'pending',
    eventAt: createdAt,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    deviceId: input.deviceId,
    endpointHash: hashPushDeliveryEndpoint(input.endpoint),
    source: normalizeSource(input.source),
    campaignId: input.tracking.campaignId,
    notificationKind: input.tracking.notificationKind,
  });
}

export function recordPushDeliveryAccepted(
  input: RecordPushDeliveryAcceptedInput
) {
  const acceptedAt = normalizeIsoDate(input.acceptedAt);
  return recordPushDeliveryAuditEvent({
    deliveryId: input.deliveryId,
    status: 'accepted',
    eventAt: acceptedAt,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    deviceId: input.deviceId,
    endpointHash: hashPushDeliveryEndpoint(input.endpoint),
    source: input.source,
    campaignId: input.campaignId,
    notificationKind: input.notificationKind,
  });
}

export function recordPushDeliveryFailed(input: RecordPushDeliveryFailedInput) {
  const failedAt = normalizeIsoDate(input.failedAt);
  return recordPushDeliveryAuditEvent({
    deliveryId: input.deliveryId,
    status: 'failed',
    eventAt: failedAt,
    statusCode: input.statusCode,
    errorMessage: input.errorMessage,
    disabled: input.disabled === true,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    deviceId: input.deviceId,
    endpointHash: hashPushDeliveryEndpoint(input.endpoint),
    source: input.source,
    campaignId: input.campaignId,
    notificationKind: input.notificationKind,
  });
}

function getClaimsMetadata(claims: PushTrackingClaims) {
  return {
    deliveryId: claims.deliveryId,
    ownerType: claims.ownerType,
    ownerId: claims.ownerId,
    endpointHash: claims.ownerType === 'user' ? claims.endpointHash : null,
    campaignId: claims.campaignId,
    notificationKind: claims.notificationKind,
  };
}

export function recordPushDeliveryDisplayed(
  input: RecordPushDeliveryDisplayedInput
) {
  const displayedAt = normalizeIsoDate(input.displayedAt);
  return recordPushDeliveryAuditEvent({
    ...getClaimsMetadata(input.claims),
    status: 'displayed',
    eventAt: displayedAt,
  });
}

export function recordPushDeliveryOpened(input: RecordPushDeliveryOpenedInput) {
  const openedAt = normalizeIsoDate(input.openedAt);
  return recordPushDeliveryAuditEvent({
    ...getClaimsMetadata(input.claims),
    status: 'opened',
    eventAt: openedAt,
  });
}

function clampInteger(value: unknown, fallback: number, maximum: number) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
}

export async function listRecentPushDeliveryAuditsForOwners(
  ownerRefs: PushDeliveryOwnerRef[],
  options: {
    limitPerOwner?: number;
    limit?: number;
    includeEndpointHash?: boolean;
  } = {}
): Promise<PushDeliveryAuditForAdmin[]> {
  const normalizedRefs = Array.from(
    new Map(
      ownerRefs
        .filter(
          (entry) =>
            entry?.ownerType === 'guest' || entry?.ownerType === 'user'
        )
        .map((entry) => ({
          ownerType: entry.ownerType,
          ownerId: normalizeOptionalText(entry.ownerId, 160),
        }))
        .filter((entry) => Boolean(entry.ownerId))
        .map((entry) => [
          `${entry.ownerType}:${entry.ownerId}`,
          entry as { ownerType: PushDeliveryOwnerType; ownerId: string },
        ])
    ).values()
  ).slice(0, MAX_OWNER_REFS);

  if (normalizedRefs.length === 0) {
    return [];
  }

  const limitPerOwner = clampInteger(
    options.limitPerOwner,
    10,
    MAX_RECORDS_PER_OWNER
  );
  const defaultLimit = Math.min(
    normalizedRefs.length * limitPerOwner,
    MAX_RECENT_RECORDS
  );
  const limit = clampInteger(options.limit, defaultLimit, MAX_RECENT_RECORDS);
  const PushDeliveryAudit = await ensurePushDeliveryAuditModel();
  const entries = await PushDeliveryAudit.aggregate<PushDeliveryAuditForAdmin>([
    {
      $match: {
        $or: normalizedRefs,
      },
    },
    {
      $setWindowFields: {
        partitionBy: {
          ownerType: '$ownerType',
          ownerId: '$ownerId',
        },
        // MongoDB requires exactly one top-level sort field when
        // $documentNumber is used.
        sortBy: { createdAt: -1 },
        output: {
          ownerRank: { $documentNumber: {} },
        },
      },
    },
    { $match: { ownerRank: { $lte: limitPerOwner } } },
    { $sort: { createdAt: -1, deliveryId: 1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        ownerRank: 0,
        purgeAt: 0,
        ...(options.includeEndpointHash ? {} : { endpointHash: 0 }),
      },
    },
  ]).exec();

  return entries.map((entry) => {
    const normalized = normalizeStoredPushDeliveryAudit({
      ...entry,
      endpointHash: entry.endpointHash ?? null,
      purgeAt: null,
    });
    const {
      endpointHash: _endpointHash,
      purgeAt: _purgeAt,
      ...safeEntry
    } = normalized;
    return options.includeEndpointHash
      ? { ...safeEntry, endpointHash: normalized.endpointHash }
      : safeEntry;
  });
}
