'use client';

import type { UserSettings } from '@/types/settings';

export interface ClientSessionUser {
  id: string;
  name: string;
  email: string;
  imageUrl?: string | null;
  isAdmin?: boolean;
}

export interface ClientSessionPayload {
  user: ClientSessionUser | null;
  settings?: Partial<UserSettings>;
}

const SESSION_CACHE_MS = 30_000;

let cachedPayload: ClientSessionPayload | null = null;
let cachedAt = 0;
let inFlight: Promise<ClientSessionPayload> | null = null;

export function invalidateClientSession() {
  cachedPayload = null;
  cachedAt = 0;
}

export function updateCachedSessionSettings(settings: Partial<UserSettings>) {
  if (!cachedPayload?.user) return;
  cachedPayload = { ...cachedPayload, settings };
  cachedAt = Date.now();
}

export async function getClientSession(options?: {
  force?: boolean;
}): Promise<ClientSessionPayload> {
  if (options?.force) invalidateClientSession();

  if (cachedPayload && Date.now() - cachedAt < SESSION_CACHE_MS) {
    return cachedPayload;
  }

  if (inFlight) return inFlight;

  inFlight = fetch('/api/auth/session', { cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Session request failed (${response.status})`);
      }

      const payload = (await response.json()) as ClientSessionPayload;
      const normalized: ClientSessionPayload = {
        user: payload.user ?? null,
        settings: payload.settings,
      };
      cachedPayload = normalized;
      cachedAt = Date.now();
      return normalized;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
