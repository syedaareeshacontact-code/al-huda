import type { Metadata } from 'next';

import ResetPasswordForm from '@/components/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Securely reset your Read al Quran account password.',
  robots: { index: false, follow: false },
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string | string[] }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token: tokenParam } = await searchParams;
  const token = Array.isArray(tokenParam) ? tokenParam[0] ?? '' : tokenParam ?? '';

  return (
    <div
      className="min-h-[70vh] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--color-accent),transparent_88%),transparent_38%)] px-4 py-14 sm:py-20"
    >
      <section className="mx-auto w-full max-w-lg rounded-3xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_55%)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-9">
        <ResetPasswordForm token={token} />
      </section>
    </div>
  );
}
