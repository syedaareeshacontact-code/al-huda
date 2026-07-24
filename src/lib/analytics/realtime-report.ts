import {
  getAnalyticsDataClient,
  readGaDimension,
  readGaMetric,
} from '@/lib/analytics/ga4';

export type RealtimeActivityRow = {
  minutesAgo: number;
  device: string;
  country: string;
  city: string;
  pageTitle: string;
  eventName: string;
  activeUsers: number;
  eventCount: number;
  pageViews: number;
  isAggregateFallback?: boolean;
};

export async function getRealtimeActivity(
  analyticsData: ReturnType<typeof getAnalyticsDataClient>,
  property: string
) {
  const activityQueries = [
    {
      dimensions: [
        'minutesAgo',
        'unifiedScreenName',
        'eventName',
        'deviceCategory',
        'country',
        'city',
      ],
      metrics: ['activeUsers', 'eventCount'],
    },
    {
      dimensions: ['minutesAgo', 'eventName', 'deviceCategory', 'country', 'city'],
      metrics: ['activeUsers', 'eventCount'],
    },
    {
      dimensions: ['minutesAgo', 'deviceCategory', 'country', 'city'],
      metrics: ['activeUsers', 'eventCount'],
    },
    {
      dimensions: ['minutesAgo'],
      metrics: ['activeUsers', 'eventCount'],
    },
  ];

  for (const activityQuery of activityQueries) {
    try {
      const rows = await runRealtimeActivityQuery(
        analyticsData,
        property,
        activityQuery.dimensions,
        activityQuery.metrics
      );

      if (rows.length > 0) {
        return rows;
      }
    } catch (realtimeActivityError) {
      console.warn(
        '[analytics realtime] GA4 realtime activity query failed',
        activityQuery.dimensions.join(','),
        realtimeActivityError
      );
    }
  }

  return [];
}

async function runRealtimeActivityQuery(
  analyticsData: ReturnType<typeof getAnalyticsDataClient>,
  property: string,
  dimensionNames: string[],
  metricNames: string[]
) {
  const [response] = await analyticsData.runRealtimeReport({
    property,
    dimensions: dimensionNames.map((name) => ({ name })),
    metrics: metricNames.map((name) => ({ name })),
    orderBys: [
      { dimension: { dimensionName: 'minutesAgo' }, desc: false },
      { metric: { metricName: 'activeUsers' }, desc: true },
    ],
    limit: 100,
  });

  return (response.rows || []).map((row) =>
    mapRealtimeActivityRow(row, dimensionNames, metricNames)
  );
}

function mapRealtimeActivityRow(
  row: unknown,
  dimensionNames: string[],
  metricNames: string[]
): RealtimeActivityRow {
  const dimensionValue = (dimensionName: string) => {
    const index = dimensionNames.indexOf(dimensionName);

    if (index < 0) {
      return '(not set)';
    }

    return readGaDimension(row, index) || '(not set)';
  };
  const metricValue = (metricName: string) => {
    const index = metricNames.indexOf(metricName);

    if (index < 0) {
      return 0;
    }

    return readGaMetric(row, index);
  };
  const eventName = dimensionValue('eventName');
  const eventCount = metricValue('eventCount');

  return {
    minutesAgo: Number(dimensionValue('minutesAgo') || 0),
    device: dimensionValue('deviceCategory'),
    country: dimensionValue('country'),
    city: dimensionValue('city'),
    pageTitle: dimensionValue('unifiedScreenName'),
    eventName,
    activeUsers: metricValue('activeUsers'),
    eventCount,
    pageViews:
      metricNames.includes('screenPageViews') || eventName !== 'page_view'
        ? metricValue('screenPageViews')
        : eventCount,
  };
}

export function realtimeActivityWithFallback(
  rows: RealtimeActivityRow[],
  activeUsers: number
) {
  if (rows.length > 0 || activeUsers <= 0) {
    return rows;
  }

  return [
    {
      minutesAgo: 0,
      device: '(not set)',
      country: '(not set)',
      city: '(not set)',
      pageTitle: 'Realtime details pending',
      eventName: 'Active users',
      activeUsers,
      eventCount: 0,
      pageViews: 0,
      isAggregateFallback: true,
    },
  ];
}
