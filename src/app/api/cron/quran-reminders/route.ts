import { NextResponse } from 'next/server';
import type { PushSubscription } from 'web-push';

import {
  listQuranReminderPushSubscriptions,
  markPushReminderSent,
  markPushSubscriptionFailure,
} from '@/lib/auth/users-store';
import { buildSurahPath } from '@/lib/quran-routing';
import { getAllSurahs } from '@/lib/quran-index';
import { getConfiguredWebPush } from '@/lib/push/web-push';

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

  const push = getConfiguredWebPush();
  if (!push) {
    return NextResponse.json({ message: 'Web push is not configured.' }, { status: 503 });
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
    const payload = JSON.stringify({
      title: `Read Surah ${surah.surahName}`,
      body: `${surah.surahNameTranslation} • ${surah.totalAyah} ayahs. Take two minutes for Quran reflection.`,
      icon: '/logos/pwa-192.png',
      badge: '/logos/favicon-48.png',
      tag: `quran-reminder-${surah.id}`,
      url: href,
      data: {
        url: href,
        surahId: surah.id,
        kind: 'quran-reminder',
      },
    });

    try {
      await push.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        } satisfies PushSubscription,
        payload,
        {
          TTL: 120,
          urgency: 'normal',
        }
      );
      await markPushReminderSent(subscription.userId, subscription.endpoint, nowIso);
      sent += 1;
    } catch (error) {
      const statusCode =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number((error as { statusCode?: unknown }).statusCode)
          : 0;
      await markPushSubscriptionFailure(
        subscription.userId,
        subscription.endpoint,
        statusCode === 404 || statusCode === 410
      );
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
