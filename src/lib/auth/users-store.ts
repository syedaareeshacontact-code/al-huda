import { randomUUID } from 'node:crypto';

import mongoose, { Schema, type Model } from 'mongoose';

import { hashPassword } from '@/lib/auth/password';
import { connectToMongoDatabase } from '@/lib/db/mongodb';
import { buildBookmarkId } from '@/lib/quran-utils';
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
  totalSessionSeconds: number;
  totalAudioSeconds: number;
  favoriteSurahIds: number[];
  bookmarkedAyahs: StoredAyahBookmark[];
  lastRead: StoredLastReadEntry | null;
  settings: UserSettings;
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
  totalSessionSeconds: number;
  totalAudioSeconds: number;
  favoriteSurahIds: number[];
  bookmarkedAyahs: StoredAyahBookmark[];
  lastRead: StoredLastReadEntry | null;
  settings: UserSettings;
}

const MIN_SURAH_ID = 1;
const MAX_SURAH_ID = 114;
const MAX_AYAH_NUMBER = 286;
const USERS_COLLECTION = 'users';
const USER_MODEL_NAME = 'AuthUser';
export const ADMIN_EMAIL = 'zainqlandar@gmail.com';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  readingMode: 'ayah',
  arabicFont: 'amiriQuran',
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

function normalizeThemeMode(value: unknown): ThemeMode {
  return value === 'light' || value === 'system' ? value : 'dark';
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
      candidate.arabicFont === 'notoNaskh' || candidate.arabicFont === 'scheherazade'
        ? candidate.arabicFont
        : 'amiriQuran',
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
    totalSessionSeconds: Number(candidate.totalSessionSeconds ?? 0) || 0,
    totalAudioSeconds: Number(candidate.totalAudioSeconds ?? 0) || 0,
    favoriteSurahIds: normalizeFavoriteSurahIds(candidate.favoriteSurahIds),
    bookmarkedAyahs: normalizeBookmarkedAyahs(
      candidate.bookmarkedAyahs ?? candidate.bookmarks
    ),
    lastRead: normalizeLastRead(candidate.lastRead),
    settings: normalizeUserSettings(candidate.settings),
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
    totalSessionSeconds: user.totalSessionSeconds,
    totalAudioSeconds: user.totalAudioSeconds,
    favoriteSurahIds: user.favoriteSurahIds,
    bookmarkedAyahs: user.bookmarkedAyahs,
    lastRead: user.lastRead,
    settings: user.settings,
  };
}

function getLoggedInUsers(users: StoredUser[]) {
  return users.filter((user) => user.loginCount > 0 && Boolean(user.lastLoginAt));
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
      enum: ['amiriQuran', 'notoNaskh', 'scheherazade'],
      default: 'amiriQuran',
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
    totalSessionSeconds: { type: Number, default: 0 },
    totalAudioSeconds: { type: Number, default: 0 },
    favoriteSurahIds: { type: [Number], default: [] },
    bookmarkedAyahs: { type: [bookmarkedAyahSchema], default: [] },
    lastRead: { type: lastReadSchema, default: null },
    settings: { type: settingsSchema, default: () => DEFAULT_USER_SETTINGS },
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
}): Promise<StoredUser> {
  const User = await ensureUsersModel();
  const normalizedEmail = normalizeEmail(input.email);
  const nowIso = new Date().toISOString();

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
    totalSessionSeconds: 0,
    totalAudioSeconds: 0,
    favoriteSurahIds: [],
    bookmarkedAyahs: [],
    lastRead: null,
    settings: DEFAULT_USER_SETTINGS,
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
}): Promise<StoredUser> {
  const normalizedEmail = normalizeEmail(input.email);
  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    const updatedUser = await markUserLogin(existingUser.id, {
      imageUrl: input.imageUrl,
      name: input.name,
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
  });
}

export async function markUserLogin(
  userId: string,
  profile?: { name?: string; imageUrl?: string | null }
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

  const raw = await User.findOneAndUpdate(
    { id: userId },
    {
      $inc: {
        loginCount: 1,
      },
      $set,
    },
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
