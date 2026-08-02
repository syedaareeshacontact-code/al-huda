'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { getSiteDeviceId } from '@/lib/engagement/client-device-id';
import { getPushContentPreferenceFromPath } from '@/lib/push/engagement-types';
import { SITE_VISIT_THROTTLE_MS } from '@/lib/push/site-visit-tracking';

const SITE_VISIT_RECORDED_AT_KEY = 'alhuda:site-visit-recorded-at';

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

function shouldRecordSiteVisit() {
  const lastRecordedAt = Number(
    window.localStorage.getItem(SITE_VISIT_RECORDED_AT_KEY) || 0
  );
  return (
    !Number.isFinite(lastRecordedAt) ||
    Date.now() - lastRecordedAt >= SITE_VISIT_THROTTLE_MS
  );
}

interface SiteDeviceVisitTrackerProps {
  sessionReady: boolean;
}

export default function SiteDeviceVisitTracker({
  sessionReady,
}: SiteDeviceVisitTrackerProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (
      !sessionReady ||
      process.env.NODE_ENV !== 'production' ||
      typeof window === 'undefined'
    ) {
      return;
    }

    let cancelled = false;
    let trackTimer: number | null = null;
    const deviceId = getSiteDeviceId();

    const recordSiteVisit = async () => {
      if (cancelled || !shouldRecordSiteVisit()) {
        return;
      }

      try {
        const response = await fetch('/api/engagement/visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            deviceId,
            timeZone: getBrowserTimeZone(),
            contentPreference: getPushContentPreferenceFromPath(pathname),
          }),
        });

        if (response.ok) {
          window.localStorage.setItem(SITE_VISIT_RECORDED_AT_KEY, String(Date.now()));
        }
      } catch {
        // Visitor tracking must never interrupt reading.
      }
    };

    trackTimer = window.setTimeout(() => {
      void recordSiteVisit();
    }, 1500);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void recordSiteVisit();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      if (trackTimer !== null) {
        window.clearTimeout(trackTimer);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [pathname, sessionReady]);

  return null;
}
