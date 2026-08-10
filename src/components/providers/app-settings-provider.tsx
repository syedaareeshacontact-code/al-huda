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

import type {
  AppSettings,
  ArabicFont,
  AudioPreference,
  ReadingMode,
  ThemeMode,
  UserSettings,
} from '@/types/settings';
import {
  getClientSession,
  updateCachedSessionSettings,
} from '@/lib/client-session';

const OPEN_AUTH_MODAL_EVENT = 'alhuda:open-auth-modal';
const THEME_MODE_STORAGE_KEY = 'alhuda:theme-mode';
const QURAN_AUDIO_PREFERENCE_CHANGE_EVENT = 'alhuda:quran-audio-preference-change';

const DEFAULT_SETTINGS: AppSettings = {
  readingMode: 'ayah',
  arabicFont: 'uthmaniHafs',
  arabicFontScale: 1.1,
  audioPreference: 'ar',
  autoPlayAudio: false,
};

const DEFAULT_USER_SETTINGS: UserSettings = {
  ...DEFAULT_SETTINGS,
  themeMode: 'dark',
};

interface AppSettingsContextValue {
  settings: AppSettings;
  themeMode: ThemeMode;
  isLoaded: boolean;
  isAuthenticated: boolean;
  setReadingMode: (mode: ReadingMode) => void;
  setArabicFont: (font: ArabicFont) => void;
  setArabicFontScale: (value: number) => void;
  setAudioPreference: (value: AudioPreference) => void;
  setAutoPlayAudio: (value: boolean) => void;
  setThemeMode: (value: ThemeMode) => void;
  resetSettings: () => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

function clampScale(value: number): number {
  return Math.max(0.9, Math.min(1.9, Number.isFinite(value) ? value : 1.1));
}

function normalizeUserSettings(input: Partial<UserSettings>): UserSettings {
  return {
    readingMode: input.readingMode === 'continuous' ? 'continuous' : 'ayah',
    arabicFont:
      input.arabicFont === 'amiriQuran' ||
      input.arabicFont === 'notoNaskh' ||
      input.arabicFont === 'scheherazade'
        ? input.arabicFont
        : 'uthmaniHafs',
    arabicFontScale: clampScale(Number(input.arabicFontScale ?? DEFAULT_SETTINGS.arabicFontScale)),
    audioPreference:
      input.audioPreference === 'tr' || input.audioPreference === 'hi'
        ? input.audioPreference
        : 'ar',
    autoPlayAudio: Boolean(input.autoPlayAudio),
    themeMode:
      input.themeMode === 'light' || input.themeMode === 'system' ? input.themeMode : 'dark',
  };
}

function applyThemeMode(themeMode: ThemeMode) {
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldUseDark = themeMode === 'dark' || (themeMode === 'system' && systemDark);

  root.classList.toggle('dark', shouldUseDark);
  root.style.colorScheme = shouldUseDark ? 'dark' : 'light';
}

function readStoredThemeMode(): ThemeMode | null {
  try {
    const value = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : null;
  } catch {
    return null;
  }
}

function writeStoredThemeMode(themeMode: ThemeMode) {
  try {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
  } catch {
    // Theme persistence is best-effort; rendering should still continue.
  }
}

function requestSignin(reason: string) {
  window.dispatchEvent(
    new CustomEvent(OPEN_AUTH_MODAL_EVENT, {
      detail: { tab: 'signin', reason },
    })
  );
}

function prepareAudioPlayerAfterPreferenceChange() {
  let attempts = 0;

  const preparePlayer = () => {
    attempts += 1;
    const prepareButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim().includes('Prepare audio player')
    );

    if (prepareButton) {
      prepareButton.click();
      return;
    }

    if (attempts < 40) {
      window.setTimeout(preparePlayer, 100);
    }
  };

  window.setTimeout(preparePlayer, 0);
}

export function AppSettingsProvider({ children }: PropsWithChildren) {
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const didHydrateRef = useRef(false);
  const syncedSettingsRef = useRef(JSON.stringify(DEFAULT_USER_SETTINGS));

  useEffect(() => {
    let ignore = false;

    const loadSettings = async () => {
      const localThemeMode = readStoredThemeMode();
      const localFallbackSettings = normalizeUserSettings({
        ...DEFAULT_USER_SETTINGS,
        themeMode: localThemeMode ?? DEFAULT_USER_SETTINGS.themeMode,
      });

      try {
        const payload = await getClientSession();
        if (!payload.user?.id) {
          if (!ignore) {
            setIsAuthenticated(false);
            setUserSettings(localFallbackSettings);
          }
          return;
        }

        const nextSettings = normalizeUserSettings(payload.settings ?? {});
        if (!ignore) {
          setIsAuthenticated(true);
          setUserSettings(nextSettings);
          writeStoredThemeMode(nextSettings.themeMode);
          syncedSettingsRef.current = JSON.stringify(nextSettings);
        }
      } catch {
        if (!ignore) {
          setIsAuthenticated(false);
          setUserSettings(localFallbackSettings);
        }
      } finally {
        if (!ignore) {
          didHydrateRef.current = true;
          setIsLoaded(true);
        }
      }
    };

    void loadSettings();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const root = document.documentElement;
    const normalized = normalizeUserSettings(userSettings);
    root.dataset.arabicFont = normalized.arabicFont;
    root.style.setProperty('--arabic-font-scale', String(normalized.arabicFontScale));
    writeStoredThemeMode(normalized.themeMode);
    applyThemeMode(normalized.themeMode);
  }, [isLoaded, userSettings]);

  useEffect(() => {
    if (!isLoaded || userSettings.themeMode !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeMode('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [isLoaded, userSettings.themeMode]);

  useEffect(() => {
    if (!didHydrateRef.current || !isLoaded || !isAuthenticated) {
      return;
    }

    const normalized = normalizeUserSettings(userSettings);
    const snapshot = JSON.stringify(normalized);
    if (snapshot === syncedSettingsRef.current) {
      return;
    }

    syncedSettingsRef.current = snapshot;

    const syncSettings = async () => {
      try {
        const response = await fetch('/api/auth/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: snapshot,
        });

        if (!response.ok) {
          syncedSettingsRef.current = '';
          return;
        }

        const payload = (await response.json()) as { settings?: Partial<UserSettings> };
        const nextSettings = normalizeUserSettings(payload.settings ?? normalized);
        updateCachedSessionSettings(nextSettings);
        syncedSettingsRef.current = JSON.stringify(nextSettings);
        setUserSettings(nextSettings);
      } catch {
        syncedSettingsRef.current = '';
      }
    };

    void syncSettings();
  }, [isAuthenticated, isLoaded, userSettings]);

  const updateSettings = useCallback(
    (updater: (prev: UserSettings) => UserSettings) => {
      setUserSettings((prev) => normalizeUserSettings(updater(normalizeUserSettings(prev))));
    },
    []
  );

  const setReadingMode = useCallback(
    (mode: ReadingMode) => {
      updateSettings((prev) => ({ ...prev, readingMode: mode }));
    },
    [updateSettings]
  );

  const setArabicFont = useCallback(
    (font: ArabicFont) => {
      updateSettings((prev) => ({ ...prev, arabicFont: font }));
    },
    [updateSettings]
  );

  const setArabicFontScale = useCallback(
    (value: number) => {
      updateSettings((prev) => ({ ...prev, arabicFontScale: clampScale(value) }));
    },
    [updateSettings]
  );

  const setAudioPreference = useCallback(
    (value: AudioPreference) => {
      const activeAudio = Array.from(document.querySelectorAll<HTMLAudioElement>('audio')).find(
        (audio) => !audio.paused && !audio.ended && Boolean(audio.currentSrc || audio.src)
      );
      const shouldResume = Boolean(activeAudio);

      if (shouldResume) {
        window.dispatchEvent(
          new CustomEvent(QURAN_AUDIO_PREFERENCE_CHANGE_EVENT, {
            detail: { resume: true },
          })
        );
      }

      updateSettings((prev) => ({ ...prev, audioPreference: value }));

      if (shouldResume) {
        prepareAudioPlayerAfterPreferenceChange();
      }
    },
    [updateSettings]
  );

  const setAutoPlayAudio = useCallback(
    (value: boolean) => {
      updateSettings((prev) => ({ ...prev, autoPlayAudio: value }));
    },
    [updateSettings]
  );

  const setThemeMode = useCallback(
    (value: ThemeMode) => {
      updateSettings((prev) => ({ ...prev, themeMode: value }));
    },
    [updateSettings]
  );

  const resetSettings = useCallback(() => {
    updateSettings(() => DEFAULT_USER_SETTINGS);
  }, [updateSettings]);

  const normalizedSettings = useMemo(() => normalizeUserSettings(userSettings), [userSettings]);

  const value = useMemo(
    () => ({
      settings: {
        readingMode: normalizedSettings.readingMode,
        arabicFont: normalizedSettings.arabicFont,
        arabicFontScale: normalizedSettings.arabicFontScale,
        audioPreference: normalizedSettings.audioPreference,
        autoPlayAudio: normalizedSettings.autoPlayAudio,
      },
      themeMode: normalizedSettings.themeMode,
      isLoaded,
      isAuthenticated,
      setReadingMode,
      setArabicFont,
      setArabicFontScale,
      setAudioPreference,
      setAutoPlayAudio,
      setThemeMode,
      resetSettings,
    }),
    [
      isAuthenticated,
      isLoaded,
      normalizedSettings,
      resetSettings,
      setArabicFont,
      setArabicFontScale,
      setAudioPreference,
      setAutoPlayAudio,
      setReadingMode,
      setThemeMode,
    ]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
}

export { DEFAULT_SETTINGS };
