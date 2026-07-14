import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';
import { incrementUserUsageCounters } from '@/lib/auth/users-store';

const MIN_SESSION_SECONDS_TO_PERSIST = 60;
const MIN_AUDIO_SECONDS_TO_PERSIST = 30;

const trackSchema = z.object({
  sessionSeconds: z.number().int().min(0).max(600).optional(),
  audioSeconds: z.number().int().min(0).max(600).optional(),
});

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const session = verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid payload.' }, { status: 400 });
  }

  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid payload.' },
      { status: 400 }
    );
  }

  const sessionSeconds = parsed.data.sessionSeconds ?? 0;
  const audioSeconds = parsed.data.audioSeconds ?? 0;
  const persistSessionSeconds =
    sessionSeconds >= MIN_SESSION_SECONDS_TO_PERSIST ? sessionSeconds : 0;
  const persistAudioSeconds =
    audioSeconds >= MIN_AUDIO_SECONDS_TO_PERSIST ? audioSeconds : 0;

  if (persistSessionSeconds === 0 && persistAudioSeconds === 0) {
    return NextResponse.json({ ok: true, tracked: false });
  }

  const updated = await incrementUserUsageCounters(session.id, {
    sessionSeconds: persistSessionSeconds,
    audioSeconds: persistAudioSeconds,
  });

  if (!updated) {
    return NextResponse.json({ message: 'User not found.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    tracked: true,
  });
}
