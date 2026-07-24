import { BetaAnalyticsDataClient } from '@google-analytics/data';

type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
};

let analyticsDataClient: BetaAnalyticsDataClient | null = null;

function normalizePrivateKey(value: string) {
  return value.trim().replace(/^"([\s\S]*)"$/, '$1').replace(/\\n/g, '\n');
}

function parseServiceAccountJson(rawValue: string) {
  const raw = rawValue.trim();

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      client_email?: unknown;
      private_key?: unknown;
      clientEmail?: unknown;
      privateKey?: unknown;
    };
    const clientEmail = String(parsed.client_email || parsed.clientEmail || '').trim();
    const privateKey = normalizePrivateKey(
      String(parsed.private_key || parsed.privateKey || '')
    );

    if (!clientEmail || !privateKey) {
      console.error('[ga4] Service-account JSON is missing client_email or private_key.');
      return null;
    }

    return {
      client_email: clientEmail,
      private_key: privateKey,
    } satisfies ServiceAccountCredentials;
  } catch (error) {
    console.error('[ga4] Unable to parse service-account JSON.', error);
    return null;
  }
}

function getServiceAccountCredentials() {
  const jsonCredentials =
    process.env.GA4_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_CREDENTIALS_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    '';
  const parsedJsonCredentials = parseServiceAccountJson(jsonCredentials);

  if (parsedJsonCredentials) {
    return parsedJsonCredentials;
  }

  const base64Credentials = process.env.GA4_SERVICE_ACCOUNT_JSON_BASE64 || '';

  if (base64Credentials.trim()) {
    try {
      const parsedBase64Credentials = parseServiceAccountJson(
        Buffer.from(base64Credentials.trim(), 'base64').toString('utf8')
      );

      if (parsedBase64Credentials) {
        return parsedBase64Credentials;
      }
    } catch (error) {
      console.error('[ga4] Unable to decode base64 service-account JSON.', error);
    }
  }

  const clientEmail = (
    process.env.GA4_CLIENT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    ''
  ).trim();
  const privateKey = normalizePrivateKey(
    process.env.GA4_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || ''
  );

  if (!clientEmail || !privateKey) {
    return null;
  }

  return {
    client_email: clientEmail,
    private_key: privateKey,
  } satisfies ServiceAccountCredentials;
}

export function getGa4PropertyId() {
  const propertyId =
    process.env.GA4_PROPERTY_ID || process.env.GOOGLE_ANALYTICS_PROPERTY_ID || '';

  return propertyId.replace(/^properties\//, '').trim();
}

export function getAnalyticsDataClient() {
  if (!analyticsDataClient) {
    const credentials = getServiceAccountCredentials();

    analyticsDataClient = credentials
      ? new BetaAnalyticsDataClient({ credentials })
      : new BetaAnalyticsDataClient();
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
