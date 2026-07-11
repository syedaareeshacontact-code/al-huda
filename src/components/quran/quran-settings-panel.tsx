'use client';

import { useEffect, useState } from 'react';
import {
  ChevronUp,
  MapPin,
  Paintbrush,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';

import { useAppSettings } from '@/components/providers/app-settings-provider';
import { useSurahContext } from '@/hooks/useSurahContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface QuranSettingsPanelProps {
  variant?: 'inline' | 'floating';
}

export default function QuranSettingsPanel({ variant = 'inline' }: QuranSettingsPanelProps) {
  const { theme, setTheme } = useTheme();
  const {
    settings,
    setReadingMode,
    setArabicFontScale,
    setAudioPreference,
    setAutoPlayAudio,
    resetSettings,
  } = useAppSettings();

  const { bookmarks, favorites, removeBookmark } = useSurahContext();
  const [open, setOpen] = useState(false);
  const currentTheme = theme ?? 'system';
  const isFloating = variant === 'floating';

  useEffect(() => {
    if (window.location.hash === '#quran-settings') {
      setOpen(true);
    }
  }, []);

  const settingsContent = (
    <CardContent className="max-h-[min(70vh,32rem)] space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="bg-[linear-gradient(140deg,color-mix(in_oklab,var(--color-surface),white_16%),color-mix(in_oklab,var(--color-highlight),var(--color-surface)_95%))]">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <Paintbrush className="size-5 text-[var(--color-accent)]" />
              Appearance
            </CardTitle>
            <CardDescription>Theme and Arabic typography</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                Theme
              </p>
              <div className="flex flex-wrap gap-2">
                {(['light', 'dark', 'system'] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={currentTheme === mode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme(mode)}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                Arabic Script
              </p>
              <div className="flex h-10 items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3">
                <span className="text-sm font-medium text-[var(--color-heading)]">
                  Uthmani Hafs
                </span>
                <Badge variant="secondary" className="text-[0.6rem]">
                  Site-wide
                </Badge>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                <span>Arabic Font Size</span>
                <span>{Math.round(settings.arabicFontScale * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.9}
                max={1.9}
                step={0.05}
                value={settings.arabicFontScale}
                onChange={(event) => setArabicFontScale(Number(event.target.value))}
                className="app-range"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[linear-gradient(140deg,color-mix(in_oklab,var(--color-surface),white_14%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_95%))]">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <SlidersHorizontal className="size-5 text-[var(--color-accent)]" />
              Quran Reading
            </CardTitle>
            <CardDescription>Reading and audio defaults</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                Default Reading Mode
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={settings.readingMode === 'ayah' ? 'default' : 'outline'}
                  onClick={() => setReadingMode('ayah')}
                >
                  Ayah by Ayah
                </Button>
                <Button
                  size="sm"
                  variant={settings.readingMode === 'continuous' ? 'default' : 'outline'}
                  onClick={() => setReadingMode('continuous')}
                >
                  Continuous
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                Audio Default
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={settings.audioPreference === 'ar' ? 'default' : 'outline'}
                  onClick={() => setAudioPreference('ar')}
                >
                  Arabic Recitation
                </Button>
                <Button
                  size="sm"
                  variant={settings.audioPreference === 'tr' ? 'default' : 'outline'}
                  onClick={() => setAudioPreference('tr')}
                >
                  Urdu Translation
                </Button>
              </div>
            </div>

            <label className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <span className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]">
                <Volume2 className="size-4 text-[var(--color-info)]" />
                Autoplay when Surah changes
              </span>
              <input
                type="checkbox"
                checked={settings.autoPlayAudio}
                onChange={(event) => setAutoPlayAudio(event.target.checked)}
                className="size-4 accent-[var(--color-accent)]"
                aria-label="Toggle autoplay audio"
              />
            </label>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="bg-[linear-gradient(140deg,color-mix(in_oklab,var(--color-surface),white_16%),color-mix(in_oklab,var(--color-highlight),var(--color-surface)_95%))]">
          <CardHeader>
            <CardTitle className="text-base">Saved Data</CardTitle>
            <CardDescription>
              {bookmarks.length} bookmarks and {favorites.length} favorite surahs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {bookmarks.length > 0 ? (
              bookmarks.slice(0, 8).map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
                >
                  <span>
                    Surah {bookmark.surahId} • Ayah {bookmark.ayahNumber}
                  </span>
                  <button
                    onClick={() => removeBookmark(bookmark.id)}
                    className="text-[var(--color-muted-text)] hover:text-[var(--color-danger)]"
                    aria-label={`Remove bookmark ${bookmark.surahId}:${bookmark.ayahNumber}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted-text)]">No bookmarks saved yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[linear-gradient(140deg,color-mix(in_oklab,var(--color-surface),white_16%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_95%))]">
          <CardHeader>
            <CardTitle className="text-base">Reset</CardTitle>
            <CardDescription>Restore Quran preferences to default values.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="danger" onClick={resetSettings}>
              Reset Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </CardContent>
  );

  if (isFloating) {
    return (
      <>
        <div
          className={cn(
            'fixed right-3 z-[68] sm:right-4',
            'bottom-[calc(9.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-[8.5rem]'
          )}
          id="quran-settings-trigger"
        >
          <Button
            type="button"
            size="icon"
            variant={open ? 'default' : 'outline'}
            className="size-10 rounded-full bg-[color-mix(in_oklab,var(--color-surface-2),var(--color-accent)_8%)] shadow-lg"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-controls="quran-settings"
            aria-label={open ? 'Close Quran settings' : 'Open Quran settings'}
            title="Quran Settings"
          >
            <Settings2 className="size-5" />
          </Button>
        </div>

        {open ? (
          <div className="fixed inset-0 z-[75]">
            <button
              type="button"
              className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
              onClick={() => setOpen(false)}
              aria-label="Close Quran settings overlay"
            />
            <Card
              id="quran-settings"
              className="absolute bottom-[calc(10.5rem+env(safe-area-inset-bottom,0px))] left-1/2 w-[min(42rem,calc(100vw-1rem))] -translate-x-1/2 animate-fade-up border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_56%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-surface),white_14%),color-mix(in_oklab,var(--color-highlight),var(--color-surface)_95%))] shadow-2xl sm:bottom-[9.25rem]"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge className="mb-2">Quran</Badge>
                    <CardTitle>Quran Settings</CardTitle>
                    <CardDescription>
                      Font, theme, reading mode, audio, and saved bookmarks.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    aria-label="Close settings panel"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              {settingsContent}
            </Card>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="mt-4" id="quran-settings-trigger">
      <div className="flex justify-end">
        <Button
          type="button"
          size="icon"
          variant={open ? 'default' : 'outline'}
          className="animate-pulse-border"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls="quran-settings"
          aria-label={open ? 'Close Quran settings' : 'Open Quran settings'}
          title="Quran Settings"
        >
          <Settings2 className="size-4" />
        </Button>
      </div>

      {open ? (
        <Card
          id="quran-settings"
          className="mt-3 animate-fade-up border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_56%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-surface),white_14%),color-mix(in_oklab,var(--color-highlight),var(--color-surface)_95%))]"
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge className="mb-2">Quran</Badge>
                <CardTitle>Quran Settings</CardTitle>
                <CardDescription>
                  Theme, reading mode, typography, audio, and saved bookmarks.
                </CardDescription>
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setOpen(false)}
                aria-label="Close settings panel"
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          {settingsContent}
        </Card>
      ) : null}
    </div>
  );
}
