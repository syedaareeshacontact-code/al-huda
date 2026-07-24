import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAdminUser } from '@/lib/auth/current-user';
import {
  getAnalyticsDataClient,
  getGa4PropertyId,
  readGaDimension,
  readGaMetric,
  secondsToMinutes,
} from '@/lib/analytics/ga4';
import {
  getRealtimeActivity,
  realtimeActivityWithFallback,
  type RealtimeActivityRow,
} from '@/lib/analytics/realtime-report';
import {
  listRecentRealtimeSnapshots,
  saveRealtimeSnapshot,
} from '@/lib/analytics/realtime-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

const AUDIENCE_DETAILS_PAGE_SIZE = 10_000;
const MAX_AUDIENCE_DETAILS = 250_000;
const DETAIL_REPORT_PAGE_SIZE = 10_000;
const MAX_DETAIL_REPORT_ROWS = 250_000;

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

function monthlyMetrics(row: unknown) {
  return {
    activeUsers: row ? readGaMetric(row, 0) : 0,
    totalUsers: row ? readGaMetric(row, 1) : 0,
    sessions: row ? readGaMetric(row, 2) : 0,
    pageViews: row ? readGaMetric(row, 3) : 0,
    engagementMinutes: row ? secondsToMinutes(readGaMetric(row, 4)) : 0,
    averageSessionSeconds: row ? readGaMetric(row, 5) : 0,
    engagedSessions: row ? readGaMetric(row, 6) : 0,
    engagementRate: row ? readGaMetric(row, 7) : 0,
  };
}

const MONTHLY_METRICS = [
  { name: 'activeUsers' },
  { name: 'totalUsers' },
  { name: 'sessions' },
  { name: 'screenPageViews' },
  { name: 'userEngagementDuration' },
  { name: 'averageSessionDuration' },
  { name: 'engagedSessions' },
  { name: 'engagementRate' },
];

function isIsoDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function audienceTechnologyKey(row: unknown, offset = 0) {
  return [
    readGaDimension(row, offset),
    readGaDimension(row, offset + 1),
    readGaDimension(row, offset + 2),
    readGaDimension(row, offset + 3),
    readGaDimension(row, offset + 4),
    readGaDimension(row, offset + 5),
    readGaDimension(row, offset + 6),
    readGaDimension(row, offset + 7),
  ].join('||');
}

async function getAudienceDetails(
  analyticsData: ReturnType<typeof getAnalyticsDataClient>,
  property: string,
  dateRange: { startDate: string; endDate: string }
) {
  const rows: unknown[] = [];
  let offset = 0;
  let rowCount = 0;

  do {
    const [response] = await analyticsData.runReport({
      property,
      dateRanges: [dateRange],
      dimensions: [
        { name: 'country' },
        { name: 'city' },
        { name: 'deviceCategory' },
        { name: 'operatingSystemWithVersion' },
        { name: 'browser' },
        { name: 'browserVersion' },
        { name: 'screenResolution' },
        { name: 'language' },
        { name: 'mobileDeviceMarketingName' },
      ],
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'userEngagementDuration' },
      ],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: Math.min(AUDIENCE_DETAILS_PAGE_SIZE, MAX_AUDIENCE_DETAILS - offset),
      offset,
    });

    const pageRows = response.rows || [];
    rows.push(...pageRows);
    rowCount = Number(response.rowCount || pageRows.length);
    offset += pageRows.length;

    if (pageRows.length === 0) {
      break;
    }
  } while (offset < Math.min(rowCount, MAX_AUDIENCE_DETAILS));

  return {
    rows,
    rowCount,
    truncated: rowCount > MAX_AUDIENCE_DETAILS,
  };
}

async function getAudienceLastActivity(
  analyticsData: ReturnType<typeof getAnalyticsDataClient>,
  property: string,
  dateRange: { startDate: string; endDate: string },
  targetKeys: Set<string>
) {
  const latestActivity = new Map<string, string>();
  let offset = 0;
  let rowCount = 0;

  if (targetKeys.size === 0) {
    return latestActivity;
  }

  do {
    const [response] = await analyticsData.runReport({
      property,
      dateRanges: [dateRange],
      dimensions: [
        { name: 'country' },
        { name: 'city' },
        { name: 'deviceCategory' },
        { name: 'operatingSystemWithVersion' },
        { name: 'browser' },
        { name: 'browserVersion' },
        { name: 'screenResolution' },
        { name: 'language' },
        { name: 'dateHourMinute' },
      ],
      metrics: [{ name: 'eventCount' }],
      orderBys: [{ dimension: { dimensionName: 'dateHourMinute' }, desc: true }],
      limit: Math.min(DETAIL_REPORT_PAGE_SIZE, MAX_DETAIL_REPORT_ROWS - offset),
      offset,
    });

    const pageRows = response.rows || [];
    rowCount = Number(response.rowCount || pageRows.length);

    for (const row of pageRows) {
      const key = audienceTechnologyKey(row);

      if (targetKeys.has(key) && !latestActivity.has(key)) {
        latestActivity.set(key, readGaDimension(row, 8));
      }
    }

    offset += pageRows.length;

    if (latestActivity.size >= targetKeys.size || pageRows.length === 0) {
      break;
    }
  } while (offset < Math.min(rowCount, MAX_DETAIL_REPORT_ROWS));

  return latestActivity;
}

async function getAudienceLandingPages(
  analyticsData: ReturnType<typeof getAnalyticsDataClient>,
  property: string,
  dateRange: { startDate: string; endDate: string },
  targetKeys: Set<string>
) {
  const landingPages = new Map<
    string,
    {
      path: string;
      sessions: number;
      activeUsers: number;
      pageViews: number;
    }[]
  >();
  let offset = 0;
  let rowCount = 0;

  if (targetKeys.size === 0) {
    return landingPages;
  }

  do {
    const [response] = await analyticsData.runReport({
      property,
      dateRanges: [dateRange],
      dimensions: [
        { name: 'country' },
        { name: 'city' },
        { name: 'deviceCategory' },
        { name: 'operatingSystemWithVersion' },
        { name: 'browser' },
        { name: 'browserVersion' },
        { name: 'screenResolution' },
        { name: 'language' },
        { name: 'landingPagePlusQueryString' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: Math.min(DETAIL_REPORT_PAGE_SIZE, MAX_DETAIL_REPORT_ROWS - offset),
      offset,
    });

    const pageRows = response.rows || [];
    rowCount = Number(response.rowCount || pageRows.length);

    for (const row of pageRows) {
      const key = audienceTechnologyKey(row);

      if (!targetKeys.has(key)) {
        continue;
      }

      const currentPages = landingPages.get(key) || [];

      if (currentPages.length >= 4) {
        continue;
      }

      currentPages.push({
        path: readGaDimension(row, 8) || '(not set)',
        sessions: readGaMetric(row, 0),
        activeUsers: readGaMetric(row, 1),
        pageViews: readGaMetric(row, 2),
      });
      landingPages.set(key, currentPages);
    }

    offset += pageRows.length;

    if (pageRows.length === 0) {
      break;
    }
  } while (offset < Math.min(rowCount, MAX_DETAIL_REPORT_ROWS));

  return landingPages;
}

async function getTrafficLandingDetails(
  analyticsData: ReturnType<typeof getAnalyticsDataClient>,
  property: string,
  dateRange: { startDate: string; endDate: string }
) {
  const rows: unknown[] = [];
  let offset = 0;
  let rowCount = 0;

  do {
    const [response] = await analyticsData.runReport({
      property,
      dateRanges: [dateRange],
      dimensions: [
        { name: 'sessionDefaultChannelGroup' },
        { name: 'sessionSourceMedium' },
        { name: 'landingPagePlusQueryString' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'engagementRate' },
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'userEngagementDuration' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: Math.min(DETAIL_REPORT_PAGE_SIZE, MAX_DETAIL_REPORT_ROWS - offset),
      offset,
    });

    const pageRows = response.rows || [];
    rows.push(...pageRows);
    rowCount = Number(response.rowCount || pageRows.length);
    offset += pageRows.length;

    if (pageRows.length === 0) {
      break;
    }
  } while (offset < Math.min(rowCount, MAX_DETAIL_REPORT_ROWS));

  return {
    rows,
    rowCount,
    truncated: rowCount > MAX_DETAIL_REPORT_ROWS,
  };
}

async function getTrafficQuality(
  analyticsData: ReturnType<typeof getAnalyticsDataClient>,
  property: string,
  dateRange: { startDate: string; endDate: string }
) {
  const rows: unknown[] = [];
  let offset = 0;
  let rowCount = 0;

  do {
    const [response] = await analyticsData.runReport({
      property,
      dateRanges: [dateRange],
      dimensions: [
        { name: 'sessionDefaultChannelGroup' },
        { name: 'sessionSourceMedium' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'engagementRate' },
        { name: 'averageSessionDuration' },
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: Math.min(DETAIL_REPORT_PAGE_SIZE, MAX_DETAIL_REPORT_ROWS - offset),
      offset,
    });

    const pageRows = response.rows || [];
    rows.push(...pageRows);
    rowCount = Number(response.rowCount || pageRows.length);
    offset += pageRows.length;

    if (pageRows.length === 0) {
      break;
    }
  } while (offset < Math.min(rowCount, MAX_DETAIL_REPORT_ROWS));

  return {
    rows,
    rowCount,
    truncated: rowCount > MAX_DETAIL_REPORT_ROWS,
  };
}

async function saveAndListRealtimeSnapshots(input: {
  propertyId: string;
  capturedAt: string;
  activeUsers: number;
  activity: RealtimeActivityRow[];
}) {
  const meta = {
    days: 7,
    saved: false,
    error: null as string | null,
  };

  try {
    await saveRealtimeSnapshot(input);
    meta.saved = true;
  } catch (snapshotSaveError) {
    console.warn('[admin analytics] Unable to save realtime snapshot', snapshotSaveError);
    meta.error = 'MongoDB realtime snapshot storage is unavailable.';
  }

  try {
    const snapshots = await listRecentRealtimeSnapshots({
      propertyId: input.propertyId,
      days: meta.days,
    });

    return {
      snapshots,
      meta,
    };
  } catch (snapshotListError) {
    console.warn('[admin analytics] Unable to list realtime snapshots', snapshotListError);

    return {
      snapshots: [],
      meta: {
        ...meta,
        error: meta.error || 'MongoDB realtime snapshot history is unavailable.',
      },
    };
  }
}

async function getPageEventDetails(
  analyticsData: ReturnType<typeof getAnalyticsDataClient>,
  property: string,
  dateRange: { startDate: string; endDate: string }
) {
  const rows: unknown[] = [];
  let offset = 0;
  let rowCount = 0;

  do {
    const [response] = await analyticsData.runReport({
      property,
      dateRanges: [dateRange],
      dimensions: [
        { name: 'pagePathPlusQueryString' },
        { name: 'pageTitle' },
        { name: 'eventName' },
      ],
      metrics: [
        { name: 'eventCount' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'userEngagementDuration' },
      ],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: Math.min(DETAIL_REPORT_PAGE_SIZE, MAX_DETAIL_REPORT_ROWS - offset),
      offset,
    });

    const pageRows = response.rows || [];
    rows.push(...pageRows);
    rowCount = Number(response.rowCount || pageRows.length);
    offset += pageRows.length;

    if (pageRows.length === 0) {
      break;
    }
  } while (offset < Math.min(rowCount, MAX_DETAIL_REPORT_ROWS));

  return {
    rows,
    rowCount,
    truncated: rowCount > MAX_DETAIL_REPORT_ROWS,
  };
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

  const requestedStartDate = request.nextUrl.searchParams.get('startDate');
  const requestedEndDate = request.nextUrl.searchParams.get('endDate');
  const requestedView = request.nextUrl.searchParams.get('view') || 'full';
  const hasCustomDateRange = Boolean(requestedStartDate || requestedEndDate);

  if (!['full', 'live', 'traffic'].includes(requestedView)) {
    return json(request, { message: 'Use a supported analytics view.' }, 400);
  }

  if (
    hasCustomDateRange &&
    (!isIsoDate(requestedStartDate) ||
      !isIsoDate(requestedEndDate) ||
      requestedStartDate! > requestedEndDate!)
  ) {
    return json(
      request,
      { message: 'Use a valid startDate and endDate in YYYY-MM-DD format.' },
      400
    );
  }

  const selectedDateRange = hasCustomDateRange
    ? { startDate: requestedStartDate!, endDate: requestedEndDate! }
    : { startDate: '30daysAgo', endDate: 'today' };

  const analyticsData = getAnalyticsDataClient();
  const property = `properties/${propertyId}`;

  try {
    if (requestedView === 'live') {
      const [[realtime], realtimeActivityRows] = await Promise.all([
        analyticsData.runRealtimeReport({
          property,
          metrics: [{ name: 'activeUsers' }],
        }),
        getRealtimeActivity(analyticsData, property).catch((realtimeActivityError) => {
          console.warn(
            '[admin analytics] Unable to load detailed GA4 realtime activity',
            realtimeActivityError
          );

          return [];
        }),
      ]);
      const realtimeRow = realtime.rows?.[0];
      const activeUsers = realtimeRow ? readGaMetric(realtimeRow, 0) : 0;
      const activity = realtimeActivityWithFallback(realtimeActivityRows, activeUsers);
      const generatedAt = new Date().toISOString();
      const storedRealtime = await saveAndListRealtimeSnapshots({
        propertyId,
        capturedAt: generatedAt,
        activeUsers,
        activity,
      });

      return json(request, {
        propertyId,
        generatedAt,
        realtime: {
          activeUsers,
          activity,
        },
        storedRealtime,
      });
    }

    if (requestedView === 'traffic') {
      const [[monthly], trafficQuality, trafficLandingDetails] = await Promise.all([
        analyticsData.runReport({
          property,
          dateRanges: [selectedDateRange],
          metrics: MONTHLY_METRICS,
        }),
        getTrafficQuality(analyticsData, property, selectedDateRange),
        getTrafficLandingDetails(analyticsData, property, selectedDateRange),
      ]);
      const monthlyRow = monthly.rows?.[0];

      return json(request, {
        propertyId,
        generatedAt: new Date().toISOString(),
        dateRange: selectedDateRange,
        monthly: monthlyMetrics(monthlyRow),
        trafficQuality: trafficQuality.rows.map((row) => ({
          channel: readGaDimension(row, 0) || '(not set)',
          sourceMedium: readGaDimension(row, 1) || '(not set)',
          sessions: readGaMetric(row, 0),
          engagedSessions: readGaMetric(row, 1),
          engagementRate: readGaMetric(row, 2),
          averageSessionSeconds: readGaMetric(row, 3),
          pageViews: readGaMetric(row, 4),
          activeUsers: readGaMetric(row, 5),
        })),
        trafficQualityMeta: {
          rowCount: trafficQuality.rowCount,
          truncated: trafficQuality.truncated,
        },
        trafficLandingDetails: trafficLandingDetails.rows.map((row) => ({
          channel: readGaDimension(row, 0) || '(not set)',
          sourceMedium: readGaDimension(row, 1) || '(not set)',
          landingPage: readGaDimension(row, 2) || '(not set)',
          sessions: readGaMetric(row, 0),
          engagedSessions: readGaMetric(row, 1),
          engagementRate: readGaMetric(row, 2),
          pageViews: readGaMetric(row, 3),
          activeUsers: readGaMetric(row, 4),
          engagementMinutes: secondsToMinutes(readGaMetric(row, 5)),
        })),
        trafficLandingDetailsMeta: {
          rowCount: trafficLandingDetails.rowCount,
          truncated: trafficLandingDetails.truncated,
        },
      });
    }

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
        dateRanges: [selectedDateRange],
        metrics: MONTHLY_METRICS,
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
        dateRanges: [selectedDateRange],
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
        dateRanges: [selectedDateRange],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 8,
      }),
      analyticsData.runReport({
        property,
        dateRanges: [selectedDateRange],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 8,
      }),
      analyticsData.runReport({
        property,
        dateRanges: [selectedDateRange],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      }),
      analyticsData.runRealtimeReport({
        property,
        metrics: [{ name: 'activeUsers' }],
      }),
    ]);

    const audienceDetails = await getAudienceDetails(
      analyticsData,
      property,
      selectedDateRange
    );
    const audienceLastActivity = await getAudienceLastActivity(
      analyticsData,
      property,
      selectedDateRange,
      new Set(audienceDetails.rows.map((row) => audienceTechnologyKey(row)))
    );
    let audienceLandingPages = new Map<
      string,
      {
        path: string;
        sessions: number;
        activeUsers: number;
        pageViews: number;
      }[]
    >();

    try {
      audienceLandingPages = await getAudienceLandingPages(
        analyticsData,
        property,
        selectedDateRange,
        new Set(audienceDetails.rows.map((row) => audienceTechnologyKey(row)))
      );
    } catch (landingPagesError) {
      console.warn('[admin analytics] Unable to load GA4 audience landing pages', landingPagesError);
    }

    const [trafficLandingDetails, pageEventDetails, trafficQuality, realtimeActivityRows] = await Promise.all([
      getTrafficLandingDetails(analyticsData, property, selectedDateRange),
      getPageEventDetails(analyticsData, property, selectedDateRange),
      getTrafficQuality(analyticsData, property, selectedDateRange),
      getRealtimeActivity(analyticsData, property).catch((realtimeActivityError) => {
        console.warn(
          '[admin analytics] Unable to load detailed GA4 realtime activity',
          realtimeActivityError
        );

        return [];
      }),
    ]);

    const monthlyRow = monthly.rows?.[0];
    const realtimeRow = realtime.rows?.[0];
    const activeUsersNow = realtimeRow ? readGaMetric(realtimeRow, 0) : 0;
    const realtimeActivity = realtimeActivityWithFallback(
      realtimeActivityRows,
      activeUsersNow
    );
    const generatedAt = new Date().toISOString();
    const storedRealtime = await saveAndListRealtimeSnapshots({
      propertyId,
      capturedAt: generatedAt,
      activeUsers: activeUsersNow,
      activity: realtimeActivity,
    });
    const hourlyRows = last24Hours.rows || [];

    return json(request, {
      propertyId,
      generatedAt,
      dateRange: selectedDateRange,
      monthly: monthlyMetrics(monthlyRow),
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
        activeUsers: activeUsersNow,
        activity: realtimeActivity,
      },
      storedRealtime,
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
      audienceDetails: audienceDetails.rows.map((row) => ({
        country: readGaDimension(row, 0) || '(not set)',
        city: readGaDimension(row, 1) || '(not set)',
        device: readGaDimension(row, 2) || '(not set)',
        operatingSystem: readGaDimension(row, 3) || '(not set)',
        browser: readGaDimension(row, 4) || '(not set)',
        browserVersion: readGaDimension(row, 5) || '(not set)',
        screenResolution: readGaDimension(row, 6) || '(not set)',
        language: readGaDimension(row, 7) || '(not set)',
        deviceModel: readGaDimension(row, 8) || '(not set)',
        activeUsers: readGaMetric(row, 0),
        pageViews: readGaMetric(row, 1),
        engagementMinutes: secondsToMinutes(readGaMetric(row, 2)),
        lastActivityAt: audienceLastActivity.get(audienceTechnologyKey(row)) || null,
        landingPages: audienceLandingPages.get(audienceTechnologyKey(row)) || [],
      })),
      audienceDetailsMeta: {
        rowCount: audienceDetails.rowCount,
        truncated: audienceDetails.truncated,
      },
      trafficLandingDetails: trafficLandingDetails.rows.map((row) => ({
        channel: readGaDimension(row, 0) || '(not set)',
        sourceMedium: readGaDimension(row, 1) || '(not set)',
        landingPage: readGaDimension(row, 2) || '(not set)',
        sessions: readGaMetric(row, 0),
        engagedSessions: readGaMetric(row, 1),
        engagementRate: readGaMetric(row, 2),
        pageViews: readGaMetric(row, 3),
        activeUsers: readGaMetric(row, 4),
        engagementMinutes: secondsToMinutes(readGaMetric(row, 5)),
      })),
      trafficLandingDetailsMeta: {
        rowCount: trafficLandingDetails.rowCount,
        truncated: trafficLandingDetails.truncated,
      },
      trafficQuality: trafficQuality.rows.map((row) => ({
        channel: readGaDimension(row, 0) || '(not set)',
        sourceMedium: readGaDimension(row, 1) || '(not set)',
        sessions: readGaMetric(row, 0),
        engagedSessions: readGaMetric(row, 1),
        engagementRate: readGaMetric(row, 2),
        averageSessionSeconds: readGaMetric(row, 3),
        pageViews: readGaMetric(row, 4),
        activeUsers: readGaMetric(row, 5),
      })),
      trafficQualityMeta: {
        rowCount: trafficQuality.rowCount,
        truncated: trafficQuality.truncated,
      },
      pageEventDetails: pageEventDetails.rows.map((row) => ({
        pagePath: readGaDimension(row, 0) || '(not set)',
        pageTitle: readGaDimension(row, 1) || readGaDimension(row, 0) || '(not set)',
        eventName: readGaDimension(row, 2) || '(not set)',
        eventCount: readGaMetric(row, 0),
        activeUsers: readGaMetric(row, 1),
        pageViews: readGaMetric(row, 2),
        engagementMinutes: secondsToMinutes(readGaMetric(row, 3)),
      })),
      pageEventDetailsMeta: {
        rowCount: pageEventDetails.rowCount,
        truncated: pageEventDetails.truncated,
      },
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
