import { createHash, randomUUID } from 'node:crypto';

import mongoose, { Schema, type Model } from 'mongoose';

import { hashPassword } from '@/lib/auth/password';
import { connectToMongoDatabase } from '@/lib/db/mongodb';
import { deleteSiteDevicesForUser } from '@/lib/engagement/site-device-store';
import { deleteFeedbackForUser } from '@/lib/feedback-store';
import { deletePushDeliveryAuditsForUser } from '@/lib/push/push-delivery-audit-store';
import { buildBookmarkId } from '@/lib/quran-utils';
import {
  normalizePushContentPreference,
  type PushDeliveryTracking,
  type PushContentPreference,
  type PushEngagementKind,
} from '@/lib/push/engagement-types';
import { shouldCountSiteVisit } from '@/lib/push/site-visit-tracking';
import type { NotificationPriority, NotificationType, UserNotification } from '@/types/notifications';
import type { AppSettings, ThemeMode, UserSettings } from '@/types/settings';

export interface StoredAyahBookmark {
  id: string;
  surahId: number;
  ayahNumber: number;
  text: string;
  createdAt: string;
}

export interface StoredLastReadEntry {
  surahId: number;
  ayahNumber: number;
  updatedAt: string;
}

export interface StoredPushSubscription {
  deviceId: string | null;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string | null;
  timeZone: string | null;
  contentPreference: PushContentPreference;
  enabled: boolean;
  quranReminderEnabled: boolean;
  intervalMinutes: number;
  lastReminderAt: string | null;
  lastEngagementAt: string | null;
  lastEngagementKind: PushEngagementKind | null;
  lastSentAt: string | null;
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
  acceptedDeliveryIds: string[];
  displayedDeliveryIds: string[];
  openedDeliveryIds: string[];
  failureCount: number;
  createdAt: string;
  lastSeenAt: string;
  updatedAt: string;
}

export type UserTrafficSource = 'instagram';
const PUSH_DELIVERY_ID_RETENTION_LIMIT = 512;

export interface PushSubscriptionForDelivery extends StoredPushSubscription {
  userId: string;
  userName: string;
  userLastRead?: StoredLastReadEntry | null;
}

export interface AdminUserPushDevice {
  id: string;
  ownerType: 'user';
  endpointHash: string;
  deviceId: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  imageUrl: string | null;
  userAgent: string | null;
  timeZone: string | null;
  contentPreference: PushContentPreference;
  enabled: boolean;
  quranReminderEnabled: boolean;
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
}

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  updatedAt: string;
  loginCount: number;
  lastLoginAt: string | null;
  acquisitionSource: UserTrafficSource | null;
  lastLoginSource: UserTrafficSource | null;
  trafficSources: UserTrafficSource[];
  totalSessionSeconds: number;
  totalAudioSeconds: number;
  favoriteSurahIds: number[];
  bookmarkedAyahs: StoredAyahBookmark[];
  lastRead: StoredLastReadEntry | null;
  settings: UserSettings;
  notifications: UserNotification[];
  pushSubscriptions: StoredPushSubscription[];
}

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  loginCount: number;
  lastLoginAt: string | null;
  acquisitionSource: UserTrafficSource | null;
  lastLoginSource: UserTrafficSource | null;
  trafficSources: UserTrafficSource[];
  totalSessionSeconds: number;
  totalAudioSeconds: number;
  favoriteSurahIds: number[];
  bookmarkedAyahs: StoredAyahBookmark[];
  lastRead: StoredLastReadEntry | null;
  settings: UserSettings;
  unreadNotifications: number;
}

const MIN_SURAH_ID = 1;
const MAX_SURAH_ID = 114;
const MAX_AYAH_NUMBER = 286;
const MAX_NOTIFICATIONS_PER_USER = 80;
const MAX_PUSH_SUBSCRIPTIONS_PER_USER = 8;
const USERS_COLLECTION = 'users';
const USER_MODEL_NAME = 'AuthUser';
export const ADMIN_EMAIL = 'zainqlandar@gmail.com';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  readingMode: 'ayah',
  arabicFont: 'uthmaniHafs',
  arabicFontScale: 1.1,
  audioPreference: 'ar',
  autoPlayAudio: false,
  themeMode: 'dark',
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeImageUrl(value: unknown) {
  const imageUrl = String(value ?? '').trim();
  if (!imageUrl) {
    return null;
  }

  try {
    const url = new URL(imageUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
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

function normalizeThemeMode(value: unknown): ThemeMode {
  return value === 'light' || value === 'system' ? value : 'dark';
}

function normalizeUserTrafficSource(value: unknown): UserTrafficSource | null {
  return value === 'instagram' ? 'instagram' : null;
}

function normalizeUserTrafficSources(value: unknown): UserTrafficSource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => normalizeUserTrafficSource(entry))
        .filter((entry): entry is UserTrafficSource => entry !== null)
    )
  );
}

function clampArabicFontScale(value: unknown) {
  const numeric = Number(value);
  return Math.max(
    0.9,
    Math.min(
      1.9,
      Number.isFinite(numeric) ? numeric : DEFAULT_USER_SETTINGS.arabicFontScale
    )
  );
}

export function normalizeUserSettings(input: unknown): UserSettings {
  const candidate =
    input && typeof input === 'object' ? (input as Partial<UserSettings>) : {};

  return {
    readingMode: candidate.readingMode === 'continuous' ? 'continuous' : 'ayah',
    arabicFont:
      candidate.arabicFont === 'amiriQuran' ||
      candidate.arabicFont === 'notoNaskh' ||
      candidate.arabicFont === 'scheherazade'
        ? candidate.arabicFont
        : 'uthmaniHafs',
    arabicFontScale: clampArabicFontScale(candidate.arabicFontScale),
    audioPreference: candidate.audioPreference === 'tr' ? 'tr' : 'ar',
    autoPlayAudio: Boolean(candidate.autoPlayAudio),
    themeMode: normalizeThemeMode(candidate.themeMode),
  };
}

function normalizeSurahId(value: unknown) {
  const surahId = Number(value);
  if (!Number.isInteger(surahId)) {
    return null;
  }

  if (surahId < MIN_SURAH_ID || surahId > MAX_SURAH_ID) {
    return null;
  }

  return surahId;
}

function normalizeAyahNumber(value: unknown) {
  const ayahNumber = Number(value);
  if (!Number.isInteger(ayahNumber)) {
    return null;
  }

  if (ayahNumber < 1 || ayahNumber > MAX_AYAH_NUMBER) {
    return null;
  }

  return ayahNumber;
}

function normalizeFavoriteSurahIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => normalizeSurahId(entry))
        .filter((entry): entry is number => entry !== null)
    )
  ).sort((left, right) => left - right);
}

function normalizeBookmarkedAyah(raw: unknown): StoredAyahBookmark | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  const surahId = normalizeSurahId(candidate.surahId);
  const ayahNumber = normalizeAyahNumber(candidate.ayahNumber);

  if (!surahId || !ayahNumber) {
    return null;
  }

  const id = buildBookmarkId(surahId, ayahNumber);
  const createdAt = String(candidate.createdAt ?? new Date().toISOString());
  const text = String(candidate.text ?? '').trim();

  return {
    id,
    surahId,
    ayahNumber,
    text,
    createdAt,
  };
}

function normalizeBookmarkedAyahs(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const byId = new Map<string, StoredAyahBookmark>();
  value.forEach((entry) => {
    const normalized = normalizeBookmarkedAyah(entry);
    if (!normalized) {
      return;
    }

    byId.set(normalized.id, normalized);
  });

  return Array.from(byId.values()).sort((left, right) => {
    return right.createdAt.localeCompare(left.createdAt);
  });
}

function normalizeLastRead(value: unknown): StoredLastReadEntry | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const surahId = normalizeSurahId(candidate.surahId);
  const ayahNumber = normalizeAyahNumber(candidate.ayahNumber);

  if (!surahId || !ayahNumber) {
    return null;
  }

  const updatedAtRaw = String(candidate.updatedAt ?? new Date().toISOString());
  const updatedAtDate = new Date(updatedAtRaw);
  const updatedAt = Number.isNaN(updatedAtDate.getTime())
    ? new Date().toISOString()
    : updatedAtDate.toISOString();

  return {
    surahId,
    ayahNumber,
    updatedAt,
  };
}

function normalizeNotificationType(value: unknown): NotificationType {
  return value === 'prayer' ||
    value === 'quran' ||
    value === 'bookmark' ||
    value === 'audio' ||
    value === 'islamic'
    ? value
    : 'system';
}

function normalizeNotificationPriority(value: unknown): NotificationPriority {
  return value === 'low' || value === 'high' ? value : 'normal';
}

function normalizeNotificationMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const metadata: Record<string, string | number | boolean | null> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
      metadata[key] = entry;
    }

    if (entry === null) {
      metadata[key] = null;
    }
  });
  return metadata;
}

function normalizeIsoDate(value: unknown, fallback = new Date().toISOString()) {
  const raw = String(value ?? fallback);
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function normalizeUserNotification(raw: unknown): UserNotification | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  const id = String(candidate.id ?? '').trim();
  const title = String(candidate.title ?? '').trim().slice(0, 120);
  const message = String(candidate.message ?? '').trim().slice(0, 420);

  if (!id || !title || !message) {
    return null;
  }

  const href = String(candidate.href ?? '').trim();
  const readAt =
    candidate.readAt === null || candidate.readAt === undefined || candidate.readAt === ''
      ? null
      : normalizeIsoDate(candidate.readAt);

  return {
    id,
    type: normalizeNotificationType(candidate.type),
    priority: normalizeNotificationPriority(candidate.priority),
    title,
    message,
    href: href || null,
    createdAt: normalizeIsoDate(candidate.createdAt),
    readAt,
    metadata: normalizeNotificationMetadata(candidate.metadata),
  };
}

function normalizeUserNotifications(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const byId = new Map<string, UserNotification>();
  value.forEach((entry) => {
    const notification = normalizeUserNotification(entry);
    if (notification) {
      byId.set(notification.id, notification);
    }
  });

  return Array.from(byId.values())
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, MAX_NOTIFICATIONS_PER_USER);
}

function normalizePushSubscription(raw: unknown): StoredPushSubscription | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  const endpoint = String(candidate.endpoint ?? '').trim();
  const rawKeys =
    candidate.keys && typeof candidate.keys === 'object'
      ? (candidate.keys as Record<string, unknown>)
      : {};
  const p256dh = String(rawKeys.p256dh ?? '').trim();
  const auth = String(rawKeys.auth ?? '').trim();

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  const intervalMinutes = Math.max(
    2,
    Math.min(1440, Math.floor(Number(candidate.intervalMinutes ?? 2) || 2))
  );
  const createdAt = String(candidate.createdAt ?? new Date().toISOString());
  const updatedAt = String(candidate.updatedAt ?? createdAt);
  const lastSeenAt = String(candidate.lastSeenAt ?? createdAt);

  return {
    deviceId: candidate.deviceId ? String(candidate.deviceId).trim().slice(0, 80) : null,
    endpoint,
    keys: { p256dh, auth },
    userAgent: candidate.userAgent ? String(candidate.userAgent).slice(0, 320) : null,
    timeZone: normalizeTimeZone(candidate.timeZone),
    contentPreference: normalizePushContentPreference(
      candidate.contentPreference,
      'balanced'
    ),
    enabled: candidate.enabled !== false,
    quranReminderEnabled: candidate.quranReminderEnabled !== false,
    intervalMinutes,
    lastReminderAt:
      candidate.lastReminderAt === null || candidate.lastReminderAt === undefined
        ? null
        : String(candidate.lastReminderAt),
    lastEngagementAt:
      candidate.lastEngagementAt === null || candidate.lastEngagementAt === undefined
        ? null
        : String(candidate.lastEngagementAt),
    lastEngagementKind:
      candidate.lastEngagementKind === 'hadith' ||
      candidate.lastEngagementKind === 'quran' ||
      candidate.lastEngagementKind === 'islamic'
        ? candidate.lastEngagementKind
        : null,
    lastSentAt:
      candidate.lastSentAt === null || candidate.lastSentAt === undefined
        ? null
        : String(candidate.lastSentAt),
    notificationSentCount: Math.max(
      0,
      Math.floor(Number(candidate.notificationSentCount ?? 0) || 0)
    ),
    notificationTrackedSentCount: Math.max(
      0,
      Math.floor(Number(candidate.notificationTrackedSentCount ?? 0) || 0)
    ),
    notificationDisplayedCount: Math.max(
      0,
      Math.floor(Number(candidate.notificationDisplayedCount ?? 0) || 0)
    ),
    notificationVisitCount: Math.max(
      0,
      Math.floor(Number(candidate.notificationVisitCount ?? 0) || 0)
    ),
    notificationTrackedVisitCount: Math.max(
      0,
      Math.floor(Number(candidate.notificationTrackedVisitCount ?? 0) || 0)
    ),
    siteVisitCount: Math.max(
      0,
      Math.floor(Number(candidate.siteVisitCount ?? 0) || 0)
    ),
    lastSiteVisitAt:
      candidate.lastSiteVisitAt === null || candidate.lastSiteVisitAt === undefined
        ? null
        : String(candidate.lastSiteVisitAt),
    lastNotificationVisitAt:
      candidate.lastNotificationVisitAt === null ||
      candidate.lastNotificationVisitAt === undefined
        ? null
        : String(candidate.lastNotificationVisitAt),
    lastNotificationDisplayedAt:
      candidate.lastNotificationDisplayedAt === null ||
      candidate.lastNotificationDisplayedAt === undefined
        ? null
        : String(candidate.lastNotificationDisplayedAt),
    lastNotificationCampaignId: candidate.lastNotificationCampaignId
      ? String(candidate.lastNotificationCampaignId).slice(0, 180)
      : null,
    lastNotificationKind: candidate.lastNotificationKind
      ? String(candidate.lastNotificationKind).slice(0, 80)
      : null,
    acceptedDeliveryIds: Array.isArray(candidate.acceptedDeliveryIds)
      ? Array.from(
          new Set(
            candidate.acceptedDeliveryIds
              .map((value) => String(value).trim())
              .filter(Boolean)
          )
        ).slice(-PUSH_DELIVERY_ID_RETENTION_LIMIT)
      : [],
    displayedDeliveryIds: Array.isArray(candidate.displayedDeliveryIds)
      ? Array.from(
          new Set(
            candidate.displayedDeliveryIds
              .map((value) => String(value).trim())
              .filter(Boolean)
          )
        ).slice(-PUSH_DELIVERY_ID_RETENTION_LIMIT)
      : [],
    openedDeliveryIds: Array.isArray(candidate.openedDeliveryIds)
      ? Array.from(
          new Set(
            candidate.openedDeliveryIds
              .map((value) => String(value).trim())
              .filter(Boolean)
          )
        ).slice(-PUSH_DELIVERY_ID_RETENTION_LIMIT)
      : [],
    failureCount: Math.max(0, Math.floor(Number(candidate.failureCount ?? 0) || 0)),
    createdAt,
    lastSeenAt,
    updatedAt,
  };
}

function comparePushSubscriptionRecency(
  left: StoredPushSubscription,
  right: StoredPushSubscription
) {
  const seenComparison = right.lastSeenAt.localeCompare(left.lastSeenAt);
  return seenComparison || right.updatedAt.localeCompare(left.updatedAt);
}

function normalizePushSubscriptions(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const byEndpoint = new Map<string, StoredPushSubscription>();
  for (const entry of value) {
    const subscription = normalizePushSubscription(entry);
    if (subscription) {
      byEndpoint.set(subscription.endpoint, subscription);
    }
  }

  return Array.from(byEndpoint.values())
    .sort(comparePushSubscriptionRecency)
    .slice(0, MAX_PUSH_SUBSCRIPTIONS_PER_USER);
}

function createSystemNotification(input: {
  type?: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  href?: string | null;
  metadata?: UserNotification['metadata'];
}): UserNotification {
  return {
    id: randomUUID(),
    type: input.type ?? 'system',
    priority: input.priority ?? 'normal',
    title: input.title,
    message: input.message,
    href: input.href ?? null,
    createdAt: new Date().toISOString(),
    readAt: null,
    metadata: input.metadata ?? {},
  };
}

function buildInitialNotifications(name: string): UserNotification[] {
  return [
    createSystemNotification({
      type: 'system',
      priority: 'normal',
      title: `Welcome, ${name}`,
      message: 'Your Quran progress, bookmarks, reminders, and reading preferences are now saved with your account.',
      href: '/surah',
    }),
    createSystemNotification({
      type: 'prayer',
      priority: 'high',
      title: 'Prayer reminders are ready',
      message: 'Open the notification bell to enable sound and configure daily Salah reminders.',
      href: '/prayer-times',
      metadata: { setup: true },
    }),
  ];
}

function normalizeStoredUser(raw: unknown): StoredUser | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  const id = String(candidate.id ?? '').trim();
  const name = String(candidate.name ?? '').trim();
  const email = normalizeEmail(String(candidate.email ?? ''));
  const passwordHash = String(candidate.passwordHash ?? '');
  const passwordSalt = String(candidate.passwordSalt ?? '');
  const createdAt = String(candidate.createdAt ?? '');

  if (!id || !name || !email || !passwordHash || !passwordSalt || !createdAt) {
    return null;
  }

  return {
    id,
    name,
    email,
    imageUrl: normalizeImageUrl(candidate.imageUrl),
    passwordHash,
    passwordSalt,
    createdAt,
    updatedAt: String(candidate.updatedAt ?? createdAt),
    loginCount: Number(candidate.loginCount ?? 0) || 0,
    lastLoginAt:
      candidate.lastLoginAt === null || candidate.lastLoginAt === undefined
        ? null
        : String(candidate.lastLoginAt),
    acquisitionSource: normalizeUserTrafficSource(candidate.acquisitionSource),
    lastLoginSource: normalizeUserTrafficSource(candidate.lastLoginSource),
    trafficSources: normalizeUserTrafficSources(candidate.trafficSources),
    totalSessionSeconds: Number(candidate.totalSessionSeconds ?? 0) || 0,
    totalAudioSeconds: Number(candidate.totalAudioSeconds ?? 0) || 0,
    favoriteSurahIds: normalizeFavoriteSurahIds(candidate.favoriteSurahIds),
    bookmarkedAyahs: normalizeBookmarkedAyahs(
      candidate.bookmarkedAyahs ?? candidate.bookmarks
    ),
    lastRead: normalizeLastRead(candidate.lastRead),
    settings: normalizeUserSettings(candidate.settings),
    notifications: normalizeUserNotifications(candidate.notifications),
    pushSubscriptions: normalizePushSubscriptions(candidate.pushSubscriptions),
  };
}

function toAdminSummary(user: StoredUser): AdminUserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    imageUrl: user.imageUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    loginCount: user.loginCount,
    lastLoginAt: user.lastLoginAt,
    acquisitionSource: user.acquisitionSource,
    lastLoginSource: user.lastLoginSource,
    trafficSources: user.trafficSources,
    totalSessionSeconds: user.totalSessionSeconds,
    totalAudioSeconds: user.totalAudioSeconds,
    favoriteSurahIds: user.favoriteSurahIds,
    bookmarkedAyahs: user.bookmarkedAyahs,
    lastRead: user.lastRead,
    settings: user.settings,
    unreadNotifications: user.notifications.filter((notification) => !notification.readAt).length,
  };
}

function getLoggedInUsers(users: StoredUser[]) {
  return users.filter((user) => user.loginCount > 0 && Boolean(user.lastLoginAt));
}

function buildAdminPushDeviceId(userId: string, endpoint: string) {
  return createHash('sha256')
    .update(`${userId}:${endpoint}`)
    .digest('hex')
    .slice(0, 24);
}

const bookmarkedAyahSchema = new Schema<StoredAyahBookmark>(
  {
    id: { type: String, required: true },
    surahId: { type: Number, required: true, min: MIN_SURAH_ID, max: MAX_SURAH_ID },
    ayahNumber: { type: Number, required: true, min: 1, max: MAX_AYAH_NUMBER },
    text: { type: String, default: '' },
    createdAt: { type: String, required: true },
  },
  {
    _id: false,
  }
);

const lastReadSchema = new Schema<StoredLastReadEntry>(
  {
    surahId: { type: Number, required: true, min: MIN_SURAH_ID, max: MAX_SURAH_ID },
    ayahNumber: { type: Number, required: true, min: 1, max: MAX_AYAH_NUMBER },
    updatedAt: { type: String, required: true },
  },
  {
    _id: false,
  }
);

const settingsSchema = new Schema<UserSettings>(
  {
    readingMode: { type: String, enum: ['ayah', 'continuous'], default: 'ayah' },
    arabicFont: {
      type: String,
      enum: ['uthmaniHafs', 'amiriQuran', 'notoNaskh', 'scheherazade'],
      default: 'uthmaniHafs',
    },
    arabicFontScale: { type: Number, min: 0.9, max: 1.9, default: 1.1 },
    audioPreference: { type: String, enum: ['ar', 'tr'], default: 'ar' },
    autoPlayAudio: { type: Boolean, default: false },
    themeMode: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' },
  },
  {
    _id: false,
  }
);

const notificationSchema = new Schema<UserNotification>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['prayer', 'quran', 'bookmark', 'audio', 'system', 'islamic'],
      default: 'system',
    },
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 420 },
    href: { type: String, default: null },
    createdAt: { type: String, required: true },
    readAt: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    _id: false,
  }
);

const pushSubscriptionSchema = new Schema<StoredPushSubscription>(
  {
    deviceId: { type: String, default: null, index: true },
    endpoint: { type: String, required: true, trim: true },
    keys: {
      p256dh: { type: String, required: true, trim: true },
      auth: { type: String, required: true, trim: true },
    },
    userAgent: { type: String, default: null },
    timeZone: { type: String, default: null },
    contentPreference: {
      type: String,
      enum: ['hadith', 'quran', 'balanced'],
      default: 'balanced',
    },
    enabled: { type: Boolean, default: true },
    quranReminderEnabled: { type: Boolean, default: true },
    intervalMinutes: { type: Number, min: 2, max: 1440, default: 2 },
    lastReminderAt: { type: String, default: null },
    lastEngagementAt: { type: String, default: null },
    lastEngagementKind: {
      type: String,
      enum: ['hadith', 'quran', 'islamic'],
      default: null,
    },
    lastSentAt: { type: String, default: null },
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
    acceptedDeliveryIds: { type: [String], default: [] },
    displayedDeliveryIds: { type: [String], default: [] },
    openedDeliveryIds: { type: [String], default: [] },
    failureCount: { type: Number, min: 0, default: 0 },
    createdAt: { type: String, required: true },
    lastSeenAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, required: true },
  },
  {
    _id: false,
  }
);

const userSchema = new Schema<StoredUser>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    imageUrl: { type: String, default: null },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    loginCount: { type: Number, default: 0 },
    lastLoginAt: { type: String, default: null },
    acquisitionSource: { type: String, enum: ['instagram', null], default: null },
    lastLoginSource: { type: String, enum: ['instagram', null], default: null },
    trafficSources: { type: [String], enum: ['instagram'], default: [] },
    totalSessionSeconds: { type: Number, default: 0 },
    totalAudioSeconds: { type: Number, default: 0 },
    favoriteSurahIds: { type: [Number], default: [] },
    bookmarkedAyahs: { type: [bookmarkedAyahSchema], default: [] },
    lastRead: { type: lastReadSchema, default: null },
    settings: { type: settingsSchema, default: () => DEFAULT_USER_SETTINGS },
    notifications: { type: [notificationSchema], default: [] },
    pushSubscriptions: { type: [pushSubscriptionSchema], default: [] },
  },
  {
    collection: USERS_COLLECTION,
    versionKey: false,
  }
);

function getUserModel(): Model<StoredUser> {
  return (
    (mongoose.models[USER_MODEL_NAME] as Model<StoredUser> | undefined) ??
    mongoose.model<StoredUser>(USER_MODEL_NAME, userSchema)
  );
}

function isDuplicateEmailError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: number;
    keyPattern?: Record<string, number>;
    keyValue?: Record<string, unknown>;
  };

  if (candidate.code !== 11000) {
    return false;
  }

  if (candidate.keyPattern?.email === 1) {
    return true;
  }

  return typeof candidate.keyValue?.email === 'string';
}

async function ensureUsersModel() {
  await connectToMongoDatabase();
  return getUserModel();
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const normalizedEmail = normalizeEmail(email);
  const User = await ensureUsersModel();

  const raw = await User.findOne({ email: normalizedEmail }).lean().exec();
  return normalizeStoredUser(raw);
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  const User = await ensureUsersModel();
  const raw = await User.findOne({ id }).lean().exec();
  return normalizeStoredUser(raw);
}

export async function createUser(input: {
  name: string;
  email: string;
  imageUrl?: string | null;
  passwordHash: string;
  passwordSalt: string;
  trafficSource?: UserTrafficSource | null;
}): Promise<StoredUser> {
  const User = await ensureUsersModel();
  const normalizedEmail = normalizeEmail(input.email);
  const nowIso = new Date().toISOString();
  const trafficSource = normalizeUserTrafficSource(input.trafficSource);

  const user: StoredUser = {
    id: randomUUID(),
    name: input.name.trim(),
    email: normalizedEmail,
    imageUrl: normalizeImageUrl(input.imageUrl),
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    createdAt: nowIso,
    updatedAt: nowIso,
    loginCount: 1,
    lastLoginAt: nowIso,
    acquisitionSource: trafficSource,
    lastLoginSource: trafficSource,
    trafficSources: trafficSource ? [trafficSource] : [],
    totalSessionSeconds: 0,
    totalAudioSeconds: 0,
    favoriteSurahIds: [],
    bookmarkedAyahs: [],
    lastRead: null,
    settings: DEFAULT_USER_SETTINGS,
    notifications: buildInitialNotifications(input.name.trim()),
    pushSubscriptions: [],
  };

  try {
    await User.create(user);
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    throw error;
  }

  return user;
}

export async function findOrCreateGoogleUser(input: {
  name: string;
  email: string;
  imageUrl?: string | null;
  trafficSource?: UserTrafficSource | null;
}): Promise<StoredUser> {
  const normalizedEmail = normalizeEmail(input.email);
  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    const updatedUser = await markUserLogin(existingUser.id, {
      imageUrl: input.imageUrl,
      name: input.name,
      trafficSource: input.trafficSource,
    });
    return updatedUser ?? existingUser;
  }

  const secret = randomUUID();
  const digest = await hashPassword(secret);
  return createUser({
    name: input.name.trim(),
    email: normalizedEmail,
    imageUrl: input.imageUrl,
    passwordHash: digest.hash,
    passwordSalt: digest.salt,
    trafficSource: input.trafficSource,
  });
}

export async function markUserLogin(
  userId: string,
  profile?: { name?: string; imageUrl?: string | null; trafficSource?: UserTrafficSource | null }
): Promise<StoredUser | null> {
  const User = await ensureUsersModel();
  const nowIso = new Date().toISOString();
  const $set: Record<string, unknown> = {
    lastLoginAt: nowIso,
    updatedAt: nowIso,
  };
  const imageUrl = normalizeImageUrl(profile?.imageUrl);
  if (imageUrl) {
    $set.imageUrl = imageUrl;
  }
  const name = String(profile?.name ?? '').trim();
  if (name) {
    $set.name = name;
  }
  const trafficSource = normalizeUserTrafficSource(profile?.trafficSource);
  $set.lastLoginSource = trafficSource;

  const update: {
    $inc: { loginCount: number };
    $set: Record<string, unknown>;
    $addToSet?: { trafficSources: UserTrafficSource };
  } = {
    $inc: {
      loginCount: 1,
    },
    $set,
  };

  if (trafficSource) {
    update.$addToSet = { trafficSources: trafficSource };
  }

  const raw = await User.findOneAndUpdate(
    { id: userId },
    update,
    {
      new: true,
    }
  )
    .lean()
    .exec();

  return normalizeStoredUser(raw);
}

export async function replaceUserSettings(
  userId: string,
  input: Partial<AppSettings> & { themeMode?: ThemeMode }
): Promise<StoredUser | null> {
  const nextSettings = normalizeUserSettings(input);
  const User = await ensureUsersModel();

  const raw = await User.findOneAndUpdate(
    { id: userId },
    {
      $set: {
        settings: nextSettings,
        updatedAt: new Date().toISOString(),
      },
    },
    {
      new: true,
    }
  )
    .lean()
    .exec();

  return normalizeStoredUser(raw);
}

export function isAdminEmail(email: string) {
  return normalizeEmail(email) === ADMIN_EMAIL;
}

export async function incrementUserUsage(
  userId: string,
  input: { sessionSeconds?: number; audioSeconds?: number }
): Promise<StoredUser | null> {
  const safeSessionSeconds = Math.max(0, Math.floor(input.sessionSeconds ?? 0));
  const safeAudioSeconds = Math.max(0, Math.floor(input.audioSeconds ?? 0));

  if (safeSessionSeconds === 0 && safeAudioSeconds === 0) {
    return findUserById(userId);
  }

  const User = await ensureUsersModel();

  const raw = await User.findOneAndUpdate(
    { id: userId },
    {
      $inc: {
        totalSessionSeconds: safeSessionSeconds,
        totalAudioSeconds: safeAudioSeconds,
      },
      $set: {
        updatedAt: new Date().toISOString(),
      },
    },
    {
      new: true,
    }
  )
    .lean()
    .exec();

  return normalizeStoredUser(raw);
}

export async function incrementUserUsageCounters(
  userId: string,
  input: { sessionSeconds?: number; audioSeconds?: number }
): Promise<boolean> {
  const safeSessionSeconds = Math.max(0, Math.floor(input.sessionSeconds ?? 0));
  const safeAudioSeconds = Math.max(0, Math.floor(input.audioSeconds ?? 0));

  if (safeSessionSeconds === 0 && safeAudioSeconds === 0) {
    return true;
  }

  const User = await ensureUsersModel();
  const result = await User.updateOne(
    { id: userId },
    {
      $inc: {
        totalSessionSeconds: safeSessionSeconds,
        totalAudioSeconds: safeAudioSeconds,
      },
      $set: {
        updatedAt: new Date().toISOString(),
      },
    }
  ).exec();

  return result.matchedCount > 0;
}

export async function replaceUserQuranState(
  userId: string,
  input: {
    favoriteSurahIds: number[];
    bookmarkedAyahs: StoredAyahBookmark[];
    lastRead: StoredLastReadEntry | null;
  }
): Promise<StoredUser | null> {
  const nextFavoriteSurahIds = normalizeFavoriteSurahIds(input.favoriteSurahIds);
  const nextBookmarkedAyahs = normalizeBookmarkedAyahs(input.bookmarkedAyahs);
  const nextLastRead = normalizeLastRead(input.lastRead);

  const User = await ensureUsersModel();

  const raw = await User.findOneAndUpdate(
    { id: userId },
    {
      $set: {
        favoriteSurahIds: nextFavoriteSurahIds,
        bookmarkedAyahs: nextBookmarkedAyahs,
        lastRead: nextLastRead,
        updatedAt: new Date().toISOString(),
      },
    },
    {
      new: true,
    }
  )
    .lean()
    .exec();

  return normalizeStoredUser(raw);
}

export async function listUserNotifications(userId: string): Promise<UserNotification[]> {
  const User = await ensureUsersModel();
  const raw = await User.findOne({ id: userId }, { _id: 0, notifications: 1, name: 1 })
    .lean()
    .exec();

  const notifications = normalizeUserNotifications(
    (raw as { notifications?: unknown } | null)?.notifications
  );

  if (notifications.length > 0) {
    return notifications;
  }

  const name = String((raw as { name?: unknown } | null)?.name ?? 'Reader').trim() || 'Reader';
  const seededNotifications = buildInitialNotifications(name);
  await User.findOneAndUpdate(
    { id: userId, $or: [{ notifications: { $exists: false } }, { notifications: { $size: 0 } }] },
    {
      $set: {
        notifications: seededNotifications,
        updatedAt: new Date().toISOString(),
      },
    }
  )
    .lean()
    .exec();

  return seededNotifications;
}

export async function createUserNotification(
  userId: string,
  input: Omit<UserNotification, 'id' | 'createdAt' | 'readAt'>
): Promise<UserNotification | null> {
  const User = await ensureUsersModel();
  const notification = normalizeUserNotification({
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    readAt: null,
  });

  if (!notification) {
    return null;
  }

  await User.findOneAndUpdate(
    { id: userId },
    {
      $push: {
        notifications: {
          $each: [notification],
          $position: 0,
          $slice: MAX_NOTIFICATIONS_PER_USER,
        },
      },
      $set: {
        updatedAt: new Date().toISOString(),
      },
    }
  )
    .lean()
    .exec();

  return notification;
}

export async function markUserNotificationRead(
  userId: string,
  notificationId: string
): Promise<UserNotification[]> {
  const User = await ensureUsersModel();
  const nowIso = new Date().toISOString();
  const raw = await User.findOneAndUpdate(
    { id: userId, 'notifications.id': notificationId },
    {
      $set: {
        'notifications.$.readAt': nowIso,
        updatedAt: nowIso,
      },
    },
    { new: true }
  )
    .lean()
    .exec();

  return normalizeStoredUser(raw)?.notifications ?? [];
}

export async function markAllUserNotificationsRead(userId: string): Promise<UserNotification[]> {
  const User = await ensureUsersModel();
  const nowIso = new Date().toISOString();
  const raw = await User.findOneAndUpdate(
    { id: userId },
    {
      $set: {
        'notifications.$[].readAt': nowIso,
        updatedAt: nowIso,
      },
    },
    { new: true }
  )
    .lean()
    .exec();

  return normalizeStoredUser(raw)?.notifications ?? [];
}

export async function upsertUserPushSubscription(
  userId: string,
  input: Pick<StoredPushSubscription, 'endpoint' | 'keys'> &
    Partial<
      Pick<
        StoredPushSubscription,
        | 'deviceId'
        | 'userAgent'
        | 'timeZone'
        | 'contentPreference'
        | 'quranReminderEnabled'
        | 'intervalMinutes'
      >
    >
): Promise<StoredPushSubscription | null> {
  const User = await ensureUsersModel();
  const nowIso = new Date().toISOString();
  const existingUser = await User.findOne(
    { id: userId, 'pushSubscriptions.endpoint': input.endpoint },
    { _id: 0, pushSubscriptions: 1 }
  )
    .lean()
    .exec();
  const existingSubscription = normalizePushSubscriptions(
    (existingUser as { pushSubscriptions?: unknown } | null)?.pushSubscriptions
  ).find((subscription) => subscription.endpoint === input.endpoint);
  const normalized = normalizePushSubscription({
    deviceId: input.deviceId ?? existingSubscription?.deviceId ?? null,
    endpoint: input.endpoint,
    keys: input.keys,
    userAgent: input.userAgent ?? null,
    timeZone: input.timeZone ?? null,
    contentPreference:
      input.contentPreference ?? existingSubscription?.contentPreference ?? 'balanced',
    enabled: true,
    quranReminderEnabled: input.quranReminderEnabled !== false,
    intervalMinutes: input.intervalMinutes ?? 2,
    failureCount: 0,
    // This is the opt-in time used by the admin activity bell. Keep it stable
    // while a browser refreshes its existing subscription.
    createdAt: existingSubscription?.createdAt ?? nowIso,
    lastSeenAt: nowIso,
    updatedAt: nowIso,
    lastReminderAt: existingSubscription?.lastReminderAt ?? null,
    lastEngagementAt: existingSubscription?.lastEngagementAt ?? null,
    lastEngagementKind: existingSubscription?.lastEngagementKind ?? null,
    lastSentAt: existingSubscription?.lastSentAt ?? null,
    notificationSentCount: existingSubscription?.notificationSentCount ?? 0,
    notificationTrackedSentCount:
      existingSubscription?.notificationTrackedSentCount ?? 0,
    notificationDisplayedCount:
      existingSubscription?.notificationDisplayedCount ?? 0,
    notificationVisitCount: existingSubscription?.notificationVisitCount ?? 0,
    notificationTrackedVisitCount:
      existingSubscription?.notificationTrackedVisitCount ?? 0,
    siteVisitCount: existingSubscription?.siteVisitCount ?? 0,
    lastSiteVisitAt: existingSubscription?.lastSiteVisitAt ?? null,
    lastNotificationVisitAt: existingSubscription?.lastNotificationVisitAt ?? null,
    lastNotificationDisplayedAt:
      existingSubscription?.lastNotificationDisplayedAt ?? null,
    lastNotificationCampaignId:
      existingSubscription?.lastNotificationCampaignId ?? null,
    lastNotificationKind: existingSubscription?.lastNotificationKind ?? null,
    acceptedDeliveryIds: existingSubscription?.acceptedDeliveryIds ?? [],
    displayedDeliveryIds: existingSubscription?.displayedDeliveryIds ?? [],
    openedDeliveryIds: existingSubscription?.openedDeliveryIds ?? [],
  });

  if (!normalized) {
    return null;
  }

  await User.updateMany(
    {
      id: { $ne: userId },
      'pushSubscriptions.endpoint': normalized.endpoint,
    },
    {
      $pull: {
        pushSubscriptions: {
          endpoint: normalized.endpoint,
        },
      },
      $set: {
        updatedAt: nowIso,
      },
    }
  ).exec();

  await User.findOneAndUpdate(
    { id: userId },
    {
      $pull: {
        pushSubscriptions: {
          endpoint: normalized.endpoint,
        },
      },
    }
  )
    .lean()
    .exec();

  const raw = await User.findOneAndUpdate(
    { id: userId },
    {
      $push: {
        pushSubscriptions: {
          $each: [normalized],
          $position: 0,
          $slice: MAX_PUSH_SUBSCRIPTIONS_PER_USER,
        },
      },
      $set: {
        updatedAt: nowIso,
      },
    },
    { new: true }
  )
    .lean()
    .exec();

  return (
    normalizeStoredUser(raw)?.pushSubscriptions.find(
      (subscription) => subscription.endpoint === normalized.endpoint
    ) ?? null
  );
}

export async function removeUserPushSubscription(userId: string, endpoint: string) {
  const User = await ensureUsersModel();
  await User.findOneAndUpdate(
    { id: userId },
    {
      $pull: {
        pushSubscriptions: {
          endpoint,
        },
      },
      $set: {
        updatedAt: new Date().toISOString(),
      },
    }
  )
    .lean()
    .exec();
}

export async function findUserByPushSubscriptionEndpoint(endpoint: string) {
  const User = await ensureUsersModel();
  const raw = await User.findOne(
    { 'pushSubscriptions.endpoint': endpoint },
    {
      _id: 0,
      id: 1,
      name: 1,
    }
  )
    .lean()
    .exec();

  const candidate = raw as { id?: unknown; name?: unknown } | null;
  const userId = String(candidate?.id ?? '').trim();
  if (!userId) {
    return null;
  }

  return {
    id: userId,
    name: String(candidate?.name ?? 'Reader').trim() || 'Reader',
  };
}

export async function listQuranReminderPushSubscriptions(): Promise<PushSubscriptionForDelivery[]> {
  const User = await ensureUsersModel();
  const rawUsers = await User.find(
    {
      pushSubscriptions: {
        $elemMatch: {
          enabled: true,
          quranReminderEnabled: true,
        },
      },
    },
    {
      _id: 0,
      id: 1,
      name: 1,
      lastRead: 1,
      pushSubscriptions: 1,
    }
  )
    .lean()
    .exec();

  const subscriptions: PushSubscriptionForDelivery[] = [];
  for (const rawUser of rawUsers) {
    const user = normalizeStoredUser({
      ...rawUser,
      email: 'placeholder@example.com',
      passwordHash: 'placeholder',
      passwordSalt: 'placeholder',
      createdAt: new Date().toISOString(),
    });

    if (!user) {
      continue;
    }

    for (const subscription of user.pushSubscriptions) {
      if (subscription.enabled && subscription.quranReminderEnabled) {
        subscriptions.push({
          ...subscription,
          userId: user.id,
          userName: user.name,
          userLastRead: user.lastRead,
        });
      }
    }
  }

  return subscriptions;
}

export async function listEnabledPushSubscriptions(): Promise<PushSubscriptionForDelivery[]> {
  const User = await ensureUsersModel();
  const rawUsers = await User.find(
    {
      pushSubscriptions: {
        $elemMatch: {
          enabled: true,
        },
      },
    },
    {
      _id: 0,
      id: 1,
      name: 1,
      pushSubscriptions: 1,
    }
  )
    .lean()
    .exec();

  const subscriptions: PushSubscriptionForDelivery[] = [];
  for (const rawUser of rawUsers) {
    const user = normalizeStoredUser({
      ...rawUser,
      email: 'placeholder@example.com',
      passwordHash: 'placeholder',
      passwordSalt: 'placeholder',
      createdAt: new Date().toISOString(),
    });

    if (!user) {
      continue;
    }

    for (const subscription of user.pushSubscriptions) {
      if (subscription.enabled) {
        subscriptions.push({
          ...subscription,
          userId: user.id,
          userName: user.name,
        });
      }
    }
  }

  return subscriptions;
}

export async function listUserPushDevicesForAdmin(): Promise<AdminUserPushDevice[]> {
  const User = await ensureUsersModel();
  const rawUsers = await User.find(
    {
      pushSubscriptions: {
        $elemMatch: {
          enabled: true,
        },
      },
    },
    {
      _id: 0,
      id: 1,
      name: 1,
      email: 1,
      imageUrl: 1,
      pushSubscriptions: 1,
    }
  )
    .lean()
    .exec();

  const devices: AdminUserPushDevice[] = [];

  for (const rawUser of rawUsers) {
    const candidate = rawUser as
      | {
          id?: unknown;
          name?: unknown;
          email?: unknown;
          imageUrl?: unknown;
          pushSubscriptions?: unknown;
        }
      | null;
    const userId = String(candidate?.id ?? '').trim();
    const userName = String(candidate?.name ?? 'Reader').trim() || 'Reader';
    const userEmail = normalizeEmail(String(candidate?.email ?? ''));

    if (!userId || !userEmail) {
      continue;
    }

    for (const subscription of normalizePushSubscriptions(candidate?.pushSubscriptions)) {
      if (!subscription.enabled) {
        continue;
      }

      devices.push({
        id: buildAdminPushDeviceId(userId, subscription.endpoint),
        ownerType: 'user',
        endpointHash: createHash('sha256')
          .update(subscription.endpoint)
          .digest('hex'),
        deviceId: subscription.deviceId,
        userId,
        userName,
        userEmail,
        imageUrl: normalizeImageUrl(candidate?.imageUrl),
        userAgent: subscription.userAgent,
        timeZone: subscription.timeZone,
        contentPreference: subscription.contentPreference,
        enabled: subscription.enabled,
        quranReminderEnabled: subscription.quranReminderEnabled,
        failureCount: subscription.failureCount,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
        lastSeenAt: subscription.lastSeenAt,
        lastSentAt: subscription.lastSentAt ?? subscription.lastReminderAt,
        lastEngagementAt: subscription.lastEngagementAt,
        lastEngagementKind: subscription.lastEngagementKind,
        notificationSentCount: subscription.notificationSentCount,
        notificationTrackedSentCount: subscription.notificationTrackedSentCount,
        notificationDisplayedCount: subscription.notificationDisplayedCount,
        notificationVisitCount: subscription.notificationVisitCount,
        notificationTrackedVisitCount: subscription.notificationTrackedVisitCount,
        siteVisitCount: subscription.siteVisitCount,
        lastSiteVisitAt: subscription.lastSiteVisitAt,
        lastNotificationVisitAt: subscription.lastNotificationVisitAt,
        lastNotificationDisplayedAt: subscription.lastNotificationDisplayedAt,
        lastNotificationCampaignId: subscription.lastNotificationCampaignId,
        lastNotificationKind: subscription.lastNotificationKind,
      });
    }
  }

  return devices.sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
}

export async function listEnabledPushSubscriptionsForUser(
  userId: string
): Promise<PushSubscriptionForDelivery[]> {
  const User = await ensureUsersModel();
  const rawUser = await User.findOne(
    { id: userId },
    {
      _id: 0,
      id: 1,
      name: 1,
      pushSubscriptions: 1,
    }
  )
    .lean()
    .exec();

  const candidate = rawUser as
    | {
        id?: unknown;
        name?: unknown;
        pushSubscriptions?: unknown;
      }
    | null;

  if (!candidate) {
    return [];
  }

  const normalizedUserId = String(candidate.id ?? '').trim();
  const userName = String(candidate.name ?? 'Reader').trim() || 'Reader';
  if (!normalizedUserId) {
    return [];
  }

  return normalizePushSubscriptions(candidate.pushSubscriptions)
    .filter((subscription) => subscription.enabled)
    .map((subscription) => ({
      ...subscription,
      userId: normalizedUserId,
      userName,
    }));
}

export async function markPushReminderSent(userId: string, endpoint: string, sentAt: string) {
  const User = await ensureUsersModel();
  await User.findOneAndUpdate(
    { id: userId, 'pushSubscriptions.endpoint': endpoint },
    {
      $set: {
        'pushSubscriptions.$.lastReminderAt': sentAt,
        'pushSubscriptions.$.updatedAt': sentAt,
        'pushSubscriptions.$.failureCount': 0,
        updatedAt: sentAt,
      },
    }
  )
    .lean()
    .exec();
}

export async function markPushSubscriptionSent(
  userId: string,
  endpoint: string,
  sentAt: string,
  engagementKind?: PushEngagementKind,
  tracking?: PushDeliveryTracking,
  displayTrackingEnabled = false
) {
  const User = await ensureUsersModel();
  const subscriptionUpdate: Record<string, unknown> = {
    'pushSubscriptions.$.lastSentAt': sentAt,
    'pushSubscriptions.$.updatedAt': sentAt,
    'pushSubscriptions.$.failureCount': 0,
    updatedAt: sentAt,
  };

  if (engagementKind) {
    subscriptionUpdate['pushSubscriptions.$.lastEngagementAt'] = sentAt;
    subscriptionUpdate['pushSubscriptions.$.lastEngagementKind'] = engagementKind;
  }

  if (tracking) {
    subscriptionUpdate['pushSubscriptions.$.lastNotificationCampaignId'] =
      tracking.campaignId;
    subscriptionUpdate['pushSubscriptions.$.lastNotificationKind'] =
      tracking.notificationKind;
  }

  if (tracking && displayTrackingEnabled) {
    await User.updateOne(
      {
        id: userId,
        pushSubscriptions: {
          $elemMatch: {
            endpoint,
            acceptedDeliveryIds: { $ne: tracking.deliveryId },
          },
        },
      },
      {
        $set: subscriptionUpdate,
        $inc: {
          'pushSubscriptions.$.notificationSentCount': 1,
          'pushSubscriptions.$.notificationTrackedSentCount': 1,
        },
        $push: {
          'pushSubscriptions.$.acceptedDeliveryIds': {
            $each: [tracking.deliveryId],
            $slice: -PUSH_DELIVERY_ID_RETENTION_LIMIT,
          },
        },
      }
    ).exec();
    return;
  }

  await User.findOneAndUpdate(
    { id: userId, 'pushSubscriptions.endpoint': endpoint },
    {
      $set: subscriptionUpdate,
      $inc: { 'pushSubscriptions.$.notificationSentCount': 1 },
    }
  )
    .lean()
    .exec();
}

export async function ensureUserPushNotificationAccepted(input: {
  userId: string;
  endpointHash: string;
  deliveryId: string;
  campaignId: string;
  notificationKind: string;
  acceptedAt: string;
  engagementLocalDateKey?: string;
}) {
  const User = await ensureUsersModel();
  const rawUser = await User.findOne(
    { id: input.userId },
    { _id: 0, pushSubscriptions: 1 }
  )
    .lean()
    .exec();
  const subscription = normalizePushSubscriptions(
    (rawUser as { pushSubscriptions?: unknown } | null)?.pushSubscriptions
  ).find(
    (candidate) =>
      createHash('sha256').update(candidate.endpoint).digest('hex') ===
      input.endpointHash
  );

  if (!subscription) {
    return false;
  }

  const engagementKind =
    input.engagementLocalDateKey &&
    (input.notificationKind === 'hadith' ||
      input.notificationKind === 'quran' ||
      input.notificationKind === 'islamic')
      ? input.notificationKind
      : null;
  const countResult = await User.updateOne(
    {
      id: input.userId,
      pushSubscriptions: {
        $elemMatch: {
          endpoint: subscription.endpoint,
          acceptedDeliveryIds: { $ne: input.deliveryId },
        },
      },
    },
    {
      $inc: {
        'pushSubscriptions.$.notificationSentCount': 1,
        'pushSubscriptions.$.notificationTrackedSentCount': 1,
      },
      $set: {
        'pushSubscriptions.$.lastSentAt': input.acceptedAt,
        'pushSubscriptions.$.lastNotificationCampaignId': input.campaignId,
        'pushSubscriptions.$.lastNotificationKind': input.notificationKind,
        ...(engagementKind
          ? {
              'pushSubscriptions.$.lastEngagementAt': input.acceptedAt,
              'pushSubscriptions.$.lastEngagementKind': engagementKind,
            }
          : {}),
        'pushSubscriptions.$.failureCount': 0,
        'pushSubscriptions.$.updatedAt': input.acceptedAt,
        updatedAt: input.acceptedAt,
      },
      $push: {
        'pushSubscriptions.$.acceptedDeliveryIds': {
          $each: [input.deliveryId],
          $slice: -PUSH_DELIVERY_ID_RETENTION_LIMIT,
        },
      },
    }
  ).exec();

  return countResult.modifiedCount > 0;
}

export async function recordUserPushNotificationDisplayed(input: {
  userId: string;
  endpointHash: string;
  deliveryId: string;
  campaignId: string;
  notificationKind: string;
  displayedAt: string;
}) {
  const User = await ensureUsersModel();
  const rawUser = await User.findOne(
    { id: input.userId },
    { _id: 0, pushSubscriptions: 1 }
  )
    .lean()
    .exec();
  const subscription = normalizePushSubscriptions(
    (rawUser as { pushSubscriptions?: unknown } | null)?.pushSubscriptions
  ).find(
    (candidate) =>
      createHash('sha256').update(candidate.endpoint).digest('hex') ===
      input.endpointHash
  );

  if (!subscription) {
    return false;
  }

  const result = await User.updateOne(
    {
      id: input.userId,
      pushSubscriptions: {
        $elemMatch: {
          endpoint: subscription.endpoint,
          displayedDeliveryIds: { $ne: input.deliveryId },
        },
      },
    },
    {
      $inc: {
        'pushSubscriptions.$.notificationDisplayedCount': 1,
      },
      $set: {
        'pushSubscriptions.$.lastNotificationDisplayedAt': input.displayedAt,
        'pushSubscriptions.$.lastNotificationCampaignId': input.campaignId,
        'pushSubscriptions.$.lastNotificationKind': input.notificationKind,
        updatedAt: input.displayedAt,
      },
      $push: {
        'pushSubscriptions.$.displayedDeliveryIds': {
          $each: [input.deliveryId],
          $slice: -PUSH_DELIVERY_ID_RETENTION_LIMIT,
        },
      },
    }
  ).exec();

  return result.modifiedCount > 0;
}

export async function recordUserPushNotificationVisit(input: {
  userId: string;
  endpointHash: string;
  deliveryId: string;
  campaignId: string;
  notificationKind: string;
  visitedAt: string;
  countTracked?: boolean;
}) {
  const User = await ensureUsersModel();
  const rawUser = await User.findOne(
    { id: input.userId },
    { _id: 0, pushSubscriptions: 1 }
  )
    .lean()
    .exec();
  const subscription = normalizePushSubscriptions(
    (rawUser as { pushSubscriptions?: unknown } | null)?.pushSubscriptions
  ).find(
    (candidate) =>
      createHash('sha256').update(candidate.endpoint).digest('hex') ===
      input.endpointHash
  );

  if (!subscription) {
    return false;
  }

  const increment: Record<string, number> = {
    'pushSubscriptions.$.notificationVisitCount': 1,
  };
  if (input.countTracked) {
    increment['pushSubscriptions.$.notificationTrackedVisitCount'] = 1;
  }
  const result = await User.updateOne(
    {
      id: input.userId,
      pushSubscriptions: {
        $elemMatch: {
          endpoint: subscription.endpoint,
          openedDeliveryIds: { $ne: input.deliveryId },
        },
      },
    },
    {
      $inc: increment,
      $set: {
        'pushSubscriptions.$.lastNotificationVisitAt': input.visitedAt,
        'pushSubscriptions.$.lastNotificationCampaignId': input.campaignId,
        'pushSubscriptions.$.lastNotificationKind': input.notificationKind,
        updatedAt: input.visitedAt,
      },
      $push: {
        'pushSubscriptions.$.openedDeliveryIds': {
          $each: [input.deliveryId],
          $slice: -PUSH_DELIVERY_ID_RETENTION_LIMIT,
        },
      },
    }
  ).exec();

  return result.modifiedCount > 0;
}

export async function recordUserPushSiteVisit(input: {
  userId: string;
  endpoint?: string;
  userAgent?: string | null;
  timeZone?: string | null;
  contentPreference?: PushContentPreference;
  visitedAt?: string;
}) {
  const endpoint = String(input.endpoint ?? '').trim();
  if (!endpoint) {
    return { matched: false, counted: false };
  }

  const User = await ensureUsersModel();
  const rawUser = await User.findOne(
    { id: input.userId },
    { _id: 0, pushSubscriptions: 1 }
  )
    .lean()
    .exec();
  const subscription = normalizePushSubscriptions(
    (rawUser as { pushSubscriptions?: unknown } | null)?.pushSubscriptions
  ).find((candidate) => candidate.enabled && candidate.endpoint === endpoint);

  if (!subscription) {
    return { matched: false, counted: false };
  }

  const visitedAt = input.visitedAt ?? new Date().toISOString();
  const shouldCount = shouldCountSiteVisit(subscription.lastSiteVisitAt, visitedAt);
  const setUpdate: Record<string, unknown> = {
    'pushSubscriptions.$.lastSeenAt': visitedAt,
    'pushSubscriptions.$.updatedAt': visitedAt,
    updatedAt: visitedAt,
  };
  const normalizedTimeZone = normalizeTimeZone(input.timeZone);

  if (input.userAgent !== undefined) {
    setUpdate['pushSubscriptions.$.userAgent'] =
      input.userAgent?.trim().slice(0, 320) || null;
  }
  if (normalizedTimeZone) {
    setUpdate['pushSubscriptions.$.timeZone'] = normalizedTimeZone;
  }
  if (input.contentPreference) {
    setUpdate['pushSubscriptions.$.contentPreference'] =
      normalizePushContentPreference(input.contentPreference, 'balanced');
  }
  if (shouldCount) {
    setUpdate['pushSubscriptions.$.lastSiteVisitAt'] = visitedAt;
  }

  const update: {
    $set: Record<string, unknown>;
    $inc?: Record<string, number>;
  } = {
    $set: setUpdate,
  };

  if (shouldCount) {
    update.$inc = { 'pushSubscriptions.$.siteVisitCount': 1 };
  }

  const result = await User.updateOne(
    {
      id: input.userId,
      pushSubscriptions: {
        $elemMatch: {
          endpoint,
          enabled: true,
        },
      },
    },
    update
  ).exec();

  return {
    matched: result.matchedCount > 0,
    counted: shouldCount && result.modifiedCount > 0,
  };
}

export async function markPushSubscriptionFailure(
  userId: string,
  endpoint: string,
  disable = false,
  deliveryId?: string
) {
  const User = await ensureUsersModel();
  const nowIso = new Date().toISOString();
  const update: Record<string, unknown> = {
    'pushSubscriptions.$.updatedAt': nowIso,
    updatedAt: nowIso,
  };

  if (disable) {
    update['pushSubscriptions.$.enabled'] = false;
  }

  await User.findOneAndUpdate(
    {
      id: userId,
      pushSubscriptions: {
        $elemMatch: {
          endpoint,
          ...(deliveryId
            ? { acceptedDeliveryIds: { $ne: deliveryId } }
            : {}),
        },
      },
    },
    {
      $inc: {
        'pushSubscriptions.$.failureCount': 1,
      },
      $set: update,
    }
  )
    .lean()
    .exec();
}

export async function listSurahLikeCounts(): Promise<Record<number, number>> {
  const User = await ensureUsersModel();
  const likesMap: Record<number, number> = {};

  const users = await User.find(
    {
      loginCount: { $gt: 0 },
      lastLoginAt: { $nin: [null, ''] },
    },
    {
      _id: 0,
      favoriteSurahIds: 1,
    }
  )
    .lean()
    .exec();

  users.forEach((entry) => {
    const candidate = entry as { favoriteSurahIds?: unknown };
    const favoriteSurahIds = normalizeFavoriteSurahIds(candidate.favoriteSurahIds);
    favoriteSurahIds.forEach((surahId) => {
      likesMap[surahId] = (likesMap[surahId] ?? 0) + 1;
    });
  });

  return likesMap;
}

export async function listUsersForAdmin(): Promise<AdminUserSummary[]> {
  const User = await ensureUsersModel();

  const users = await User.find({
    loginCount: { $gt: 0 },
    lastLoginAt: { $nin: [null, ''] },
  })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const normalizedUsers = users
    .map((entry) => normalizeStoredUser(entry))
    .filter((entry): entry is StoredUser => entry !== null);

  return getLoggedInUsers(normalizedUsers).map((user) => toAdminSummary(user));
}

export async function deleteUserForAdmin(userId: string) {
  const normalizedUserId = String(userId).trim();
  if (!normalizedUserId) {
    return false;
  }

  const User = await ensureUsersModel();
  const user = await User.findOne({ id: normalizedUserId }, { _id: 0, id: 1 })
    .lean()
    .exec();

  if (!user) {
    return false;
  }

  // User-owned data outside the users document must be cleared before the
  // account is removed. The users document itself contains Quran state,
  // settings, in-app notifications, and push subscriptions.
  await Promise.all([
    deleteFeedbackForUser(normalizedUserId),
    deleteSiteDevicesForUser(normalizedUserId),
    deletePushDeliveryAuditsForUser(normalizedUserId),
  ]);

  const result = await User.deleteOne({ id: normalizedUserId }).exec();
  return result.deletedCount > 0;
}
