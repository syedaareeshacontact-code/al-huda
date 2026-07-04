'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { useAppSettings } from '@/components/providers/app-settings-provider';
import { useSurahContext } from '@/hooks/useSurahContext';
import { fetchSurahMeta } from '@/lib/quran-api';
import { clampRange, isValidSurahId } from '@/lib/quran-utils';
import type { QuranPlayerContextValue, QuranPlayerPrefs, LoadSurahOptions } from '@/types/player';
import type { SurahAudioOption } from '@/types/quran';

const DEFAULT_PREFS: QuranPlayerPrefs = {
  volume: 0.9,
  playbackRate: 1,
  loop: false,
  reciterIndex: 0,
};

const TOTAL_SURAHS = 114;

const QuranPlayerContext = createContext<QuranPlayerContextValue | null>(null);

function getTranslationAudioUrl(surahNumber: number) {
  return `https://ia801503.us.archive.org/28/items/quran_urdu_audio_only/${String(
    surahNumber
  ).padStart(3, '0')}.ogg`;
}

export function QuranPlayerProvider({ children }: PropsWithChildren) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingAutoplayRef = useRef(false);
  const pendingStartAyahRef = useRef<number | null>(null);
  const ayahCountRef = useRef<number>(0);
  const lastCommittedTimeRef = useRef(0);

  const [prefs, setPrefs] = useState<QuranPlayerPrefs>(DEFAULT_PREFS);

  const { settings } = useAppSettings();
  const { surahs, pageNo, setPageNo } = useSurahContext();

  const [activeSurahId, setActiveSurahId] = useState<number>(() =>
    isValidSurahId(pageNo) ? pageNo : 1
  );
  const [sourceType, setSourceType] = useState<'ar' | 'tr'>(settings.audioPreference);
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [reciterName, setReciterName] = useState<string>('');
  const [reciters, setReciters] = useState<SurahAudioOption[]>([]);
  const [isLoadingSource, setIsLoadingSource] = useState<boolean>(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);

  const surahTitle = useMemo(() => {
    const surah = surahs.find((item) => item.id === activeSurahId);
    return surah ? `${surah.id}. ${surah.surahName}` : `Surah ${activeSurahId}`;
  }, [activeSurahId, surahs]);

  const totalAyahs = useMemo(() => {
    if (ayahCountRef.current > 0) {
      return ayahCountRef.current;
    }

    return surahs.find((item) => item.id === activeSurahId)?.totalAyah ?? 0;
  }, [activeSurahId, surahs]);

  const activeAyah = useMemo(() => {
    if (duration <= 0 || totalAyahs <= 0 || currentTime <= 0) {
      return null;
    }

    return clampRange(
      Math.floor((currentTime / duration) * totalAyahs) + 1,
      1,
      totalAyahs
    );
  }, [currentTime, duration, totalAyahs]);

  const progress = useMemo(() => {
    if (duration <= 0) {
      return 0;
    }

    return clampRange((currentTime / duration) * 100, 0, 100);
  }, [currentTime, duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = prefs.volume;
    audio.playbackRate = prefs.playbackRate;
    audio.loop = prefs.loop;
  }, [prefs.loop, prefs.playbackRate, prefs.volume]);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !sourceUrl) {
      return;
    }

    try {
      setIsBuffering(true);
      await audio.play();
    } catch {
      setIsPlaying(false);
      setIsBuffering(false);
    }
  }, [sourceUrl]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    setIsPlaying(false);
    setIsBuffering(false);
  }, []);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      pause();
      return;
    }

    await play();
  }, [isPlaying, pause, play]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) {
      return;
    }

    const target = clampRange(seconds, 0, duration || 0);
    audio.currentTime = target;
    lastCommittedTimeRef.current = target;
    setCurrentTime(target);
  }, [duration]);

  const setVolume = useCallback(
    (value: number) => {
      const next = clampRange(value, 0, 1);
      setPrefs((prev) => ({ ...prev, volume: next }));
    },
    [setPrefs]
  );

  const setPlaybackRate = useCallback(
    (value: number) => {
      const next = clampRange(value, 0.5, 2);
      setPrefs((prev) => ({ ...prev, playbackRate: next }));
    },
    [setPrefs]
  );

  const setLoop = useCallback(
    (value: boolean) => {
      setPrefs((prev) => ({ ...prev, loop: value }));
    },
    [setPrefs]
  );

  const setReciterIndex = useCallback(
    (value: number) => {
      setPrefs((prev) => ({
        ...prev,
        reciterIndex: Math.max(0, Math.floor(value)),
      }));
    },
    [setPrefs]
  );

  const loadSurah = useCallback(
    (surahId: number, options?: LoadSurahOptions) => {
      if (!isValidSurahId(surahId)) {
        return;
      }

      if (options?.reciterIndex !== undefined) {
        setReciterIndex(options.reciterIndex);
      }

      if (options?.startAyah !== undefined) {
        pendingStartAyahRef.current = options.startAyah;
      }

      pendingAutoplayRef.current = Boolean(options?.autoplay);

      setActiveSurahId(surahId);
      setPageNo(surahId);

      if (surahId === activeSurahId && sourceUrl) {
        if (options?.startAyah && totalAyahs > 0 && duration > 0) {
          const approxTime = ((options.startAyah - 1) / totalAyahs) * duration;
          seek(approxTime);
        }

        if (options?.autoplay) {
          void play();
        }
      }
    },
    [
      activeSurahId,
      duration,
      play,
      seek,
      setPageNo,
      setReciterIndex,
      sourceUrl,
      totalAyahs,
    ]
  );

  const playPrevious = useCallback(() => {
    const target = clampRange(activeSurahId - 1, 1, TOTAL_SURAHS);
    loadSurah(target, { autoplay: true });
  }, [activeSurahId, loadSurah]);

  const playNext = useCallback(() => {
    const target = clampRange(activeSurahId + 1, 1, TOTAL_SURAHS);
    loadSurah(target, { autoplay: true });
  }, [activeSurahId, loadSurah]);

  useEffect(() => {
    if (!isValidSurahId(activeSurahId)) {
      return;
    }

    const controller = new AbortController();

    const resolveSource = async () => {
      setIsLoadingSource(true);
      setSourceError(null);
      setSourceType(settings.audioPreference);

      if (settings.audioPreference === 'tr') {
        const countFromList = surahs.find((item) => item.id === activeSurahId)?.totalAyah ?? 0;
        ayahCountRef.current = countFromList;
        setReciters([]);
        setReciterName('Urdu Translation');
        setSourceUrl(getTranslationAudioUrl(activeSurahId));
        setIsLoadingSource(false);
        return;
      }

      try {
        const meta = await fetchSurahMeta(activeSurahId, controller.signal);
        const options = Object.values(meta.audio ?? {}).filter(
          (item) => item.originalUrl || item.url
        );

        ayahCountRef.current = meta.totalAyah || 0;
        setReciters(options);

        if (options.length === 0) {
          setReciterName('Arabic Recitation');
          setSourceUrl('');
          setSourceError('No Arabic reciter URL found for this surah.');
          return;
        }

        const clamped = clampRange(prefs.reciterIndex, 0, options.length - 1);
        if (clamped !== prefs.reciterIndex) {
          setPrefs((prev) => ({ ...prev, reciterIndex: clamped }));
        }

        const selected = options[clamped];
        setReciterName(selected.reciter ?? 'Arabic Recitation');
        setSourceUrl(selected.originalUrl ?? selected.url ?? '');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to resolve recitation source.';
        setSourceUrl('');
        setSourceError(message);
      } finally {
        setIsLoadingSource(false);
      }
    };

    void resolveSource();

    return () => {
      controller.abort();
    };
  }, [activeSurahId, prefs.reciterIndex, settings.audioPreference, setPrefs, surahs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!sourceUrl) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      setIsPlaying(false);
      setIsBuffering(false);
      lastCommittedTimeRef.current = 0;
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    audio.src = sourceUrl;
    audio.load();
    lastCommittedTimeRef.current = 0;
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(false);

    if (pendingAutoplayRef.current || settings.autoPlayAudio) {
      void play();
    } else {
      pause();
    }

    pendingAutoplayRef.current = false;
  }, [pause, play, settings.autoPlayAudio, sourceUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const onTimeUpdate = () => {
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

    const onLoadedMetadata = () => {
      const loadedDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(loadedDuration);

      const pendingAyah = pendingStartAyahRef.current;
      if (pendingAyah && loadedDuration > 0 && ayahCountRef.current > 0) {
        const targetTime = ((pendingAyah - 1) / ayahCountRef.current) * loadedDuration;
        audio.currentTime = clampRange(targetTime, 0, loadedDuration);
        lastCommittedTimeRef.current = audio.currentTime;
        setCurrentTime(audio.currentTime);
        pendingStartAyahRef.current = null;
      }
    };

    const onPlay = () => {
      setIsBuffering(true);
    };

    const onPlaying = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };

    const onPause = () => {
      setIsPlaying(false);
      setIsBuffering(false);
    };

    const onEnded = () => {
      if (!prefs.loop) {
        setIsPlaying(false);
      }
      setIsBuffering(false);
    };

    const onWaiting = () => {
      if (!audio.paused && !audio.ended) {
        setIsPlaying(false);
        setIsBuffering(true);
      }
    };

    const onCanPlay = () => {
      if (audio.paused || audio.ended) {
        setIsBuffering(false);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
    };
  }, [prefs.loop]);

  const value = useMemo<QuranPlayerContextValue>(
    () => ({
      activeSurahId,
      sourceType,
      surahTitle,
      reciterName,
      reciters,
      reciterIndex: prefs.reciterIndex,
      isLoadingSource,
      sourceError,

      isPlaying,
      isBuffering,
      duration,
      currentTime,
      progress,
      activeAyah,
      totalAyahs,

      volume: prefs.volume,
      playbackRate: prefs.playbackRate,
      loop: prefs.loop,

      loadSurah,
      play,
      pause,
      togglePlay,
      seek,
      playNext,
      playPrevious,
      setVolume,
      setPlaybackRate,
      setLoop,
      setReciterIndex,
    }),
    [
      activeAyah,
      activeSurahId,
      currentTime,
      duration,
      isBuffering,
      isLoadingSource,
      isPlaying,
      loadSurah,
      pause,
      play,
      playNext,
      playPrevious,
      prefs.loop,
      prefs.playbackRate,
      prefs.reciterIndex,
      prefs.volume,
      progress,
      reciterName,
      reciters,
      seek,
      setLoop,
      setPlaybackRate,
      setReciterIndex,
      setVolume,
      sourceError,
      sourceType,
      surahTitle,
      togglePlay,
      totalAyahs,
    ]
  );

  return (
    <QuranPlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />
    </QuranPlayerContext.Provider>
  );
}

export function useQuranPlayer() {
  const context = useContext(QuranPlayerContext);
  if (!context) {
    throw new Error('useQuranPlayer must be used within QuranPlayerProvider');
  }
  return context;
}
