'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  PRAYER_NAMES,
  type PrayerTimings,
  getNextPrayer,
} from '@/lib/aladhan-api';

interface PrayerTimesDisplayProps {
  timings: PrayerTimings;
  cityName?: string;
  hijriDate?: string;
  gregorianDate?: string;
}

export default function PrayerTimesDisplay({
  timings,
  cityName,
  hijriDate,
  gregorianDate,
}: PrayerTimesDisplayProps) {
  const [nextPrayer, setNextPrayer] = useState<ReturnType<typeof getNextPrayer>>(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const update = () => {
      const next = getNextPrayer(timings);
      setNextPrayer(next);
      if (next) {
        const [h, m] = next.time.split(':').map(Number);
        const target = new Date();
        target.setHours(h, m, 0, 0);
        if (target <= new Date()) target.setDate(target.getDate() + 1);
        const diff = target.getTime() - Date.now();
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setCountdown(`${hrs}h ${mins}m ${secs}s`);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timings]);

  const mainPrayers = PRAYER_NAMES.filter((p) =>
    ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(p.key)
  );

  return (
    <div className="space-y-6">
      {nextPrayer && (
        <Card className="overflow-hidden border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-accent),transparent_85%),color-mix(in_oklab,var(--color-accent-soft),transparent_90%))] shadow-[var(--shadow-glow)]">
          <CardContent className="p-6 text-center md:p-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-muted-text)]">
              Next Prayer{cityName ? ` in ${cityName}` : ''}
            </p>
            <p className="mt-2 font-display text-4xl font-bold text-[var(--color-heading)] md:text-5xl">
              {nextPrayer.name}
              <span className="urdu-font ml-3 text-2xl text-[var(--color-accent-soft)]" dir="rtl">
                {nextPrayer.labelUrdu}
              </span>
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-[var(--color-accent)]">
              {nextPrayer.time}
            </p>
            <p className="mt-3 text-sm text-[var(--color-muted-text)]">
              Starts in <span className="font-mono font-semibold text-[var(--color-heading)]">{countdown}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {(hijriDate || gregorianDate) && (
        <div className="flex flex-wrap gap-3">
          {hijriDate && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm">
              <span className="text-[var(--color-muted-text)]">Hijri: </span>
              <span className="font-semibold text-[var(--color-heading)]">{hijriDate}</span>
            </div>
          )}
          {gregorianDate && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm">
              <span className="text-[var(--color-muted-text)]">Gregorian: </span>
              <span className="font-semibold text-[var(--color-heading)]">{gregorianDate}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {mainPrayers.map((prayer) => {
          const time = timings[prayer.key as keyof PrayerTimings];
          const isNext = nextPrayer?.name === prayer.label;
          return (
            <Card
              key={prayer.key}
              className={
                isNext
                  ? 'border-[var(--color-accent-soft)] shadow-[var(--shadow-glow)]'
                  : ''
              }
            >
              <CardContent className="p-4 text-center">
                <span className="text-2xl">{prayer.icon}</span>
                <p className="mt-2 font-semibold text-[var(--color-heading)]">
                  {prayer.label}
                </p>
                <p className="urdu-font text-sm text-[var(--color-accent-soft)]" dir="rtl">
                  {prayer.labelUrdu}
                </p>
                <p className="mt-2 text-xl font-bold tabular-nums text-[var(--color-accent)]">
                  {time}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {timings.Sunrise && (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <span className="text-xl">☀️</span>
            <div>
              <p className="text-sm text-[var(--color-muted-text)]">Sunrise</p>
              <p className="font-semibold tabular-nums text-[var(--color-heading)]">{timings.Sunrise}</p>
            </div>
          </div>
        )}
        {timings.Imsak && (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <span className="text-xl">🌙</span>
            <div>
              <p className="text-sm text-[var(--color-muted-text)]">Imsak (Sehri ends)</p>
              <p className="font-semibold tabular-nums text-[var(--color-heading)]">{timings.Imsak}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
