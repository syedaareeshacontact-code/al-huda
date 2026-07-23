import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAdminUser } from '@/lib/auth/current-user';
import {
  getAnalyticsDataClient,
  getGa4PropertyId,
  readGaDimension,
  readGaMetric,
  secondsToMinutes,
} from '@/lib/analytics/ga4';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

function getAllowedOrigins() {
  return [
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(process.env.ANALYTICS_DASHBOARD_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ];
}

function corsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const headers: Record<string, string> = {
    Vary: 'Origin',
  };

  if (origin && getAllowedOrigins().includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }

  return headers;
}

function json(request: NextRequest, body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: corsHeaders(request),
  });
}

function formatDateHour(value: string) {
  if (value.length !== 10) {
    return value;
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)} ${value.slice(8)}:00`;
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  const adminUser = await getCurrentAdminUser();

  if (!adminUser) {
    return json(request, { message: 'Forbidden' }, 403);
  }

  const propertyId = getGa4PropertyId();

  if (!propertyId) {
    return json(request, { message: 'GA4_PROPERTY_ID is not configured.' }, 500);
  }

  const analyticsData = getAnalyticsDataClient();
  const property = `properties/${propertyId}`;

  try {
    const [
      [monthly],
      [last24Hours],
      [topPages],
      [trafficSources],
      [countries],
      [devices],
      [realtime],
    ] = await Promise.all([
      analyticsData.runReport({
        property,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'totalUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'userEngagementDuration' },
          { name: 'averageSessionDuration' },
        ],
      }),
      analyticsData.runReport({
        property,
        dateRanges: [{ startDate: 'yesterday', endDate: 'today' }],
        dimensions: [{ name: 'dateHour' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'userEngagementDuration' },
        ],
        orderBys: [{ dimension: { dimensionName: 'dateHour' } }],
        limit: 48,
      }),
      analyticsData.runReport({
        property,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'userEngagementDuration' },
        ],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      }),
      analyticsData.runReport({
        property,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 8,
      }),
      analyticsData.runReport({
        property,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 8,
      }),
      analyticsData.runReport({
        property,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      }),
      analyticsData.runRealtimeReport({
        property,
        metrics: [{ name: 'activeUsers' }],
      }),
    ]);

    const monthlyRow = monthly.rows?.[0];
    const realtimeRow = realtime.rows?.[0];
    const hourlyRows = last24Hours.rows || [];

    return json(request, {
      propertyId,
      generatedAt: new Date().toISOString(),
      monthly: {
        activeUsers: monthlyRow ? readGaMetric(monthlyRow, 0) : 0,
        totalUsers: monthlyRow ? readGaMetric(monthlyRow, 1) : 0,
        sessions: monthlyRow ? readGaMetric(monthlyRow, 2) : 0,
        pageViews: monthlyRow ? readGaMetric(monthlyRow, 3) : 0,
        engagementMinutes: monthlyRow ? secondsToMinutes(readGaMetric(monthlyRow, 4)) : 0,
        averageSessionSeconds: monthlyRow ? readGaMetric(monthlyRow, 5) : 0,
      },
      last24Hours: {
        activeUsers: hourlyRows.reduce((total, row) => total + readGaMetric(row, 0), 0),
        sessions: hourlyRows.reduce((total, row) => total + readGaMetric(row, 1), 0),
        pageViews: hourlyRows.reduce((total, row) => total + readGaMetric(row, 2), 0),
        engagementMinutes: secondsToMinutes(
          hourlyRows.reduce((total, row) => total + readGaMetric(row, 3), 0)
        ),
        hourly: hourlyRows.slice(-24).map((row) => ({
          dateHour: formatDateHour(readGaDimension(row, 0)),
          activeUsers: readGaMetric(row, 0),
          sessions: readGaMetric(row, 1),
          pageViews: readGaMetric(row, 2),
        })),
      },
      realtime: {
        activeUsers: realtimeRow ? readGaMetric(realtimeRow, 0) : 0,
      },
      topPages: (topPages.rows || []).map((row) => ({
        path: readGaDimension(row, 0),
        title: readGaDimension(row, 1) || readGaDimension(row, 0),
        pageViews: readGaMetric(row, 0),
        activeUsers: readGaMetric(row, 1),
        engagementMinutes: secondsToMinutes(readGaMetric(row, 2)),
      })),
      trafficSources: (trafficSources.rows || []).map((row) => ({
        channel: readGaDimension(row, 0) || '(not set)',
        sessions: readGaMetric(row, 0),
        activeUsers: readGaMetric(row, 1),
      })),
      countries: (countries.rows || []).map((row) => ({
        country: readGaDimension(row, 0) || '(not set)',
        activeUsers: readGaMetric(row, 0),
        pageViews: readGaMetric(row, 1),
      })),
      devices: (devices.rows || []).map((row) => ({
        device: readGaDimension(row, 0) || '(not set)',
        activeUsers: readGaMetric(row, 0),
        pageViews: readGaMetric(row, 1),
      })),
    });
  } catch (error) {
    console.error('[admin analytics] Unable to load GA4 report', error);

    return json(
      request,
      {
        message: 'Unable to load Google Analytics report.',
      },
      500
    );
  }
}
