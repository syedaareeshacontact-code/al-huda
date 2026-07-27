import type { NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

const DEFAULT_DASHBOARD_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
];

export const DASHBOARD_API_TOKEN_HEADER = 'x-readalquran-dashboard-token';

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function configuredOrigins(name: string) {
  return (process.env[name] || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}

export function getAllowedDashboardOrigins() {
  return Array.from(
    new Set([...DEFAULT_DASHBOARD_ORIGINS, ...configuredOrigins('ANALYTICS_DASHBOARD_ORIGINS')])
  );
}

export function isAllowedDashboardOrigin(request: NextRequest | Request) {
  const origin = normalizeOrigin(request.headers.get('origin') || '');
  return Boolean(origin && getAllowedDashboardOrigins().includes(origin));
}

export function isTrustedDashboardMutation(request: NextRequest | Request) {
  if (hasDashboardApiAccess(request)) {
    return true;
  }

  const origin = normalizeOrigin(request.headers.get('origin') || '');
  if (!origin) {
    return true;
  }

  const siteOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL || '');
  return isAllowedDashboardOrigin(request) || Boolean(siteOrigin && origin === siteOrigin);
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function hasDashboardApiAccess(request: NextRequest | Request) {
  const configuredToken =
    process.env.ALHUDA_DASHBOARD_API_TOKEN || process.env.DASHBOARD_API_TOKEN || '';
  const requestToken = request.headers.get(DASHBOARD_API_TOKEN_HEADER) || '';

  return Boolean(configuredToken && requestToken && safeCompare(requestToken, configuredToken));
}

export function dashboardCorsHeaders(
  request: NextRequest | Request,
  methods = 'GET, OPTIONS'
) {
  if (!isAllowedDashboardOrigin(request)) {
    return { Vary: 'Origin' };
  }

  return {
    Vary: 'Origin',
    'Access-Control-Allow-Origin': request.headers.get('origin') || '',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': `Content-Type, ${DASHBOARD_API_TOKEN_HEADER}`,
  };
}
