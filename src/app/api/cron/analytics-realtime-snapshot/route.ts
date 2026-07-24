import { NextResponse } from 'next/server';

import {
  getAnalyticsDataClient,
  getGa4PropertyId,
  readGaMetric,
} from '@/lib/analytics/ga4';
import {
  getRealtimeActivity,
  realtimeActivityWithFallback,
} from '@/lib/analytics/realtime-report';
import { saveRealtimeSnapshot } from '@/lib/analytics/realtime-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization') ?? '';

  if (cronSecret) {
    return authorization === `Bearer ${cronSecret}`;
  }

  return process.env.NODE_ENV !== 'production' || request.headers.get('x-vercel-cron') === '1';
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const propertyId = getGa4PropertyId();

  if (!propertyId) {
    return NextResponse.json(
      { message: 'GA4_PROPERTY_ID is not configured.' },
      { status: 500 }
    );
  }

  const analyticsData = getAnalyticsDataClient();
  const property = `properties/${propertyId}`;

  try {
    const [[realtime], realtimeActivityRows] = await Promise.all([
      analyticsData.runRealtimeReport({
        property,
        metrics: [{ name: 'activeUsers' }],
      }),
      getRealtimeActivity(analyticsData, property),
    ]);
    const activeUsers = realtime.rows?.[0] ? readGaMetric(realtime.rows[0], 0) : 0;
    const activity = realtimeActivityWithFallback(realtimeActivityRows, activeUsers);
    const capturedAt = new Date().toISOString();
    const snapshot = await saveRealtimeSnapshot({
      propertyId,
      capturedAt,
      activeUsers,
      activity,
    });

    return NextResponse.json({
      ok: true,
      propertyId,
      capturedAt,
      activeUsers,
      activityGroups: activity.length,
      snapshot,
    });
  } catch (error) {
    console.error('[analytics realtime cron] Unable to save snapshot', error);

    return NextResponse.json(
      { message: 'Unable to save realtime analytics snapshot.' },
      { status: 500 }
    );
  }
}
