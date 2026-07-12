'use client';

import AppErrorRecovery from '@/components/errors/app-error-recovery';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <AppErrorRecovery error={error} reset={reset} />
      </body>
    </html>
  );
}
