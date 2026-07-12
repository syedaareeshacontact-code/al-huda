'use client';

import AppErrorRecovery from '@/components/errors/app-error-recovery';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AppErrorRecovery error={error} reset={reset} />;
}
