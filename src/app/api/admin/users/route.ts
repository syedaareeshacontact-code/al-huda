import { NextResponse } from 'next/server';

import { getCurrentAdminUser } from '@/lib/auth/current-user';
import { listUsersForAdmin } from '@/lib/auth/users-store';
import { listFeedbackForAdmin } from '@/lib/feedback-store';

export async function GET() {
  try {
    const adminUser = await getCurrentAdminUser();
    if (!adminUser) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const [users, feedback] = await Promise.all([
      listUsersForAdmin(),
      listFeedbackForAdmin(),
    ]);
    const summary = users.reduce(
      (acc, user) => {
        acc.totalUsers += 1;
        acc.totalSessionSeconds += user.totalSessionSeconds;
        acc.totalAudioSeconds += user.totalAudioSeconds;
        return acc;
      },
      {
        totalUsers: 0,
        totalSessionSeconds: 0,
        totalAudioSeconds: 0,
      }
    );

    return NextResponse.json({ users, feedback, summary });
  } catch {
    return NextResponse.json(
      { message: 'Unable to load users right now.' },
      { status: 500 }
    );
  }
}
