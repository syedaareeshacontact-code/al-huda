import { NextResponse } from 'next/server';

import {
  createUserNotification,
  listQuranReminderPushSubscriptions,
  markPushReminderSent,
} from '@/lib/auth/users-store';
import { buildSurahPath } from '@/lib/quran-routing';
import { getAllSurahs } from '@/lib/quran-index';
import { sendPushNotificationToSubscriptions } from '@/lib/push/send-push-notification';
import { isQuranReminderDueForSubscription } from '@/lib/push/quran-reminder-schedule';

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
  const subscriptionsByUser = new Map<string, typeof subscriptions>();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    if (!isQuranReminderDueForSubscription(subscription, now)) {
      skipped += 1;
      continue;
    }

    const userSubscriptions = subscriptionsByUser.get(subscription.userId) ?? [];
    userSubscriptions.push(subscription);
    subscriptionsByUser.set(subscription.userId, userSubscriptions);
  }

  for (const [userId, dueSubscriptions] of subscriptionsByUser.entries()) {
    const surah = getRandomSurah(`${userId}:${nowIso.slice(0, 16)}`);
    const href = buildSurahPath(surah.id, surah.surahName);
    const title = `Read Surah ${surah.surahName}`;
    const body = `${surah.surahNameTranslation} • ${surah.totalAyah} ayahs. Take two minutes for Quran reflection.`;

    const result = await sendPushNotificationToSubscriptions(dueSubscriptions, {
      title,
      body,
      tag: `quran-reminder-${userId}-${surah.id}`,
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
      await Promise.all(
        dueSubscriptions.map((subscription) =>
          markPushReminderSent(subscription.userId, subscription.endpoint, nowIso)
        )
      );
      await createUserNotification(userId, {
        type: 'quran',
        priority: 'normal',
        title: `Read Surah ${surah.surahName}`,
        message: body,
        href,
        metadata: {
          kind: 'quran-reminder',
          pushSent: result.sent,
          pushTargets: dueSubscriptions.length,
          surahId: surah.id,
        },
      });
      sent += result.sent;
      failed += result.failed;
    } else {
      failed += result.failed || dueSubscriptions.length;
    }
  }

  return NextResponse.json({
    ok: true,
    checked: subscriptions.length,
    dueUsers: subscriptionsByUser.size,
    schedule: 'local-9am',
    sent,
    skipped,
    failed,
    at: nowIso,
  });
}
