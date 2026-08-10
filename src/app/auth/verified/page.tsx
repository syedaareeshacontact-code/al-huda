import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Email Verification',
  description: 'Read al Quran account email verification status.',
  robots: { index: false, follow: false },
};

interface VerifiedPageProps {
  searchParams: Promise<{ status?: string | string[] }>;
}

export default async function VerifiedPage({ searchParams }: VerifiedPageProps) {
  const { status: statusParam } = await searchParams;
  const status = Array.isArray(statusParam) ? statusParam[0] : statusParam;
  const success = status === 'success';

  return (
    <div
      className="min-h-[70vh] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--color-accent),transparent_88%),transparent_38%)] px-4 py-14 sm:py-20"
    >
      <section className="mx-auto w-full max-w-lg rounded-3xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_55%)] bg-[var(--color-surface)] p-7 text-center shadow-[var(--shadow-card)] sm:p-10">
        <span
          className={
            success
              ? 'mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--color-success),var(--color-border)_55%)] bg-[color-mix(in_oklab,var(--color-success),transparent_88%)] text-[var(--color-success)]'
              : 'mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_55%)] bg-[color-mix(in_oklab,var(--color-accent),transparent_88%)] text-[var(--color-accent-soft)]'
          }
        >
          {success ? (
            <CheckCircle2 className="h-8 w-8" />
          ) : (
            <AlertTriangle className="h-8 w-8" />
          )}
        </span>

        <p className="mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Account verification
        </p>
        <h1 className="mt-2 font-display text-4xl text-[var(--color-heading)]">
          {success ? 'Email verified' : 'Link unavailable'}
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[var(--color-muted-text)]">
          {success
            ? 'Your account is active and you are signed in. Your Quran progress can now stay securely connected to you.'
            : 'This verification link is invalid, expired, or has already been used. Return to Sign In to request a fresh link.'}
        </p>

        <Link
          href="/"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] px-6 py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)]"
        >
          {success ? 'Start reading' : 'Return to Read al Quran'}
        </Link>
      </section>
    </div>
  );
}
