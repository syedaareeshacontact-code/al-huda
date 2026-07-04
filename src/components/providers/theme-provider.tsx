'use client';

import type { PropsWithChildren } from 'react';

export function ThemeProvider({ children }: PropsWithChildren<Record<string, unknown>>) {
  return <>{children}</>;
}
