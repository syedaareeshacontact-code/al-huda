'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useSurahContext } from '@/hooks/useSurahContext';
import { fetchSurahMeta } from '@/lib/quran-api';
import { useAppSettings } from '@/components/providers/app-settings-provider';
import type { SurahAudioOption } from '@/types/quran';
import { clampRange, formatAudioTime } from '@/lib/quran-utils';
import { getSurahById } from '@/lib/quran-index';
import { buildSurahPath } from '@/lib/quran-routing';

const TOTAL_SURAHS = 114;

interface QuranAudioBottomBarProps {
  initialSurah?: number;
}

function getTranslationAudioUrl(surahNumber: number) {
  return `https://ia801503.us.archive.org/28/items/quran_urdu_audio_only/${String(
    surahNumber
  ).padStart(3, '0')}.ogg`;
}

export default function QuranAudioBottomBar({
  initialSurah = 1,
}: QuranAudioBottomBarProps) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastCommittedTimeRef = useRef(0);

  const {
    pageNo,
    setPageNo,
    handleSetPlaying,
    isPlaying,
  } = useSurahContext();

  const { settings } = useAppSettings();

  const activeSurah = useMemo(() => {
    const value = pageNo || initialSurah;
    if (!Number.isInteger(value) || value < 1 || value > TOTAL_SURAHS) {
      return 1;
    }
    return value;
  }, [initialSurah, pageNo]);

  const [audioSrc, setAudioSrc] = useState<string>('');
  const [reciters, setReciters] = useState<SurahAudioOption[]>([]);
  const [selectedReciter, setSelectedReciter] = useState(0);
  const [loadingSource, setLoadingSource] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isPlayPending, setIsPlayPending] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingSource(true);
      setSourceError(null);

      if (settings.audioPreference === 'tr') {
        setReciters([]);
        setSelectedReciter(0);
        setAudioSrc(getTranslationAudioUrl(activeSurah));
        setLoadingSource(false);
        return;
      }

      try {
        const meta = await fetchSurahMeta(activeSurah);
        const allReciters = Object.values(meta.audio ?? {}).filter(
          (item) => item.originalUrl || item.url
        );

        setReciters(allReciters);

        if (allReciters.length === 0) {
          setAudioSrc('');
          setSourceError('No Arabic recitation source found for this surah.');
          return;
        }

        const fallbackIndex = clampRange(selectedReciter, 0, allReciters.length - 1);
        setSelectedReciter(fallbackIndex);
        const source =
          allReciters[fallbackIndex]?.originalUrl ?? allReciters[fallbackIndex]?.url ?? '';
        setAudioSrc(source);
      } catch (error) {
        setSourceError(error instanceof Error ? error.message : 'Audio source failed to load.');
        setAudioSrc('');
      } finally {
        setLoadingSource(false);
      }
    };

    void load();
  }, [activeSurah, selectedReciter, settings.audioPreference]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) {
      return;
    }

    audio.src = audioSrc;
    audio.load();
    lastCommittedTimeRef.current = 0;
    setCurrentTime(0);
    setDuration(0);

    if (settings.autoPlayAudio) {
      setIsPlayPending(true);
      audio
        .play()
        .catch(() => {
          handleSetPlaying(false);
          setIsPlayPending(false);
        });
    } else {
      handleSetPlaying(false);
      setIsPlayPending(false);
    }
  }, [audioSrc, handleSetPlaying, settings.autoPlayAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const onLoaded = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    const onTime = () => {
      const nextTime = audio.currentTime || 0;
      if (
        Math.abs(nextTime - lastCommittedTimeRef.current) >= 0.45 ||
        audio.paused ||
        audio.ended
      ) {
        lastCommittedTimeRef.current = nextTime;
        setCurrentTime(nextTime);
      }
    };
    const onEnd = () => {
      handleSetPlaying(false);
      setIsPlayPending(false);
    };
    const onPlay = () => {
      setIsPlayPending(true);
    };
    const onPlaying = () => {
      handleSetPlaying(true);
      setIsPlayPending(false);
    };
    const onPause = () => {
      handleSetPlaying(false);
      setIsPlayPending(false);
    };
    const onWaiting = () => {
      if (!audio.paused && !audio.ended) {
        handleSetPlaying(false);
        setIsPlayPending(true);
      }
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('error', onEnd);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('error', onEnd);
    };
  }, [handleSetPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = volume;
  }, [volume]);

  const changeSurah = (next: number) => {
    const target = clampRange(next, 1, TOTAL_SURAHS);
    setPageNo(target);
    const surah = getSurahById(target);
    const targetPath = surah ? buildSurahPath(surah.id, surah.surahName) : `/surah/${target}`;
    router.push(targetPath);
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      handleSetPlaying(false);
      setIsPlayPending(false);
      return;
    }

    try {
      setIsPlayPending(true);
      await audio.play();
    } catch {
      handleSetPlaying(false);
      setIsPlayPending(false);
    }
  };

  return (
    <div className="fixed inset-x-2 bottom-2 z-40 sm:inset-x-4">
      <div className="mx-auto max-w-6xl rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface),transparent_6%)] p-3 shadow-[var(--shadow-card)] backdrop-blur-lg sm:p-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted-text)]">
                Audio Recitation
              </p>
              <p className="font-display text-xl text-[var(--color-heading)]">
                Surah {activeSurah}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => changeSurah(activeSurah - 1)}
                disabled={activeSurah <= 1}
                aria-label="Previous Surah"
              >
                <SkipBack className="size-4" />
              </Button>

              <Button
                size="icon"
                onClick={togglePlay}
                disabled={loadingSource || !audioSrc}
                aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
              >
                {isPlaying ? (
                  <Pause className="size-5" />
                ) : isPlayPending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Play className="size-5" />
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => changeSurah(activeSurah + 1)}
                disabled={activeSurah >= TOTAL_SURAHS}
                aria-label="Next Surah"
              >
                <SkipForward className="size-4" />
              </Button>
            </div>
          </div>

          <div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => {
                const audio = audioRef.current;
                const nextValue = Number(event.target.value);
                if (!audio || !Number.isFinite(nextValue)) {
                  return;
                }
                audio.currentTime = nextValue;
                lastCommittedTimeRef.current = nextValue;
                setCurrentTime(nextValue);
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-surface-3)] accent-[var(--color-accent)]"
              aria-label="Seek audio"
            />
            <div className="mt-1 flex justify-between text-xs text-[var(--color-muted-text)]">
              <span>{formatAudioTime(currentTime)}</span>
              <span>{formatAudioTime(duration)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setVolume((prev) => (prev > 0 ? 0 : 0.9))}
                aria-label="Toggle mute"
              >
                {volume > 0 ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </Button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="w-24 accent-[var(--color-accent)]"
                aria-label="Volume"
              />
            </div>

            {settings.audioPreference === 'ar' && reciters.length > 0 ? (
              <select
                className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs"
                value={selectedReciter}
                onChange={(event) => setSelectedReciter(Number(event.target.value))}
                aria-label="Reciter"
              >
                {reciters.map((reciter, index) => (
                  <option key={`${reciter.reciter}-${index}`} value={index}>
                    {reciter.reciter ?? `Reciter ${index + 1}`}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-[var(--color-muted-text)]">
                {settings.audioPreference === 'tr' ? 'Urdu translation audio' : 'Arabic recitation'}
              </p>
            )}
          </div>

          {loadingSource ? (
            <p className="text-xs text-[var(--color-muted-text)]">Loading audio source...</p>
          ) : null}
          {sourceError ? (
            <p className="text-xs text-[var(--color-danger)]">{sourceError}</p>
          ) : null}
        </div>
      </div>

      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />
    </div>
  );
}
