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
  type RefObject,
} from 'react';

export interface GlobalAudioSession {
  surahId: number;
  surahName: string;
  surahPath: string;
  audioSrc: string;
  isPlaying: boolean;
  isPlayPending: boolean;
  currentTime: number;
  duration: number;
  reciterName: string;
  activeAyahNumber: number | null;
}

export interface GlobalAudioControls {
  togglePlay: () => void | Promise<void>;
  seek: (seconds: number) => void;
  skipBack: () => void;
  skipForward: () => void;
}

interface GlobalQuranAudioContextValue {
  audioRef: RefObject<HTMLAudioElement | null>;
  session: GlobalAudioSession | null;
  controls: GlobalAudioControls | null;
  volume: number;
  setVolume: (volume: number) => void;
  isPlayerHidden: boolean;
  hidePlayer: () => void;
  showPlayer: () => void;
  stopAudio: () => void;
  updateSession: (session: GlobalAudioSession | null) => void;
  dismissSession: () => void;
}

interface GlobalQuranAudioControllerContextValue {
  audioRef: RefObject<HTMLAudioElement | null>;
  updateSession: (session: GlobalAudioSession | null) => void;
  isPlayerHidden: boolean;
  showPlayer: () => void;
}

const GlobalQuranAudioContext = createContext<GlobalQuranAudioContextValue | null>(null);
const GlobalQuranAudioControllerContext =
  createContext<GlobalQuranAudioControllerContextValue | null>(null);

export function GlobalQuranAudioProvider({ children }: PropsWithChildren) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [session, setSession] = useState<GlobalAudioSession | null>(null);
  const [volume, setVolumeState] = useState(1);
  const [isPlayerHidden, setIsPlayerHidden] = useState(false);
  const sessionRef = useRef<GlobalAudioSession | null>(null);
  const lastProgressSyncRef = useRef(0);

  const patchSession = useCallback((patch: Partial<GlobalAudioSession>) => {
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      sessionRef.current = next;
      return next;
    });
  }, []);

  const updateSession = useCallback((nextSession: GlobalAudioSession | null) => {
    const previousAudioSrc = sessionRef.current?.audioSrc;
    sessionRef.current = nextSession;
    setSession(nextSession);

    if (!nextSession || nextSession.audioSrc !== previousAudioSrc) {
      setIsPlayerHidden(false);
    }
  }, []);

  const dismissSession = useCallback(() => {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) {
      audio.removeAttribute('src');
      audio.load();
    }
    sessionRef.current = null;
    setIsPlayerHidden(false);
    setSession(null);
  }, []);

  const hidePlayer = useCallback(() => {
    setIsPlayerHidden(true);
  }, []);

  const showPlayer = useCallback(() => {
    setIsPlayerHidden(false);
  }, []);

  const toggleGlobalPlay = useCallback(async () => {
    const audio = audioRef.current;
    const currentSession = sessionRef.current;
    if (!audio || !currentSession?.audioSrc) return;

    if (!audio.paused && !audio.ended) {
      audio.pause();
      return;
    }

    if (!audio.src) {
      audio.src = currentSession.audioSrc;
      audio.load();
    }
    if (audio.ended) {
      audio.currentTime = 0;
    }

    patchSession({ isPlayPending: true });
    try {
      await audio.play();
    } catch {
      patchSession({ isPlaying: false, isPlayPending: false });
    }
  }, [patchSession]);

  const seekGlobalAudio = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    const duration = Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : sessionRef.current?.duration ?? 0;
    const target = Math.max(0, Math.min(seconds, duration > 0 ? duration : seconds));
    try {
      audio.currentTime = target;
      patchSession({ currentTime: target });
    } catch {
      // The source may still be loading; native media events will sync when ready.
    }
  }, [patchSession]);

  const skipGlobalAudio = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    seekGlobalAudio((audio.currentTime || sessionRef.current?.currentTime || 0) + seconds);
  }, [seekGlobalAudio]);

  const setVolume = useCallback((nextVolume: number) => {
    const normalized = Math.max(0, Math.min(1, Number.isFinite(nextVolume) ? nextVolume : 1));
    if (audioRef.current) audioRef.current.volume = normalized;
    setVolumeState(normalized);
  }, []);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // The source may not have loaded enough metadata to seek yet.
    }
    patchSession({ currentTime: 0, isPlaying: false, isPlayPending: false });
  }, [patchSession]);

  const globalControls = useMemo<GlobalAudioControls>(
    () => ({
      togglePlay: toggleGlobalPlay,
      seek: seekGlobalAudio,
      skipBack: () => skipGlobalAudio(-10),
      skipForward: () => skipGlobalAudio(10),
    }),
    [seekGlobalAudio, skipGlobalAudio, toggleGlobalPlay]
  );

  const controls = globalControls;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncProgress = (force = false) => {
      const now = performance.now();
      if (!force && now - lastProgressSyncRef.current < 500) return;
      lastProgressSyncRef.current = now;

      const duration = Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : sessionRef.current?.duration ?? 0;
      patchSession({ currentTime: audio.currentTime || 0, duration });
    };
    const onTimeUpdate = () => syncProgress(false);
    const onMetadataChange = () => syncProgress(true);
    const onPlay = () => patchSession({ isPlayPending: true });
    const onPlaying = () => patchSession({ isPlaying: true, isPlayPending: false });
    const onPause = () => patchSession({ isPlaying: false, isPlayPending: false });
    const onWaiting = () => patchSession({ isPlaying: false, isPlayPending: true });
    const onEnded = () => patchSession({
      isPlaying: false,
      isPlayPending: false,
      currentTime: audio.duration || 0,
    });
    const onVolumeChange = () => setVolumeState(audio.volume);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onMetadataChange);
    audio.addEventListener('durationchange', onMetadataChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('volumechange', onVolumeChange);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onMetadataChange);
      audio.removeEventListener('durationchange', onMetadataChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('volumechange', onVolumeChange);
    };
  }, [patchSession]);

  const value = useMemo(
    () => ({
      audioRef,
      session,
      controls,
      volume,
      setVolume,
      isPlayerHidden,
      hidePlayer,
      showPlayer,
      stopAudio,
      updateSession,
      dismissSession,
    }),
    [
      dismissSession,
      hidePlayer,
      isPlayerHidden,
      session,
      showPlayer,
      controls,
      setVolume,
      stopAudio,
      updateSession,
      volume,
    ]
  );

  // Reader pages only need the audio element and the stable session writer.
  // Keeping those in a separate context prevents progress updates in the mini
  // player from re-rendering every ayah card several times per second.
  const controllerValue = useMemo(
    () => ({ audioRef, updateSession, isPlayerHidden, showPlayer }),
    [isPlayerHidden, showPlayer, updateSession]
  );

  return (
    <GlobalQuranAudioControllerContext.Provider value={controllerValue}>
      <GlobalQuranAudioContext.Provider value={value}>
        {children}
        <audio ref={audioRef} preload="none" crossOrigin="anonymous" />
      </GlobalQuranAudioContext.Provider>
    </GlobalQuranAudioControllerContext.Provider>
  );
}

export function useGlobalQuranAudioController() {
  const context = useContext(GlobalQuranAudioControllerContext);
  if (!context) {
    throw new Error(
      'useGlobalQuranAudioController must be used within GlobalQuranAudioProvider'
    );
  }
  return context;
}

export function useGlobalQuranAudio() {
  const context = useContext(GlobalQuranAudioContext);
  if (!context) {
    throw new Error('useGlobalQuranAudio must be used within GlobalQuranAudioProvider');
  }
  return context;
}
