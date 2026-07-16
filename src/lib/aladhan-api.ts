const ALADHAN_BASE = 'https://api.aladhan.com/v1';

/** University of Islamic Sciences, Karachi — standard for Pakistan */
export const PAKISTAN_CALCULATION_METHOD = 1;

export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak?: string;
  Midnight?: string;
}

export interface HijriDate {
  date: string;
  day: string;
  month: { number: number; en: string; ar: string };
  year: string;
  weekday: { en: string; ar: string };
}

export interface PrayerTimesResponse {
  available: boolean;
  requestedDate: string;
  timings: PrayerTimings;
  date: {
    readable: string;
    hijri: HijriDate;
    gregorian: { date: string; weekday: { en: string } };
  };
  meta: {
    latitude: number;
    longitude: number;
    timezone: string;
    method: { id: number; name: string };
  };
}

export interface QiblaResponse {
  latitude: number;
  longitude: number;
  direction: number;
}

export interface MonthlyPrayerDay {
  date: { gregorian: { date: string }; hijri: HijriDate };
  timings: PrayerTimings;
}

function getUnavailablePrayerTimesResponse(date: string): PrayerTimesResponse {
  return {
    available: false,
    requestedDate: date,
    timings: {
      Fajr: '',
      Sunrise: '',
      Dhuhr: '',
      Asr: '',
      Sunset: '',
      Maghrib: '',
      Isha: '',
    },
    date: {
      readable: date,
      hijri: {
        date: '',
        day: '',
        month: { number: 0, en: '', ar: '' },
        year: '',
        weekday: { en: '', ar: '' },
      },
      gregorian: {
        date,
        weekday: { en: '' },
      },
    },
    meta: {
      latitude: 0,
      longitude: 0,
      timezone: 'Asia/Karachi',
      method: { id: PAKISTAN_CALCULATION_METHOD, name: 'University of Islamic Sciences, Karachi' },
    },
  };
}

function getPakistanDateIso(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getFallbackQiblaResponse(latitude: number, longitude: number): QiblaResponse {
  const kaabaLatitude = 21.4225 * (Math.PI / 180);
  const kaabaLongitude = 39.8262 * (Math.PI / 180);
  const currentLatitude = latitude * (Math.PI / 180);
  const currentLongitude = longitude * (Math.PI / 180);
  const longitudeDifference = kaabaLongitude - currentLongitude;
  const y = Math.sin(longitudeDifference);
  const x =
    Math.cos(currentLatitude) * Math.tan(kaabaLatitude) -
    Math.sin(currentLatitude) * Math.cos(longitudeDifference);
  const direction = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;

  return {
    latitude,
    longitude,
    direction: Number(direction.toFixed(2)),
  };
}

function normalizeRequestedDate(date?: string) {
  if (!date) {
    return getPakistanDateIso();
  }

  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error('Prayer date must use YYYY-MM-DD format');
  }

  const parsed = new Date(`${date}T00:00:00+05:00`);
  if (Number.isNaN(parsed.getTime()) || getPakistanDateIso(parsed) !== date) {
    throw new Error('Prayer date is invalid');
  }

  return date;
}

export function toAladhanDate(date: string) {
  const [year, month, day] = normalizeRequestedDate(date).split('-');
  return `${day}-${month}-${year}`;
}

function normalizeAladhanDate(date: string) {
  const match = date.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : date;
}

function cleanPrayerTime(value: string) {
  return value.match(/\b(\d{1,2}):(\d{2})\b/)?.[0] ?? '';
}

function validatePrayerResponse(data: PrayerTimesResponse, requestedDate: string) {
  const returnedDate = normalizeAladhanDate(data.date?.gregorian?.date ?? '');
  if (returnedDate !== requestedDate) {
    throw new Error(
      `Aladhan returned ${returnedDate || 'no date'} for requested date ${requestedDate}`
    );
  }

  const timings = Object.fromEntries(
    Object.entries(data.timings).map(([name, time]) => [name, cleanPrayerTime(time)])
  ) as unknown as PrayerTimings;

  if (!timings.Fajr || !timings.Dhuhr || !timings.Asr || !timings.Maghrib || !timings.Isha) {
    throw new Error('Aladhan returned incomplete prayer timings');
  }

  return {
    ...data,
    available: true,
    requestedDate,
    timings,
  };
}

async function aladhanFetch<T>(path: string, revalidate = 3600): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${ALADHAN_BASE}${path}`, {
        next: { revalidate },
        signal: AbortSignal.timeout(8_000),
      });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`Aladhan API error: ${res.status}`);
      const json = await res.json();
      if (json.code !== 200) throw new Error(`Aladhan API: ${json.status}`);
      return json.data as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastError ?? new Error('Aladhan API request failed');
}

export async function getPrayerTimesByCity(
  city: string,
  country: string,
  date?: string
): Promise<PrayerTimesResponse> {
  const requestedDate = normalizeRequestedDate(date);
  const dateParam = toAladhanDate(requestedDate);

  try {
    const response = await aladhanFetch<PrayerTimesResponse>(
      `/timingsByCity/${dateParam}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${PAKISTAN_CALCULATION_METHOD}&school=1`
    );
    return validatePrayerResponse(response, requestedDate);
  } catch {
    return getUnavailablePrayerTimesResponse(requestedDate);
  }
}

export async function getPrayerTimesByCoords(
  latitude: number,
  longitude: number,
  date?: string
): Promise<PrayerTimesResponse> {
  const requestedDate = normalizeRequestedDate(date);
  const dateParam = toAladhanDate(requestedDate);

  try {
    const response = await aladhanFetch<PrayerTimesResponse>(
      `/timings/${dateParam}?latitude=${latitude}&longitude=${longitude}&method=${PAKISTAN_CALCULATION_METHOD}&school=1`
    );
    return validatePrayerResponse(response, requestedDate);
  } catch {
    return getUnavailablePrayerTimesResponse(requestedDate);
  }
}

export async function getMonthlyPrayerCalendar(
  city: string,
  country: string,
  year: number,
  month: number
): Promise<MonthlyPrayerDay[]> {
  try {
    return await aladhanFetch<MonthlyPrayerDay[]>(
      `/calendarByCity/${year}/${month}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${PAKISTAN_CALCULATION_METHOD}&school=1`,
      86400
    );
  } catch {
    return [];
  }
}

export async function getQiblaDirection(
  latitude: number,
  longitude: number
): Promise<QiblaResponse> {
  try {
    return await aladhanFetch<QiblaResponse>(
      `/qibla/${latitude}/${longitude}`,
      86400
    );
  } catch {
    return getFallbackQiblaResponse(latitude, longitude);
  }
}

export async function getCurrentHijriDate(): Promise<{
  hijri: HijriDate;
  gregorian: { date: string; weekday: { en: string } };
} | null> {
  const requestedDate = getPakistanDateIso();
  try {
    const response = await aladhanFetch<{
      hijri: HijriDate;
      gregorian: { date: string; weekday: { en: string } };
    }>(`/gToH/${toAladhanDate(requestedDate)}`, 3600);
    return normalizeAladhanDate(response.gregorian.date) === requestedDate ? response : null;
  } catch {
    return null;
  }
}

export async function getHijriCalendarMonth(
  month: number,
  year: number
): Promise<Array<{ gregorian: { date: string; day: string }; hijri: HijriDate }>> {
  try {
    return await aladhanFetch(`/gToHCalendar/${month}/${year}`, 86400);
  } catch {
    return [];
  }
}

export const PRAYER_NAMES = [
  { key: 'Fajr', label: 'Fajr', labelUrdu: 'فجر', icon: '🌅' },
  { key: 'Sunrise', label: 'Sunrise', labelUrdu: 'طلوع آفتاب', icon: '☀️' },
  { key: 'Dhuhr', label: 'Dhuhr', labelUrdu: 'ظہر', icon: '🕌' },
  { key: 'Asr', label: 'Asr', labelUrdu: 'عصر', icon: '🌤️' },
  { key: 'Maghrib', label: 'Maghrib', labelUrdu: 'مغرب', icon: '🌇' },
  { key: 'Isha', label: 'Isha', labelUrdu: 'عشاء', icon: '🌙' },
] as const;

export function getNextPrayer(timings: PrayerTimings): {
  name: string;
  time: string;
  labelUrdu: string;
} | null {
  const now = new Date();
  const prayers = PRAYER_NAMES.filter((p) =>
    ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(p.key)
  );

  for (const prayer of prayers) {
    const timeStr = timings[prayer.key as keyof PrayerTimings];
    if (!timeStr) continue;
    const [h, m] = timeStr.split(':').map(Number);
    const prayerDate = new Date();
    prayerDate.setHours(h, m, 0, 0);
    if (prayerDate > now) {
      return { name: prayer.label, time: timeStr, labelUrdu: prayer.labelUrdu };
    }
  }

  const fajr = timings.Fajr;
  if (fajr) {
    return { name: 'Fajr', time: fajr, labelUrdu: 'فجر' };
  }
  return null;
}
