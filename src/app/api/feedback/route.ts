import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/current-user';
import { createFeedback } from '@/lib/feedback-store';

const feedbackSchema = z.object({
  category: z.enum(['bug', 'feature', 'content', 'design', 'general']),
  rating: z.number().int().min(1).max(5),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(1200),
  pageUrl: z
    .string()
    .trim()
    .max(240)
    .optional()
    .transform((value) => value || null),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Please sign in to send feedback.' }, { status: 401 });
  }

  const parsed = feedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid feedback payload.' },
      { status: 400 }
    );
  }

  const feedback = await createFeedback({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    ...parsed.data,
  });

  return NextResponse.json(
    {
      ok: true,
      feedback: {
        id: feedback.id,
        createdAt: feedback.createdAt,
      },
    },
    { status: 201 }
  );
}

