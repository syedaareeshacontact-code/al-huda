'use client';

import { Moon, Sun } from 'lucide-react';

import { useAppSettings } from '@/components/providers/app-settings-provider';

export default function InstagramThemeToggle() {
  const { themeMode, setThemeMode, isLoaded } = useAppSettings();
  const isDark = themeMode === 'dark';

  return (
    <button
      type="button"
      onClick={() => isLoaded && setThemeMode(isDark ? 'light' : 'dark')}
      disabled={!isLoaded}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--ig-border)] bg-[var(--ig-surface)] text-[var(--ig-muted)] shadow-sm outline-none hover:border-[var(--ig-border-strong)] hover:text-[var(--ig-heading)] focus-visible:ring-2 focus-visible:ring-[var(--ig-ring)] disabled:cursor-wait disabled:opacity-60"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
