import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/current-user';
import { replaceUserSettings } from '@/lib/auth/users-store';

const settingsSchema = z.object({
  readingMode: z.enum(['ayah', 'continuous']),
  arabicFont: z.enum(['amiriQuran', 'notoNaskh', 'scheherazade']),
  arabicFontScale: z.number().min(0.9).max(1.9),
  audioPreference: z.enum(['ar', 'tr']),
  autoPlayAudio: z.boolean(),
  themeMode: z.enum(['light', 'dark', 'system']),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ settings: user.settings });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid payload.' }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid settings.' },
      { status: 400 }
    );
  }

  const updated = await replaceUserSettings(user.id, parsed.data);
  if (!updated) {
    return NextResponse.json({ message: 'User not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, settings: updated.settings });
}
