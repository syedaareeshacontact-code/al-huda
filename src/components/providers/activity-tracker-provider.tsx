'use client';

import { useEffect, useState } from 'react';

import { getClientSession } from '@/lib/client-session';

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

    let lastTickAt = Date.now();

    const interval = window.setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastTickAt) / 1000);
      lastTickAt = now;

      if (document.hidden || elapsed <= 0) {
        return;
      }

      sendTrackPayload({
        sessionSeconds: Math.min(elapsed, 120),
      });
    }, 60000);

    const onBeforeUnload = () => {
      if (document.hidden) {
        return;
      }

      const now = Date.now();
      const elapsed = Math.floor((now - lastTickAt) / 1000);
      if (elapsed > 0) {
        sendTrackPayload(
          {
            sessionSeconds: Math.min(elapsed, 120),
          },
          true
        );
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isAuthenticated]);

  return null;
}
