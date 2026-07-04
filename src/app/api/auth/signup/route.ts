import { NextResponse } from 'next/server';

import { signUpSchema } from '@/lib/auth/schemas';
import { hashPassword } from '@/lib/auth/password';
import { attachSessionCookie } from '@/lib/auth/session';
import { createUser } from '@/lib/auth/users-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: parsed.error.issues[0]?.message ?? 'Invalid signup payload.',
        },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const digest = await hashPassword(parsed.data.password);

    const user = await createUser({
      name: parsed.data.name,
      email,
      passwordHash: digest.hash,
      passwordSalt: digest.salt,
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          imageUrl: user.imageUrl,
        },
      },
      { status: 201 }
    );

    attachSessionCookie(response, {
      id: user.id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
    });

    return response;
  } catch (error) {
    const errorObject = error as { message?: string };

    if (errorObject.message === 'EMAIL_ALREADY_EXISTS') {
      return NextResponse.json(
        { message: 'This email is already registered.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: 'Unable to complete signup right now.' },
      { status: 500 }
    );
  }
}
