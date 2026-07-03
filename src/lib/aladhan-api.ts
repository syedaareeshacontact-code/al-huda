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

async function aladhanFetch<T>(path: string, revalidate = 3600): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${ALADHAN_BASE}${path}`, {
        next: { revalidate },
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
  const dateParam = date ?? new Date().toISOString().split('T')[0];
  const data = await aladhanFetch<PrayerTimesResponse>(
    `/timingsByCity/${dateParam}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${PAKISTAN_CALCULATION_METHOD}&school=1`
  );
  return data;
}

export async function getPrayerTimesByCoords(
  latitude: number,
  longitude: number,
  date?: string
): Promise<PrayerTimesResponse> {
  const dateParam = date ?? new Date().toISOString().split('T')[0];
  const data = await aladhanFetch<PrayerTimesResponse>(
    `/timings/${dateParam}?latitude=${latitude}&longitude=${longitude}&method=${PAKISTAN_CALCULATION_METHOD}&school=1`
  );
  return data;
}

export async function getMonthlyPrayerCalendar(
  city: string,
  country: string,
  year: number,
  month: number
): Promise<MonthlyPrayerDay[]> {
  const data = await aladhanFetch<MonthlyPrayerDay[]>(
    `/calendarByCity/${year}/${month}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${PAKISTAN_CALCULATION_METHOD}&school=1`,
    86400
  );
  return data;
}

export async function getQiblaDirection(
  latitude: number,
  longitude: number
): Promise<QiblaResponse> {
  return aladhanFetch<QiblaResponse>(
    `/qibla/${latitude}/${longitude}`,
    86400
  );
}

export async function getCurrentHijriDate(): Promise<{
  hijri: HijriDate;
  gregorian: { date: string; weekday: { en: string } };
}> {
  return aladhanFetch(`/gToH`, 3600);
}

export async function getHijriCalendarMonth(
  month: number,
  year: number
): Promise<Array<{ gregorian: { date: string; day: string }; hijri: HijriDate }>> {
  return aladhanFetch(`/gToHCalendar/${month}/${year}`, 86400);
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
