'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FastForward,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Rewind,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

import { useGlobalQuranAudio } from '@/components/providers/global-quran-audio-provider';
import { formatAudioTime } from '@/lib/quran-utils';

const controlClass =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--color-muted-text)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] sm:size-10';

export default function FloatingMiniPlayer() {
  const pathname = usePathname();
  const {
    session,
    controls,
    dismissSession,
    volume,
    setVolume,
    stopAudio,
  } = useGlobalQuranAudio();

  if (!session?.audioSrc || !controls) {
    return null;
  }

  const pathSegments = pathname.split('/').filter(Boolean);
  const isReaderRoute = pathSegments.length === 2 && pathSegments[0] === 'surah';
  const duration = session.duration > 0 ? session.duration : 0;
  const currentTime = duration > 0
    ? Math.min(Math.max(session.currentTime, 0), duration)
    : Math.max(session.currentTime, 0);
  const stopOrDismiss = () => {
    if (!isReaderRoute) {
      dismissSession();
      return;
    }

    stopAudio();
  };

  return (
    <>
      <div className="h-24 sm:h-20" aria-hidden="true" />
      <section
        className="fixed inset-x-0 bottom-0 z-[90] border-t border-[color-mix(in_oklab,var(--color-border),white_8%)] bg-[color-mix(in_oklab,var(--color-bg),transparent_3%)] shadow-[0_-18px_50px_-28px_rgb(0_0_0_/_0.6)] backdrop-blur-xl"
        aria-label="Quran audio player"
      >
        <div className="relative">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={duration > 0 ? currentTime : 0}
            onChange={(event) => controls.seek(Number(event.target.value))}
            onInput={(event) => controls.seek(Number((event.target as HTMLInputElement).value))}
            className="app-range absolute inset-x-0 top-0 z-10 h-1 w-full cursor-pointer rounded-none"
            aria-label="Audio seek"
          />

          <div className="mx-auto grid min-h-[5.25rem] max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-3 sm:min-h-[4.75rem] sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:px-5 sm:pt-2.5 lg:px-6">
            <div className="min-w-0 sm:pr-4">
              <div className="flex items-center gap-2">
                <span className="hidden size-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-accent)] sm:inline-flex">
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <Link
                    href={session.surahPath}
                    className="block truncate text-sm font-semibold text-[var(--color-heading)] transition hover:text-[var(--color-accent)]"
                  >
                    {session.surahName}
                    {session.activeAyahNumber ? ` · Ayah ${session.activeAyahNumber}` : ''}
                  </Link>
                  <p className="truncate text-[0.65rem] text-[var(--color-muted-text)] sm:text-xs">
                    {session.reciterName}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-0.5 sm:gap-1.5">
              <button
                type="button"
                onClick={controls.skipBack}
                className={controlClass}
                aria-label="Previous 10 seconds"
                title="Back 10 seconds"
              >
                <Rewind className="size-4 fill-current sm:size-[1.1rem]" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => void controls.togglePlay()}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-heading)] text-[var(--color-bg)] shadow-[var(--shadow-soft)] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] sm:size-12"
                aria-label={session.isPlaying ? 'Pause audio' : 'Play audio'}
              >
                {session.isPlayPending ? (
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                ) : session.isPlaying ? (
                  <Pause className="size-5 fill-current" aria-hidden="true" />
                ) : (
                  <Play className="ml-0.5 size-5 fill-current" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={controls.skipForward}
                className={controlClass}
                aria-label="Next 10 seconds"
                title="Forward 10 seconds"
              >
                <FastForward className="size-4 fill-current sm:size-[1.1rem]" aria-hidden="true" />
              </button>
            </div>

            <div className="col-span-2 mt-0.5 flex min-w-0 items-center justify-between gap-3 sm:col-span-1 sm:mt-0 sm:justify-end">
              <span className="whitespace-nowrap font-mono text-[0.65rem] tabular-nums text-[var(--color-muted-text)] sm:text-xs">
                {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
              </span>
              <div className="hidden items-center gap-2 md:flex">
                <button
                  type="button"
                  onClick={() => setVolume(volume > 0 ? 0 : 1)}
                  className="text-[var(--color-muted-text)] transition hover:text-[var(--color-heading)]"
                  aria-label={volume > 0 ? 'Mute audio' : 'Unmute audio'}
                >
                  {volume > 0 ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  className="app-range h-1 w-20 cursor-pointer lg:w-24"
                  aria-label="Audio volume"
                />
              </div>
              <button
                type="button"
                onClick={stopOrDismiss}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--color-muted-text)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                aria-label={isReaderRoute ? 'Stop audio' : 'Close audio player'}
                title={isReaderRoute ? 'Stop audio' : 'Close player'}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
