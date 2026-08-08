import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/current-user';
import { recordSiteDeviceVisit } from '@/lib/engagement/site-device-store';
import { recordGuestPushSiteVisit } from '@/lib/push/guest-push-store';

export const dynamic = 'force-dynamic';

const visitSchema = z.object({
  deviceId: z.string().uuid(),
  timeZone: z.string().trim().min(1).max(80).optional(),
  contentPreference: z.enum(['hadith', 'quran', 'balanced']).optional(),
});

function isSameOriginMutation(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || request.headers.get('sec-fetch-site') === 'same-origin') {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const requestOrigin = new URL(request.url).origin;
    const requestHosts = [
      request.headers.get('host'),
      request.headers.get('x-forwarded-host'),
    ].filter(Boolean);

    return originUrl.origin === requestOrigin || requestHosts.includes(originUrl.host);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ message: 'Origin is not allowed.' }, { status: 403 });
  }

  const parsed = visitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid visit payload.' }, { status: 400 });
  }

  const user = await getCurrentUser();
  const visitedAt = new Date().toISOString();
  const result = await recordSiteDeviceVisit({
    deviceId: parsed.data.deviceId,
    userId: user?.id ?? null,
    userAgent: request.headers.get('user-agent'),
    timeZone: parsed.data.timeZone,
    contentPreference: parsed.data.contentPreference,
    visitedAt,
  });

  if (!user) {
    await recordGuestPushSiteVisit({
      deviceId: parsed.data.deviceId,
      userAgent: request.headers.get('user-agent'),
      timeZone: parsed.data.timeZone,
      contentPreference: parsed.data.contentPreference,
      visitedAt,
      canonicalTotalVisitCount: result.totalVisitCount,
    });
  }

  return NextResponse.json(
    { ok: true, ...result },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
