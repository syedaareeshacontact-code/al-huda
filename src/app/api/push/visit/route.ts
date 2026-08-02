import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/current-user';
import { recordUserPushSiteVisit } from '@/lib/auth/users-store';
import { recordGuestPushSiteVisit } from '@/lib/push/guest-push-store';

export const dynamic = 'force-dynamic';

const visitSchema = z
  .object({
    deviceId: z.string().uuid().optional(),
    endpoint: z.string().url().max(2048).optional(),
    timeZone: z.string().trim().min(1).max(80).optional(),
    contentPreference: z.enum(['hadith', 'quran']).optional(),
  })
  .refine((value) => Boolean(value.deviceId || value.endpoint), {
    message: 'A device id or subscription endpoint is required.',
  });

function forbiddenResponse() {
  return NextResponse.json({ message: 'Origin is not allowed.' }, { status: 403 });
}

function isSameOriginMutation(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) {
    return true;
  }

  if (request.headers.get('sec-fetch-site') === 'same-origin') {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const requestOrigin = new URL(request.url).origin;
    const requestHosts = [
      request.headers.get('host'),
      request.headers.get('x-forwarded-host'),
    ].filter(Boolean);

    return (
      originUrl.origin === requestOrigin ||
      requestHosts.includes(originUrl.host)
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return forbiddenResponse();
  }

  const parsed = visitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid visit payload.' }, { status: 400 });
  }

  const visitedAt = new Date().toISOString();
  const user = await getCurrentUser();
  const commonInput = {
    endpoint: parsed.data.endpoint,
    userAgent: request.headers.get('user-agent'),
    timeZone: parsed.data.timeZone,
    contentPreference: parsed.data.contentPreference,
    visitedAt,
  };
  const recorded =
    user && parsed.data.endpoint
      ? await recordUserPushSiteVisit({
          userId: user.id,
          ...commonInput,
        })
      : await recordGuestPushSiteVisit({
          deviceId: parsed.data.deviceId,
          ...commonInput,
        });

  return NextResponse.json(
    {
      ok: true,
      owner: user && parsed.data.endpoint ? 'user' : 'guest',
      recorded,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
