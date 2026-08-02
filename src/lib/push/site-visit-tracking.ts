export const SITE_VISIT_THROTTLE_MS = 30 * 60 * 1000;

export function shouldCountSiteVisit(
  lastSiteVisitAt: string | null | undefined,
  visitedAt: string
) {
  const lastVisitTime = Date.parse(String(lastSiteVisitAt ?? ''));
  const visitedTime = Date.parse(visitedAt);

  if (!Number.isFinite(visitedTime)) {
    return false;
  }

  if (!Number.isFinite(lastVisitTime)) {
    return true;
  }

  return visitedTime - lastVisitTime >= SITE_VISIT_THROTTLE_MS;
}

export function getSiteVisitCutoffIso(visitedAt: string) {
  const visitedTime = Date.parse(visitedAt);
  const baseTime = Number.isFinite(visitedTime) ? visitedTime : Date.now();
  return new Date(baseTime - SITE_VISIT_THROTTLE_MS).toISOString();
}
