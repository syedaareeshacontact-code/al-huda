import { NextResponse } from 'next/server';

import {
  listQuranReminderPushSubscriptions,
  markPushReminderSent,
} from '@/lib/auth/users-store';
import { buildSurahPath } from '@/lib/quran-routing';
import { getAllSurahs } from '@/lib/quran-index';
import { sendPushNotificationToSubscriptions } from '@/lib/push/send-push-notification';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization') ?? '';

  if (cronSecret) {
    return authorization === `Bearer ${cronSecret}`;
  }

  return process.env.NODE_ENV !== 'production' || request.headers.get('x-vercel-cron') === '1';
}

function getRandomSurah(seed: string) {
  const surahs = getAllSurahs();
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return surahs[hash % surahs.length] ?? surahs[0];
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const subscriptions = await listQuranReminderPushSubscriptions();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    const lastReminderAt = subscription.lastReminderAt
      ? new Date(subscription.lastReminderAt).getTime()
      : 0;
    const intervalMs = subscription.intervalMinutes * 60_000;

    if (lastReminderAt && now.getTime() - lastReminderAt < intervalMs) {
      skipped += 1;
      continue;
    }

    const surah = getRandomSurah(`${subscription.endpoint}:${nowIso.slice(0, 16)}`);
    const href = buildSurahPath(surah.id, surah.surahName);
    const result = await sendPushNotificationToSubscriptions([subscription], {
      title: `Read Surah ${surah.surahName}`,
      body: `${surah.surahNameTranslation} • ${surah.totalAyah} ayahs. Take two minutes for Quran reflection.`,
      tag: `quran-reminder-${surah.id}`,
      url: href,
      data: {
        surahId: surah.id,
        kind: 'quran-reminder',
      },
    });

    if (result.unavailable) {
      return NextResponse.json({ message: 'Web push is not configured.' }, { status: 503 });
    }

    if (result.sent > 0) {
      await markPushReminderSent(subscription.userId, subscription.endpoint, nowIso);
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    checked: subscriptions.length,
    sent,
    skipped,
    failed,
    at: nowIso,
  });
}
