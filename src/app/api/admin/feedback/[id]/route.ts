import { NextResponse } from 'next/server';

import { getCurrentAdminUser } from '@/lib/auth/current-user';
import { deleteFeedbackForAdmin } from '@/lib/feedback-store';

interface FeedbackRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(_request: Request, context: FeedbackRouteContext) {
  try {
    const adminUser = await getCurrentAdminUser();
    if (!adminUser) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const feedbackId = id.trim();
    if (!feedbackId) {
      return NextResponse.json({ message: 'Feedback id is required.' }, { status: 400 });
    }

    const deleted = await deleteFeedbackForAdmin(feedbackId);
    if (!deleted) {
      return NextResponse.json({ message: 'Feedback not found.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: 'Unable to delete feedback right now.' },
      { status: 500 }
    );
  }
}
