'use client';

import { useEffect, useState } from 'react';

import { getClientSession } from '@/lib/client-session';

const ACTIVITY_TRACK_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVITY_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_MIN_REPORT_SECONDS = 60;
const ACTIVITY_MAX_REPORT_SECONDS = 5 * 60;
const ACTIVITY_TRACKER_TAB_KEY = 'alhuda:activity-tracker-tab';
const ACTIVITY_TRACKER_TAB_TTL_MS = ACTIVITY_TRACK_INTERVAL_MS + 30_000;

interface SessionResponse {
  user: {
    id: string;
  } | null;
}

function sendTrackPayload(
  payload: { sessionSeconds?: number; audioSeconds?: number },
  beacon = false
) {
  if (beacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon('/api/auth/track', blob);
    return;
  }

  void fetch('/api/auth/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    keepalive: beacon,
  });
}

function createTabId() {
  return Math.random().toString(36).slice(2);
}

function isPrimaryTrackingTab(tabId: string) {
  try {
    const now = Date.now();
    const raw = window.localStorage.getItem(ACTIVITY_TRACKER_TAB_KEY);
    const current = raw ? (JSON.parse(raw) as { id?: string; expiresAt?: number }) : null;

    if (current?.id && current.id !== tabId && Number(current.expiresAt) > now) {
      return false;
    }

    window.localStorage.setItem(
      ACTIVITY_TRACKER_TAB_KEY,
      JSON.stringify({
        id: tabId,
        expiresAt: now + ACTIVITY_TRACKER_TAB_TTL_MS,
      })
    );

    return true;
  } catch {
    return true;
  }
}

export default function ActivityTrackerProvider() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let ignore = false;

    const loadSession = async () => {
      try {
        const payload = (await getClientSession()) as SessionResponse;
        if (!ignore) {
          setIsAuthenticated(Boolean(payload.user?.id));
        }
      } catch {
        if (!ignore) {
          setIsAuthenticated(false);
        }
      }
    };

    void loadSession();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const tabId = createTabId();
    let lastTrackAt = Date.now();
    let lastInteractionAt = Date.now();

    const markInteraction = () => {
      lastInteractionAt = Date.now();
    };

    const flushActivity = (beacon = false) => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastTrackAt) / 1000);
      lastTrackAt = now;

      if (
        (document.hidden && !beacon) ||
        elapsed < ACTIVITY_MIN_REPORT_SECONDS ||
        now - lastInteractionAt > ACTIVITY_IDLE_TIMEOUT_MS ||
        !isPrimaryTrackingTab(tabId)
      ) {
        return;
      }

      sendTrackPayload(
        {
          sessionSeconds: Math.min(elapsed, ACTIVITY_MAX_REPORT_SECONDS),
        },
        beacon
      );
    };

    const interval = window.setInterval(() => {
      flushActivity();
    }, ACTIVITY_TRACK_INTERVAL_MS);

    const onBeforeUnload = () => {
      flushActivity(true);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        flushActivity(true);
      } else {
        lastTrackAt = Date.now();
        lastInteractionAt = lastTrackAt;
        isPrimaryTrackingTab(tabId);
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('focus', markInteraction);
    window.addEventListener('pointerdown', markInteraction, { passive: true });
    window.addEventListener('keydown', markInteraction);
    document.addEventListener('visibilitychange', onVisibilityChange);
    isPrimaryTrackingTab(tabId);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('focus', markInteraction);
      window.removeEventListener('pointerdown', markInteraction);
      window.removeEventListener('keydown', markInteraction);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isAuthenticated]);

  return null;
}
