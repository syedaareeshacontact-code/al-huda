import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/current-user';
import {
  findUserById,
  replaceUserPrayerReminderSettings,
} from '@/lib/auth/users-store';

const prayerReminderSchema = z.object({
  enabled: z.boolean(),
  city: z.string().trim().min(1).max(80),
  country: z.string().trim().min(1).max(80),
  reminderMinutes: z.number().int().min(0).max(60),
});

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = await findUserById(currentUser.id);
  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ settings: user.prayerReminderSettings });
}

export async function PUT(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const parsed = prayerReminderSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid prayer reminder settings.' },
      { status: 400 }
    );
  }

  const settings = await replaceUserPrayerReminderSettings(
    currentUser.id,
    parsed.data
  );
  if (!settings) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ settings });
}
