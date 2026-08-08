import { GoogleAuth, type AuthClient } from 'google-auth-library';

import { getGoogleServiceAccountCredentials } from '@/lib/analytics/ga4';

const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const SEARCH_ANALYTICS_ENDPOINT = 'https://www.googleapis.com/webmasters/v3/sites';
const DEFAULT_SITE_URL = 'http://readalquran.online/';
const DEFAULT_ROW_LIMIT = 1_000;

export const SEARCH_CONSOLE_REPORTS = [
  { name: 'overview', dimensions: [] },
  { name: 'daily', dimensions: ['date'] },
  { name: 'queries', dimensions: ['query'] },
  { name: 'pages', dimensions: ['page'] },
  { name: 'countries', dimensions: ['country'] },
  { name: 'devices', dimensions: ['device'] },
] as const;

export type SearchConsoleDimension =
  (typeof SEARCH_CONSOLE_REPORTS)[number]['dimensions'][number];
export type SearchConsoleReportName = (typeof SEARCH_CONSOLE_REPORTS)[number]['name'];

export interface SearchConsoleRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleReport {
  name: SearchConsoleReportName;
  dimensions: SearchConsoleDimension[];
  rows: SearchConsoleRow[];
}

interface SearchAnalyticsResponse {
  rows?: Array<{
    keys?: string[];
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
  }>;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getSearchConsoleSiteUrl() {
  return (
    process.env.SEARCH_CONSOLE_SITE_URL ||
    process.env.GSC_SITE_URL ||
    DEFAULT_SITE_URL
  ).trim();
}

export function mapSearchConsoleRow(row: NonNullable<SearchAnalyticsResponse['rows']>[number]) {
  return {
    keys: Array.isArray(row.keys) ? row.keys.map(String) : [],
    clicks: numberValue(row.clicks),
    impressions: numberValue(row.impressions),
    ctr: numberValue(row.ctr),
    position: numberValue(row.position),
  } satisfies SearchConsoleRow;
}

async function getAuthorizedClient() {
  const credentials = getGoogleServiceAccountCredentials();
  const auth = credentials
    ? new GoogleAuth({ credentials, scopes: [SEARCH_CONSOLE_SCOPE] })
    : new GoogleAuth({ scopes: [SEARCH_CONSOLE_SCOPE] });

  return auth.getClient();
}

async function requestSearchConsoleReport(
  client: AuthClient,
  input: {
  siteUrl: string;
  startDate: string;
  endDate: string;
  name: SearchConsoleReportName;
  dimensions: readonly SearchConsoleDimension[];
  rowLimit?: number;
  }
): Promise<SearchConsoleReport> {
  const response = await client.request<SearchAnalyticsResponse>({
    url: `${SEARCH_ANALYTICS_ENDPOINT}/${encodeURIComponent(input.siteUrl)}/searchAnalytics/query`,
    method: 'POST',
    data: {
      startDate: input.startDate,
      endDate: input.endDate,
      dimensions: input.dimensions,
      rowLimit: input.rowLimit || DEFAULT_ROW_LIMIT,
    },
  });

  return {
    name: input.name,
    dimensions: [...input.dimensions],
    rows: (response.data.rows || []).map(mapSearchConsoleRow),
  };
}

export async function loadSearchConsoleReport(input: {
  siteUrl: string;
  startDate: string;
  endDate: string;
  name: SearchConsoleReportName;
  dimensions: readonly SearchConsoleDimension[];
  rowLimit?: number;
}) {
  return requestSearchConsoleReport(await getAuthorizedClient(), input);
}

export async function loadSearchConsoleReports(input: {
  siteUrl: string;
  startDate: string;
  endDate: string;
  rowLimit?: number;
}) {
  const client = await getAuthorizedClient();

  const reports = await Promise.all(
    SEARCH_CONSOLE_REPORTS.map((report) =>
      requestSearchConsoleReport(client, {
        ...input,
        ...report,
      })
    )
  );

  return reports;
}
