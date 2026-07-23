import { BetaAnalyticsDataClient } from '@google-analytics/data';

let analyticsDataClient: BetaAnalyticsDataClient | null = null;

export function getGa4PropertyId() {
  const propertyId =
    process.env.GA4_PROPERTY_ID || process.env.GOOGLE_ANALYTICS_PROPERTY_ID || '';

  return propertyId.replace(/^properties\//, '').trim();
}

export function getAnalyticsDataClient() {
  if (!analyticsDataClient) {
    analyticsDataClient = new BetaAnalyticsDataClient();
  }

  return analyticsDataClient;
}

export function readGaMetric(row: unknown, index: number) {
  const value = (row as { metricValues?: Array<{ value?: string | null }> }).metricValues?.[index]
    ?.value;

  return Number(value || 0);
}

export function readGaDimension(row: unknown, index: number) {
  return (
    (row as { dimensionValues?: Array<{ value?: string | null }> }).dimensionValues?.[index]
      ?.value || ''
  );
}

export function secondsToMinutes(seconds: number) {
  return Math.round((seconds / 60) * 10) / 10;
}
