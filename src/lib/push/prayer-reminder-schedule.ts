export const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export const PRAYER_REMINDER_GRACE_MINUTES = 16;

export type PrayerName = (typeof PRAYER_NAMES)[number];

export interface PrayerReminderDecision {
  prayer: PrayerName;
  localDateKey: string;
  reminderKey: string;
  title: string;
  message: string;
}

function getLocalTime(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '0';

  return {
    dateKey: `${read('year')}-${read('month')}-${read('day')}`,
    minuteOfDay: Number(read('hour')) * 60 + Number(read('minute')),
  };
}

function parsePrayerMinute(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
}

export function getPrayerReminderDecision(
  input: {
    timings: Record<string, string>;
    timeZone: string;
    city: string;
    country: string;
    reminderMinutes: number;
  },
  now = new Date()
): PrayerReminderDecision | null {
  const localNow = getLocalTime(now, input.timeZone);
  const reminderMinutes = Math.max(0, Math.min(60, Math.floor(input.reminderMinutes)));
  const locationLabel = `${input.city}, ${input.country}`;

  for (const prayer of PRAYER_NAMES) {
    const prayerMinute = parsePrayerMinute(input.timings[prayer] ?? '');
    if (prayerMinute === null) {
      continue;
    }

    const reminderMinute = prayerMinute - reminderMinutes;
    if (
      reminderMinute < 0 ||
      localNow.minuteOfDay < reminderMinute ||
      localNow.minuteOfDay >= reminderMinute + PRAYER_REMINDER_GRACE_MINUTES
    ) {
      continue;
    }

    const reminderKey = `${localNow.dateKey}:${input.country}:${input.city}:${prayer}:${reminderMinutes}`;
    return {
      prayer,
      localDateKey: localNow.dateKey,
      reminderKey,
      title: `${prayer} reminder`,
      message:
        reminderMinutes > 0
          ? `${prayer} prayer starts in ${reminderMinutes} minutes in ${locationLabel}.`
          : `${prayer} prayer time has started in ${locationLabel}.`,
    };
  }

  return null;
}

export function formatAladhanDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-');
  return `${day}-${month}-${year}`;
}

export function getDateKeyInTimeZone(date: Date, timeZone: string) {
  return getLocalTime(date, timeZone).dateKey;
}
