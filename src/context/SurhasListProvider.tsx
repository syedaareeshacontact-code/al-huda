'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from 'react';

import useSurahList from '@/hooks/useSurahList';
import { useAppSettings } from '@/components/providers/app-settings-provider';
import {
  AUTH_CHANGED_EVENT,
  clearGuestQuranState,
  normalizeBookmarks,
  normalizeFavoriteSurahIds,
  normalizeLastReadEntry,
  normalizeQuranState,
  serializeQuranState,
} from '@/lib/quran-user-state';
import type {
  AyahBookmark,
  LastReadEntry,
  SortOrder,
  SurahListItem,
  SurahSortBy,
} from '@/types/quran';
import { buildBookmarkId } from '@/lib/quran-utils';

interface SurahListContext {
  pageNo: number;
  setPageNo: Dispatch<SetStateAction<number>>;
  surahs: SurahListItem[];
  loading: boolean;
  error: string | null;

  filterSurahs: SurahListItem[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: SurahSortBy;
  setSortBy: (value: SurahSortBy) => void;
  order: SortOrder;
  setOrder: (value: SortOrder) => void;
  resetFilters: () => void;

  favorites: number[];
  toggleFavoriteSurah: (surahId: number) => void;
  isFavoriteSurah: (surahId: number) => boolean;

  bookmarks: AyahBookmark[];
  toggleBookmark: (bookmark: Omit<AyahBookmark, 'id' | 'createdAt'>) => void;
  isBookmarked: (surahId: number, ayahNumber: number) => boolean;
  removeBookmark: (bookmarkId: string) => void;
  surahLikes: Record<number, number>;
  getSurahLikesCount: (surahId: number) => number;

  lastRead: LastReadEntry | null;
  setLastRead: (entry: LastReadEntry) => void;

  language: 'ar' | 'tr';
  addLanguage: (len: 'ar' | 'tr') => void;
  handleLanguageChange: (lang: 'ar' | 'tr') => void;
  handleSetPlaying: (playing?: boolean) => void;
  isPlaying: boolean;
}

const SurhasList = createContext<SurahListContext | null>(null);
const OPEN_AUTH_MODAL_EVENT = 'alhuda:open-auth-modal';

interface PersistedSort {
  sortBy: SurahSortBy;
  order: SortOrder;
  searchQuery: string;
}

const defaultSort: PersistedSort = {
  sortBy: 'id',
  order: 'asc',
  searchQuery: '',
};

interface SessionPayload {
  user: {
    id: string;
  } | null;
}

interface QuranStatePayload {
  favoriteSurahIds?: number[];
  bookmarkedAyahs?: AyahBookmark[];
  lastRead?: LastReadEntry | null;
}

interface SurahLikesPayload {
  likes?: Record<string, number>;
}

function sortSurahs(list: SurahListItem[], sortBy: SurahSortBy, order: SortOrder) {
  return [...list].sort((a, b) => {
    if (sortBy === 'surahName') {
      const value = a.surahName.localeCompare(b.surahName);
      return order === 'asc' ? value : -value;
    }

    const left = sortBy === 'id' ? a.id : a.totalAyah;
    const right = sortBy === 'id' ? b.id : b.totalAyah;

    return order === 'asc' ? left - right : right - left;
  });
}

const SurhasListProvider = ({ children }: PropsWithChildren) => {
  const { surahList, loading, error } = useSurahList();

  const [pageNo, setPageNo] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const [sortState, setSortState] = useState<PersistedSort>(defaultSort);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [bookmarks, setBookmarks] = useState<AyahBookmark[]>([]);
  const [lastRead, setLastReadState] = useState<LastReadEntry | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [didLoadSession, setDidLoadSession] = useState(false);
  const [didHydrateRemoteState, setDidHydrateRemoteState] = useState(false);
  const [surahLikes, setSurahLikes] = useState<Record<number, number>>({});
  const syncedQuranStateRef = useRef('');
  const sessionVersionRef = useRef(0);

  const {
    settings,
    setAudioPreference,
  } = useAppSettings();

  const requestSignin = useCallback((reason: string) => {
    window.dispatchEvent(
      new CustomEvent(OPEN_AUTH_MODAL_EVENT, {
        detail: { tab: 'signin', reason },
      })
    );
  }, []);

  const setSearchQuery = useCallback(
    (query: string) => {
      setSortState((prev) => ({ ...prev, searchQuery: query }));
    },
    [setSortState]
  );

  const setSortBy = useCallback(
    (value: SurahSortBy) => {
      setSortState((prev) => ({ ...prev, sortBy: value }));
    },
    [setSortState]
  );

  const setOrder = useCallback(
    (value: SortOrder) => {
      setSortState((prev) => ({ ...prev, order: value }));
    },
    [setSortState]
  );

  const resetFilters = useCallback(() => {
    setSortState(defaultSort);
  }, [setSortState]);

  const loadSurahLikes = useCallback(async () => {
    try {
      const response = await fetch('/api/quran/likes', {
        cache: 'no-store',
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as SurahLikesPayload;
      const source = payload.likes ?? {};
      const nextLikes: Record<number, number> = {};

      Object.entries(source).forEach(([surahIdRaw, likesRaw]) => {
        const surahId = Number(surahIdRaw);
        const likes = Math.max(0, Math.floor(Number(likesRaw) || 0));
        if (
          Number.isInteger(surahId) &&
          surahId >= 1 &&
          surahId <= 114 &&
          likes > 0
        ) {
          nextLikes[surahId] = likes;
        }
      });

      setSurahLikes(nextLikes);
    } catch {
      // keep previous likes state
    }
  }, []);

  useEffect(() => {
    void loadSurahLikes();
  }, [loadSurahLikes]);

  const loadSession = useCallback(async () => {
    const version = sessionVersionRef.current + 1;
    sessionVersionRef.current = version;

    try {
      const response = await fetch('/api/auth/session', {
        cache: 'no-store',
      });

      if (!response.ok) {
        if (sessionVersionRef.current === version) {
          setIsAuthenticated(false);
        }
        return;
      }

      const payload = (await response.json()) as SessionPayload;
      if (sessionVersionRef.current === version) {
        setIsAuthenticated(Boolean(payload.user?.id));
      }
    } catch {
      if (sessionVersionRef.current === version) {
        setIsAuthenticated(false);
      }
    } finally {
      if (sessionVersionRef.current === version) {
        setDidLoadSession(true);
        setDidHydrateRemoteState(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    const onAuthChanged = () => {
      clearGuestQuranState();
      void loadSession();
    };

    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [loadSession]);

  useEffect(() => {
    if (!didLoadSession || didHydrateRemoteState) {
      return;
    }

    let ignore = false;

    const hydrateQuranState = async () => {
      if (!isAuthenticated) {
        const nextFavorites: number[] = [];
        const nextBookmarks: AyahBookmark[] = [];
        const nextLastRead = null;

        if (!ignore) {
          setFavorites(nextFavorites);
          setBookmarks(nextBookmarks);
          setLastReadState(nextLastRead);
          clearGuestQuranState();
        }
        syncedQuranStateRef.current = serializeQuranState({
          favoriteSurahIds: nextFavorites,
          bookmarkedAyahs: nextBookmarks,
          lastRead: nextLastRead,
        });
        if (!ignore) {
          setDidHydrateRemoteState(true);
        }
        return;
      }

      try {
        const response = await fetch('/api/auth/quran-state', {
          cache: 'no-store',
        });

        if (!response.ok) {
          syncedQuranStateRef.current = serializeQuranState({
            favoriteSurahIds: favorites,
            bookmarkedAyahs: bookmarks,
            lastRead,
          });
          return;
        }

        const payload = (await response.json()) as QuranStatePayload;
        const remoteState = normalizeQuranState({
          favoriteSurahIds: Array.isArray(payload.favoriteSurahIds)
            ? payload.favoriteSurahIds
            : [],
          bookmarkedAyahs: Array.isArray(payload.bookmarkedAyahs)
            ? payload.bookmarkedAyahs
            : [],
          lastRead: payload.lastRead ?? null,
        });

        if (!ignore) {
          setFavorites(remoteState.favoriteSurahIds);
          setBookmarks(remoteState.bookmarkedAyahs);
          setLastReadState(remoteState.lastRead);
          clearGuestQuranState();
        }
        syncedQuranStateRef.current = serializeQuranState(remoteState);
        await loadSurahLikes();
      } catch {
        syncedQuranStateRef.current = serializeQuranState({
          favoriteSurahIds: favorites,
          bookmarkedAyahs: bookmarks,
          lastRead,
        });
      } finally {
        if (!ignore) {
          setDidHydrateRemoteState(true);
        }
      }
    };

    void hydrateQuranState();

    return () => {
      ignore = true;
    };
  }, [
    bookmarks,
    didHydrateRemoteState,
    didLoadSession,
    favorites,
    isAuthenticated,
    lastRead,
    loadSurahLikes,
  ]);

  useEffect(() => {
    if (!didHydrateRemoteState || !isAuthenticated) {
      return;
    }

    const snapshot = serializeQuranState({
      favoriteSurahIds: favorites,
      bookmarkedAyahs: bookmarks,
      lastRead,
    });
    if (snapshot === syncedQuranStateRef.current) {
      return;
    }

    let ignore = false;
    syncedQuranStateRef.current = snapshot;

    const syncQuranState = async () => {
      try {
        const response = await fetch('/api/auth/quran-state', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            favoriteSurahIds: normalizeFavoriteSurahIds(favorites),
            bookmarkedAyahs: normalizeBookmarks(bookmarks),
            lastRead: normalizeLastReadEntry(lastRead),
          }),
        });

        if (!response.ok) {
          syncedQuranStateRef.current = '';
          return;
        }

        const payload = (await response.json()) as QuranStatePayload;
        const nextFavorites = normalizeFavoriteSurahIds(
          Array.isArray(payload.favoriteSurahIds) ? payload.favoriteSurahIds : favorites
        );
        const nextBookmarks = normalizeBookmarks(
          Array.isArray(payload.bookmarkedAyahs) ? payload.bookmarkedAyahs : bookmarks
        );
        const nextLastRead = normalizeLastReadEntry(payload.lastRead ?? lastRead);
        const nextSnapshot = serializeQuranState({
          favoriteSurahIds: nextFavorites,
          bookmarkedAyahs: nextBookmarks,
          lastRead: nextLastRead,
        });

        syncedQuranStateRef.current = nextSnapshot;

        if (!ignore) {
          setFavorites(nextFavorites);
          setBookmarks(nextBookmarks);
          setLastReadState(nextLastRead);
        }

        await loadSurahLikes();
      } catch {
        syncedQuranStateRef.current = '';
      }
    };

    void syncQuranState();

    return () => {
      ignore = true;
    };
  }, [
    bookmarks,
    didHydrateRemoteState,
    favorites,
    isAuthenticated,
    lastRead,
    loadSurahLikes,
  ]);

  const filterSurahs = useMemo(() => {
    const query = sortState.searchQuery.trim().toLowerCase();
    const scoped = query
      ? surahList.filter((surah) => {
          return (
            surah.surahName.toLowerCase().includes(query) ||
            surah.surahNameArabic.toLowerCase().includes(query) ||
            surah.surahNameTranslation.toLowerCase().includes(query) ||
            String(surah.id).includes(query)
          );
        })
      : surahList;

    return sortSurahs(scoped, sortState.sortBy, sortState.order);
  }, [sortState.order, sortState.searchQuery, sortState.sortBy, surahList]);

  const toggleFavoriteSurah = useCallback(
    (surahId: number) => {
      if (!isAuthenticated) {
        requestSignin('save favorites');
        return;
      }

      setFavorites((prev) =>
        prev.includes(surahId)
          ? prev.filter((id) => id !== surahId)
          : [...prev, surahId]
      );
    },
    [isAuthenticated, requestSignin, setFavorites]
  );

  const isFavoriteSurah = useCallback(
    (surahId: number) => favorites.includes(surahId),
    [favorites]
  );

  const getSurahLikesCount = useCallback(
    (surahId: number) => surahLikes[surahId] ?? 0,
    [surahLikes]
  );

  const toggleBookmark = useCallback(
    ({ surahId, ayahNumber, text }: Omit<AyahBookmark, 'id' | 'createdAt'>) => {
      if (!isAuthenticated) {
        requestSignin('save bookmarks');
        return;
      }

      const id = buildBookmarkId(surahId, ayahNumber);
      setBookmarks((prev) => {
        const exists = prev.some((bookmark) => bookmark.id === id);
        if (exists) {
          return prev.filter((bookmark) => bookmark.id !== id);
        }

        return [
          {
            id,
            surahId,
            ayahNumber,
            text,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ];
      });
    },
    [isAuthenticated, requestSignin, setBookmarks]
  );

  const isBookmarked = useCallback(
    (surahId: number, ayahNumber: number) =>
      bookmarks.some(
        (bookmark) =>
          bookmark.surahId === surahId && bookmark.ayahNumber === ayahNumber
      ),
    [bookmarks]
  );

  const removeBookmark = useCallback(
    (bookmarkId: string) => {
      if (!isAuthenticated) {
        requestSignin('save bookmarks');
        return;
      }

      setBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== bookmarkId));
    },
    [isAuthenticated, requestSignin, setBookmarks]
  );

  const setLastRead = useCallback(
    (entry: LastReadEntry) => {
      const normalizedEntry = normalizeLastReadEntry(entry);
      if (!normalizedEntry || !isAuthenticated) {
        return;
      }

      setLastReadState(normalizedEntry);
    },
    [isAuthenticated]
  );

  const addLanguage = useCallback(
    (language: 'ar' | 'tr') => {
      setAudioPreference(language);
    },
    [setAudioPreference]
  );

  const handleLanguageChange = useCallback(
    (language: 'ar' | 'tr') => {
      setAudioPreference(language);
    },
    [setAudioPreference]
  );

  const handleSetPlaying = useCallback((playing?: boolean) => {
    setIsPlaying((prev) => (typeof playing === 'boolean' ? playing : !prev));
  }, []);

  const value = useMemo(
    () => ({
      pageNo,
      setPageNo,
      surahs: surahList,
      loading,
      error,

      filterSurahs,
      searchQuery: sortState.searchQuery,
      setSearchQuery,
      sortBy: sortState.sortBy,
      setSortBy,
      order: sortState.order,
      setOrder,
      resetFilters,

      favorites,
      toggleFavoriteSurah,
      isFavoriteSurah,

      bookmarks,
      toggleBookmark,
      isBookmarked,
      removeBookmark,
      surahLikes,
      getSurahLikesCount,

      lastRead,
      setLastRead,

      language: settings.audioPreference,
      addLanguage,
      handleLanguageChange,
      handleSetPlaying,
      isPlaying,
    }),
    [
      addLanguage,
      bookmarks,
      error,
      favorites,
      filterSurahs,
      handleLanguageChange,
      handleSetPlaying,
      getSurahLikesCount,
      isBookmarked,
      isFavoriteSurah,
      isPlaying,
      lastRead,
      loading,
      pageNo,
      removeBookmark,
      resetFilters,
      setLastRead,
      setOrder,
      setPageNo,
      setSearchQuery,
      setSortBy,
      settings.audioPreference,
      sortState.order,
      sortState.searchQuery,
      sortState.sortBy,
      surahLikes,
      surahList,
      toggleBookmark,
      toggleFavoriteSurah,
    ]
  );

  return <SurhasList.Provider value={value}>{children}</SurhasList.Provider>;
};

export { SurhasList, SurhasListProvider };
