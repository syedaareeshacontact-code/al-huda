export const QURAN_REMINDER_LOCAL_HOUR = 9;
export const DEFAULT_QURAN_REMINDER_TIME_ZONE = 'UTC';

interface LocalDateTimeParts {
  dateKey: string;
  hour: number;
}

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeReminderTimeZone(timeZone: string | null | undefined) {
  const value = String(timeZone ?? '').trim();
  return value && isValidTimeZone(value) ? value : DEFAULT_QURAN_REMINDER_TIME_ZONE;
}

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

  return {
    dateKey: `${year}-${month}-${day}`,
    hour: Number.isFinite(hour) ? hour : 0,
  };
}

export function isQuranReminderDueForSubscription(
  subscription: {
    timeZone?: string | null;
    lastReminderAt?: string | null;
  },
  now = new Date()
) {
  const timeZone = normalizeReminderTimeZone(subscription.timeZone);
  const localNow = getLocalDateTimeParts(now, timeZone);

  if (localNow.hour !== QURAN_REMINDER_LOCAL_HOUR) {
    return false;
  }

  if (!subscription.lastReminderAt) {
    return true;
  }

  const lastReminderDate = new Date(subscription.lastReminderAt);
  if (Number.isNaN(lastReminderDate.getTime())) {
    return true;
  }

  return getLocalDateTimeParts(lastReminderDate, timeZone).dateKey !== localNow.dateKey;
}
