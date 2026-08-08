import { NextResponse } from 'next/server';

import {
  listQuranReminderPushSubscriptions,
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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const [userSubscriptions, guestSubscriptions] = await Promise.all([
    listQuranReminderPushSubscriptions(),
    listEnabledGuestPushSubscriptions(),
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
  if (delivery.unavailable && dueTargets.length > 0) {
    return NextResponse.json({ message: 'Web push is not configured.' }, { status: 503 });
  }

  const countTargets = (audience: EngagementAudience) =>
    dueTargets.filter((target) => target.audience === audience).length;
  const countKind = (kind: EngagementDecision['kind']) =>
    dueTargets.filter((target) => target.decision.kind === kind).length;
  const everyDueDeliveryFailed =
    dueTargets.length > 0 && delivery.sent === 0 && delivery.failed > 0;

  return NextResponse.json(
    {
      ok: !everyDueDeliveryFailed,
      checked: userSubscriptions.length + guestSubscriptions.length,
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
      schedule: 'guest-daily-local-9am-catch-up',
      ...delivery,
      at: nowIso,
    },
    { status: everyDueDeliveryFailed ? 503 : 200 }
  );
}
