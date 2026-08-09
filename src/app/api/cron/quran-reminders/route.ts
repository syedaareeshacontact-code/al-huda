import { NextResponse } from 'next/server';

import {
  claimUserPrayerReminder,
  createUserNotification,
  listPrayerReminderPushTargets,
  listQuranReminderPushSubscriptions,
  type PrayerReminderPushTarget,
  type PushSubscriptionForDelivery,
} from '@/lib/auth/users-store';
import {
  buildEngagementCampaign,
  type EngagementCampaign,
} from '@/lib/push/engagement-content';
import {
  getEngagementDecision,
  type EngagementAudience,
  type EngagementDecision,
} from '@/lib/push/engagement-schedule';
import {
  claimGuestPushEngagement,
  listEnabledGuestPushSubscriptions,
  type GuestPushSubscriptionForDelivery,
} from '@/lib/push/guest-push-store';
import {
  sendPushNotificationToSubscriptions,
  type PushDeliveryResult,
} from '@/lib/push/send-push-notification';
import {
  formatAladhanDate,
  getDateKeyInTimeZone,
  getPrayerReminderDecision,
} from '@/lib/push/prayer-reminder-schedule';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type DeliverySubscription =
  | PushSubscriptionForDelivery
  | GuestPushSubscriptionForDelivery;

interface DueTarget {
  audience: EngagementAudience;
  decision: EngagementDecision;
  subscription: DeliverySubscription;
}

interface CampaignBucket {
  campaign: EngagementCampaign;
  engagementLocalDateKey: string;
  subscriptions: DeliverySubscription[];
}

const CAMPAIGN_DELIVERY_CONCURRENCY = 4;
const GUEST_CLAIM_CONCURRENCY = 24;
const PRAYER_DELIVERY_CONCURRENCY = 8;

interface PrayerTimingsResponse {
  code?: number;
  data?: {
    timings?: Record<string, string>;
    date?: { gregorian?: { date?: string } };
    meta?: { timezone?: string };
  };
}

interface PrayerTimings {
  dateKey: string;
  timeZone: string;
  timings: Record<string, string>;
}

interface PrayerDeliverySummary {
  checked: number;
  due: number;
  bellCreated: number;
  sent: number;
  failed: number;
  disabled: number;
  retried: number;
  persistenceFailed: number;
  unavailable: boolean;
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization') ?? '';

  if (!cronSecret) {
    return process.env.NODE_ENV !== 'production';
  }

  return authorization === `Bearer ${cronSecret}`;
}

function isUserSubscription(
  subscription: DeliverySubscription
): subscription is PushSubscriptionForDelivery {
  return !('ownerType' in subscription && subscription.ownerType === 'guest');
}

function getCampaignCacheKey(target: DueTarget) {
  const { decision, subscription } = target;
  if (decision.kind !== 'quran' || !isUserSubscription(subscription)) {
    return `${decision.kind}:${decision.localDateKey}`;
  }

  const lastRead = subscription.userLastRead;
  return lastRead
    ? `${decision.kind}:${decision.localDateKey}:${lastRead.surahId}:${lastRead.ayahNumber}`
    : `${decision.kind}:${decision.localDateKey}`;
}

async function buildCampaignBuckets(targets: DueTarget[]) {
  const campaignCache = new Map<string, Promise<EngagementCampaign>>();
  const buckets = new Map<string, CampaignBucket>();

  for (const target of targets) {
    const cacheKey = getCampaignCacheKey(target);
    let campaignPromise = campaignCache.get(cacheKey);
    if (!campaignPromise) {
      campaignPromise = buildEngagementCampaign({
        kind: target.decision.kind,
        localDateKey: target.decision.localDateKey,
        lastRead: isUserSubscription(target.subscription)
          ? target.subscription.userLastRead
          : null,
      });
      campaignCache.set(cacheKey, campaignPromise);
    }

    const campaign = await campaignPromise;
    const existingBucket = buckets.get(campaign.id);
    if (existingBucket) {
      existingBucket.subscriptions.push(target.subscription);
    } else {
      buckets.set(campaign.id, {
        campaign,
        engagementLocalDateKey: target.decision.localDateKey,
        subscriptions: [target.subscription],
      });
    }
  }

  return Array.from(buckets.values());
}

async function deliverCampaignBuckets(buckets: CampaignBucket[]) {
  const results = new Array<PushDeliveryResult>(buckets.length);
  let nextIndex = 0;
  const workerCount = Math.min(CAMPAIGN_DELIVERY_CONCURRENCY, buckets.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < buckets.length) {
        const index = nextIndex;
        nextIndex += 1;
        const bucket = buckets[index];
        results[index] = await sendPushNotificationToSubscriptions(
          bucket.subscriptions,
          {
            title: bucket.campaign.title,
            body: bucket.campaign.body,
            url: bucket.campaign.href,
            tag: `daily-reading-engagement-${bucket.campaign.id}`,
            renotify: true,
            ttlSeconds: 43_200,
            urgency: 'high',
            data: {
              campaignId: bucket.campaign.id,
              kind: bucket.campaign.kind,
            },
          },
          {
            engagementKind: bucket.campaign.kind,
            engagementLocalDateKey: bucket.engagementLocalDateKey,
            deliverySource: 'scheduled',
          }
        );
      }
    })
  );

  return results.reduce(
    (summary, result) => ({
      sent: summary.sent + result.sent,
      failed: summary.failed + result.failed,
      disabled: summary.disabled + result.disabled,
      retried: summary.retried + result.retried,
      persistenceFailed: summary.persistenceFailed + result.persistenceFailed,
      unavailable: summary.unavailable || result.unavailable,
    }),
    {
      sent: 0,
      failed: 0,
      disabled: 0,
      retried: 0,
      persistenceFailed: 0,
      unavailable: false,
    }
  );
}

async function claimDueGuestTargets(
  subscriptions: GuestPushSubscriptionForDelivery[],
  now: Date,
  claimedAt: string
) {
  const candidates = subscriptions.flatMap((subscription) => {
    const decision = getEngagementDecision(subscription, 'guest', now);
    return decision ? [{ audience: 'guest' as const, decision, subscription }] : [];
  });
  const claimedTargets = new Array<DueTarget | null>(candidates.length).fill(null);
  let nextIndex = 0;
  const workerCount = Math.min(GUEST_CLAIM_CONCURRENCY, candidates.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < candidates.length) {
        const index = nextIndex;
        nextIndex += 1;
        const target = candidates[index];
        const claimed = await claimGuestPushEngagement({
          guestDeviceId: target.subscription.guestDeviceId,
          localDateKey: target.decision.localDateKey,
          claimedAt,
        });
        if (claimed) {
          claimedTargets[index] = target;
        }
      }
    })
  );

  return claimedTargets.filter((target): target is DueTarget => Boolean(target));
}

async function fetchPrayerTimings(
  city: string,
  country: string,
  dateKey: string,
  fallbackTimeZone: string
): Promise<PrayerTimings | null> {
  const aladhanDate = formatAladhanDate(dateKey);
  const response = await fetch(
    `https://api.aladhan.com/v1/timingsByCity/${aladhanDate}?city=${encodeURIComponent(
      city
    )}&country=${encodeURIComponent(country)}&method=1&school=1`,
    { next: { revalidate: 0 } }
  );
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as PrayerTimingsResponse;
  if (
    payload.data?.date?.gregorian?.date !== aladhanDate ||
    !payload.data.timings
  ) {
    return null;
  }

  return {
    dateKey,
    timeZone: payload.data.meta?.timezone || fallbackTimeZone,
    timings: payload.data.timings,
  };
}

async function getPrayerTimingsForTarget(
  target: PrayerReminderPushTarget,
  now: Date,
  cache: Map<string, Promise<PrayerTimings | null>>
) {
  const fallbackTimeZone = target.subscriptions[0]?.timeZone || 'UTC';
  const load = (dateKey: string, timeZone: string) => {
    const cacheKey = `${target.settings.country}:${target.settings.city}:${dateKey}`;
    let request = cache.get(cacheKey);
    if (!request) {
      request = fetchPrayerTimings(
        target.settings.city,
        target.settings.country,
        dateKey,
        timeZone
      );
      cache.set(cacheKey, request);
    }
    return request;
  };

  let timings = await load(getDateKeyInTimeZone(now, fallbackTimeZone), fallbackTimeZone);
  if (!timings) {
    return null;
  }

  const targetDateKey = getDateKeyInTimeZone(now, timings.timeZone);
  if (timings.dateKey !== targetDateKey) {
    timings = await load(targetDateKey, timings.timeZone);
  }

  return timings;
}

async function deliverPrayerReminders(
  targets: PrayerReminderPushTarget[],
  now: Date
): Promise<PrayerDeliverySummary> {
  const summary: PrayerDeliverySummary = {
    checked: targets.length,
    due: 0,
    bellCreated: 0,
    sent: 0,
    failed: 0,
    disabled: 0,
    retried: 0,
    persistenceFailed: 0,
    unavailable: false,
  };
  const timingCache = new Map<string, Promise<PrayerTimings | null>>();
  let nextIndex = 0;
  const workerCount = Math.min(PRAYER_DELIVERY_CONCURRENCY, targets.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < targets.length) {
        const index = nextIndex;
        nextIndex += 1;
        const target = targets[index];

        try {
          const timings = await getPrayerTimingsForTarget(target, now, timingCache);
          if (!timings) {
            continue;
          }

          const decision = getPrayerReminderDecision({
            timings: timings.timings,
            timeZone: timings.timeZone,
            city: target.settings.city,
            country: target.settings.country,
            reminderMinutes: target.settings.reminderMinutes,
          }, now);
          if (!decision) {
            continue;
          }

          summary.due += 1;
          const claimed = await claimUserPrayerReminder(
            target.userId,
            decision.reminderKey
          );
          if (!claimed) {
            continue;
          }

          const notification = await createUserNotification(target.userId, {
            type: 'prayer',
            priority: 'high',
            title: decision.title,
            message: decision.message,
            href: '/prayer-times',
            metadata: {
              prayer: decision.prayer,
              city: target.settings.city,
              country: target.settings.country,
              reminderMinutes: target.settings.reminderMinutes,
              reminderKey: decision.reminderKey,
            },
          });
          if (notification) {
            summary.bellCreated += 1;
          }

          const delivery = await sendPushNotificationToSubscriptions(
            target.subscriptions,
            {
              title: decision.title,
              body: decision.message,
              url: '/prayer-times',
              tag: `prayer-${decision.reminderKey}`,
              renotify: true,
              ttlSeconds: 1_800,
              urgency: 'high',
              data: {
                kind: 'prayer',
                prayer: decision.prayer,
                reminderKey: decision.reminderKey,
                reminderMinutes: target.settings.reminderMinutes,
              },
            },
            { deliverySource: 'user-notification' }
          );
          summary.sent += delivery.sent;
          summary.failed += delivery.failed;
          summary.disabled += delivery.disabled;
          summary.retried += delivery.retried;
          summary.persistenceFailed += delivery.persistenceFailed;
          summary.unavailable ||= delivery.unavailable;
        } catch {
          summary.failed += 1;
        }
      }
    })
  );

  return summary;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const [userSubscriptions, guestSubscriptions, prayerTargets] = await Promise.all([
    listQuranReminderPushSubscriptions(),
    listEnabledGuestPushSubscriptions(),
    listPrayerReminderPushTargets(),
  ]);
  const dueTargets: DueTarget[] = [];

  for (const subscription of userSubscriptions) {
    const decision = getEngagementDecision(subscription, 'user', now);
    if (decision) {
      dueTargets.push({ audience: 'user', decision, subscription });
    }
  }

  dueTargets.push(...(await claimDueGuestTargets(guestSubscriptions, now, nowIso)));

  const buckets = await buildCampaignBuckets(dueTargets);
  const delivery = await deliverCampaignBuckets(buckets);
  const prayer = await deliverPrayerReminders(prayerTargets, now);
  const totalDue = dueTargets.length + prayer.due;
  const totalSent = delivery.sent + prayer.sent;
  const totalFailed = delivery.failed + prayer.failed;
  if ((delivery.unavailable || prayer.unavailable) && totalDue > 0) {
    return NextResponse.json({ message: 'Web push is not configured.' }, { status: 503 });
  }

  const countTargets = (audience: EngagementAudience) =>
    dueTargets.filter((target) => target.audience === audience).length;
  const countKind = (kind: EngagementDecision['kind']) =>
    dueTargets.filter((target) => target.decision.kind === kind).length;
  const everyDueDeliveryFailed = totalDue > 0 && totalSent === 0 && totalFailed > 0;

  return NextResponse.json(
    {
      ok: !everyDueDeliveryFailed,
      checked: userSubscriptions.length + guestSubscriptions.length + prayer.checked,
      checkedUsers: userSubscriptions.length,
      checkedGuests: guestSubscriptions.length,
      due: dueTargets.length,
      dueUsers: countTargets('user'),
      dueGuests: countTargets('guest'),
      content: {
        hadith: countKind('hadith'),
        quran: countKind('quran'),
        islamic: countKind('islamic'),
      },
      campaigns: buckets.length,
      schedule: 'daily-local-9am-catch-up-and-prayer-reminders',
      ...delivery,
      prayer,
      at: nowIso,
    },
    { status: everyDueDeliveryFailed ? 503 : 200 }
  );
}
