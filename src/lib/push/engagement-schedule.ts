import {
  normalizePushContentPreference,
  type PushContentPreference,
  type PushEngagementKind,
} from './engagement-types';
import { normalizeReminderTimeZone } from './quran-reminder-schedule';

export const ENGAGEMENT_LOCAL_HOUR = 9;
export const ACTIVE_READER_DAYS = 14;
export const COOLING_READER_DAYS = 60;

export type EngagementAudience = 'guest' | 'user';
export type EngagementCadence = 'daily' | 'three-per-week' | 'weekly';

export interface EngagementDecision {
  cadence: EngagementCadence;
  kind: PushEngagementKind;
  localDateKey: string;
  timeZone: string;
}

interface EngagementScheduleInput {
  timeZone?: string | null;
  contentPreference?: PushContentPreference | null;
  lastSeenAt?: string | null;
  lastEngagementAt?: string | null;
}

interface LocalDateTimeParts {
  dateKey: string;
  dayOfWeek: number;
  hour: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const COOLING_DELIVERY_DAYS = new Set([1, 3, 5]);
const DORMANT_DELIVERY_DAY = 5;

const CONTENT_MIX: Record<
  EngagementAudience,
  Record<PushContentPreference, readonly PushEngagementKind[]>
> = {
  guest: {
    hadith: ['quran', 'hadith', 'hadith', 'hadith', 'hadith', 'hadith', 'islamic'],
    quran: ['quran', 'hadith', 'quran', 'quran', 'hadith', 'quran', 'islamic'],
    balanced: ['quran', 'hadith', 'quran', 'hadith', 'quran', 'hadith', 'islamic'],
  },
  user: {
    hadith: ['islamic', 'hadith', 'hadith', 'hadith', 'hadith', 'quran', 'hadith'],
    quran: ['islamic', 'quran', 'quran', 'quran', 'hadith', 'quran', 'quran'],
    balanced: ['islamic', 'quran', 'hadith', 'quran', 'hadith', 'quran', 'hadith'],
  },
};

function getLocalDateTimeParts(date: Date, timeZone: string): LocalDateTimeParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const dateKey = `${year}-${month}-${day}`;
  const dayOfWeek = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();

  return {
    dateKey,
    dayOfWeek,
    hour: Number.isFinite(hour) ? hour : 0,
  };
}

function getCadence(lastSeenAt: string | null | undefined, now: Date): EngagementCadence {
  const lastSeenTime = Date.parse(String(lastSeenAt ?? ''));
  if (!Number.isFinite(lastSeenTime)) {
    return 'weekly';
  }

  const inactiveDays = Math.max(0, Math.floor((now.getTime() - lastSeenTime) / DAY_MS));
  if (inactiveDays <= ACTIVE_READER_DAYS) {
    return 'daily';
  }
  if (inactiveDays <= COOLING_READER_DAYS) {
    return 'three-per-week';
  }
  return 'weekly';
}

function isCadenceDay(cadence: EngagementCadence, dayOfWeek: number) {
  if (cadence === 'daily') {
    return true;
  }
  if (cadence === 'three-per-week') {
    return COOLING_DELIVERY_DAYS.has(dayOfWeek);
  }
  return dayOfWeek === DORMANT_DELIVERY_DAY;
}

export function getEngagementKind(
  audience: EngagementAudience,
  preference: PushContentPreference,
  dayOfWeek: number
) {
  return CONTENT_MIX[audience][preference][dayOfWeek] ?? 'hadith';
}

export function getEngagementDecision(
  input: EngagementScheduleInput,
  audience: EngagementAudience,
  now = new Date()
): EngagementDecision | null {
  const timeZone = normalizeReminderTimeZone(input.timeZone);
  const localNow = getLocalDateTimeParts(now, timeZone);

  const isDeliveryTime =
    audience === 'guest'
      ? localNow.hour >= ENGAGEMENT_LOCAL_HOUR
      : localNow.hour === ENGAGEMENT_LOCAL_HOUR;
  if (!isDeliveryTime) {
    return null;
  }

  if (input.lastEngagementAt) {
    const lastEngagementDate = new Date(input.lastEngagementAt);
    if (
      !Number.isNaN(lastEngagementDate.getTime()) &&
      getLocalDateTimeParts(lastEngagementDate, timeZone).dateKey === localNow.dateKey
    ) {
      return null;
    }
  }

  const cadence =
    audience === 'guest' ? 'daily' : getCadence(input.lastSeenAt, now);
  if (!isCadenceDay(cadence, localNow.dayOfWeek)) {
    return null;
  }

  const preference = normalizePushContentPreference(
    input.contentPreference,
    audience === 'guest' ? 'hadith' : 'balanced'
  );

  return {
    cadence,
    kind: getEngagementKind(audience, preference, localNow.dayOfWeek),
    localDateKey: localNow.dateKey,
    timeZone,
  };
}
