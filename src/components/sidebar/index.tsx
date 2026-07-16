'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioLines,
  BookCheck,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Heart,
  Languages,
  Menu,
  Maximize2,
  Play,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

import Loading from '@/components/ui/Loading';
import Error from '@/components/ui/Error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import StickyNavigatorMenuButton from '@/components/ui/StickyNavigatorMenuButton';
import SmartAyahScrollNav from '@/components/ui/SmartAyahScrollNav';
import QuranSettingsPanel, { OPEN_QURAN_SETTINGS_EVENT } from '@/components/quran/quran-settings-panel';
import { navigateToQuranPopup } from '@/components/quran/ayah-popup-navigation';
import { useGlobalQuranAudio } from '@/components/providers/global-quran-audio-provider';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSurahContext } from '@/hooks/useSurahContext';
import {
  fetchCompleteSurahContent,
  fetchSurahDetail,
  fetchSurahMeta,
} from '@/lib/quran-api';
import type {
  SurahAudioOption,
  SurahAyah,
  SurahDetail,
  SurahMeta,
} from '@/types/quran';
import { useAppSettings } from '@/components/providers/app-settings-provider';
import { clampRange, isValidSurahId } from '@/lib/quran-utils';
import { formatQuranArabicForDisplay } from '@/lib/arabic-utils';
import { buildSurahPath, parseSurahIdFromParam } from '@/lib/quran-routing';
import AyahEndMarker from '@/components/quran/AyahEndMarker';

interface AyahWithTranslation {
  ayah: SurahAyah;
  translation?: string;
}

interface QuranReaderPageProps {
  initialSurahId?: number;
  initialSurahDetail?: SurahDetail | null;
  initialSurahMeta?: SurahMeta | null;
}

interface AyahTimingRange {
  ayahNumber: number;
  fromMs: number;
  toMs: number;
}

interface WordTimingRange {
  ayahNumber: number;
  wordIndex: number;
  fromMs: number;
  toMs: number;
}

interface ActiveAudioWord {
  ayahNumber: number;
  wordIndex: number;
}

const INITIAL_VISIBLE_AYAHS = 20;
const AYAH_RENDER_BATCH = 40;
const AUDIO_USAGE_TRACK_INTERVAL_MS = 5 * 60 * 1000;
const AUDIO_USAGE_MIN_REPORT_SECONDS = 30;
const AUDIO_USAGE_MAX_REPORT_SECONDS = 5 * 60;

function getVisibleCountForAyah(ayahNumber: number) {
  return Math.max(
    INITIAL_VISIBLE_AYAHS,
    Math.ceil(ayahNumber / AYAH_RENDER_BATCH) * AYAH_RENDER_BATCH
  );
}

interface ChapterRecitationPayload {
  audio_file?: {
    timestamps?: Array<{
      verse_key?: string;
      timestamp_from?: number;
      timestamp_to?: number;
      segments?: number[][] | null;
    }>;
  };
}

function getQuranComRecitationId(reciterName: string | undefined) {
  if (!reciterName) {
    return null;
  }

  const normalized = reciterName.toLowerCase();
  if (normalized.includes('mishary') || normalized.includes('afasy')) {
    return 7;
  }

  if (normalized.includes('abu bakr') || normalized.includes('shatri')) {
    return 4;
  }

  if (normalized.includes('hani') || normalized.includes('rifai')) {
    return 5;
  }

  return null;
}

function reportUsageDelta(payload: { audioSeconds?: number }, beacon = false) {
  if (beacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon('/api/auth/track', blob);
    return;
  }

  void fetch('/api/auth/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    keepalive: beacon,
  });
}

function getTranslationAudioUrl(surahNumber: number) {
  return `https://ia801503.us.archive.org/28/items/quran_urdu_audio_only/${String(
    surahNumber
  ).padStart(3, '0')}.ogg`;
}

function getWeightedAyahIndex(progress: number, ayahs: AyahWithTranslation[]) {
  if (ayahs.length === 0) {
    return 0;                                                                                                                                                                                                                                     
  }                                                                               

  const weights = ayahs.map(({ translation }) => {
    const text = translation?.trim() ?? '';
    return Math.max(1, text.length);
  });

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const target = clampRange(progress, 0, 0.999999) * totalWeight;

  let accumulated = 0;
  for (let index = 0; index < weights.length; index += 1) {
    accumulated += weights[index];
    if (target < accumulated) {
      return index;
    }
  }

  return ayahs.length - 1;
}

function getAudioDuration(audio: HTMLAudioElement) {
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    return audio.duration;
  }

  if (audio.seekable.length > 0) {
    const seekableEnd = audio.seekable.end(audio.seekable.length - 1);
    if (Number.isFinite(seekableEnd) && seekableEnd > 0) {
      return seekableEnd;
    }
  }

  return 0;
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightText({ text, query }: { text: string; query: string }) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${escapeRegExp(normalizedQuery)})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === normalizedQuery.toLowerCase() ? (
          <mark
            key={`${part}-${index}`}
            className="rounded bg-[color-mix(in_oklab,var(--color-accent),white_72%)] px-0.5 text-[var(--color-heading)]"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </>
  );
}

function AudioSyncedArabicText({
  text,
  query,
  ayahNumber,
  activeWord,
}: {
  text: string;
  query: string;
  ayahNumber: number;
  activeWord: ActiveAudioWord | null;
}) {
  const words = formatQuranArabicForDisplay(text).trim().split(/\s+/).filter(Boolean);

  return (
    <>
      {words.map((word, index) => {
        const wordIndex = index + 1;
        const isActive =
          activeWord?.ayahNumber === ayahNumber && activeWord.wordIndex === wordIndex;

        return (
          <span key={`${ayahNumber}-${wordIndex}-${word}`}>
            <span
              data-audio-active={isActive ? 'true' : undefined}
              className={
                isActive
                  ? 'text-[#dc2626] transition-colors duration-100 dark:text-[#f87171]'
                  : 'transition-colors duration-100'
              }
            >
              <HighlightText text={word} query={isActive ? '' : query} />
            </span>
            {index < words.length - 1 ? ' ' : null}
          </span>
        );
      })}
    </>
  );
}

export default function QuranReaderPage({
  initialSurahId,
  initialSurahDetail = null,
  initialSurahMeta = null,
}: QuranReaderPageProps) {
  const params = useParams<{ id?: string | string[]; surah?: string | string[] }>();
  const router = useRouter();
  const rawParam = Array.isArray(params?.surah)
    ? params.surah[0]
    : params?.surah ?? (Array.isArray(params?.id) ? params.id[0] : params?.id);
  const surahId = parseSurahIdFromParam(rawParam) ?? initialSurahId ?? 1;

  const {
    setPageNo,
    surahs,
    loading: surahListLoading,
    toggleFavoriteSurah,
    isFavoriteSurah,
    getSurahLikesCount,
    toggleBookmark,
    isBookmarked,
    lastRead,
    setLastRead,
  } = useSurahContext();

  const {
    settings,
    setReadingMode,
    setAudioPreference,
  } = useAppSettings();

  const hasInitialSurahContent = initialSurahId === surahId && Boolean(initialSurahDetail && initialSurahMeta);
  const [loading, setLoading] = useState(!hasInitialSurahContent);
  const [error, setError] = useState<string | null>(null);
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(
    hasInitialSurahContent ? initialSurahDetail : null
  );
  const [surahMeta, setSurahMeta] = useState<SurahMeta | null>(
    hasInitialSurahContent ? initialSurahMeta : null
  );
  const [searchInput, setSearchInput] = useState('');
  const [visibleAyahCount, setVisibleAyahCount] = useState(INITIAL_VISIBLE_AYAHS);
  const [pendingAyahScroll, setPendingAyahScroll] = useState<{
    ayahNumber: number;
    behavior: ScrollBehavior;
  } | null>(null);
  const [loadingRemainingAyahs, setLoadingRemainingAyahs] = useState(false);
  const [remainingAyahsError, setRemainingAyahsError] = useState<string | null>(null);
  const [didAutoResume, setDidAutoResume] = useState(false);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [navigatorSearch, setNavigatorSearch] = useState('');
  const [expandedSurahId, setExpandedSurahId] = useState<number>(surahId);
  const navigatorListRef = useRef<HTMLDivElement | null>(null);
  const navigatorMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const completeContentPromiseRef = useRef<
    Promise<{ detail: SurahDetail; meta: SurahMeta }> | null
  >(null);
  const activeSurahIdRef = useRef(surahId);
  activeSurahIdRef.current = surahId;

  const debouncedSearch = useDebouncedValue(searchInput, 280);
  const resumeTargetRef = useRef<HTMLButtonElement | null>(null);
  const { audioRef, updateSession } = useGlobalQuranAudio();
  const audioUsageLastTimeRef = useRef(0);
  const pendingStickyAudioPlayRef = useRef(false);

  const [audioSrc, setAudioSrc] = useState('');
  const [audioRequested, setAudioRequested] = useState(false);
  const [audioReciters, setAudioReciters] = useState<SurahAudioOption[]>([]);
  const [selectedReciter, setSelectedReciter] = useState(0);
  const [loadingAudioSource, setLoadingAudioSource] = useState(false);
  const [audioSourceError, setAudioSourceError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayPending, setIsPlayPending] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [ayahTimings, setAyahTimings] = useState<AyahTimingRange[]>([]);
  const [wordTimings, setWordTimings] = useState<WordTimingRange[]>([]);
  const [activeAudioAyahNumber, setActiveAudioAyahNumber] = useState<number | null>(null);
  const lastCommittedAudioTimeRef = useRef(0);

  useEffect(() => {
    if (!isValidSurahId(surahId)) {
      setError('Invalid surah id in route.');
      setLoading(false);
      return;
    }

    setPageNo(surahId);

    if (hasInitialSurahContent) {
      setSurahDetail(initialSurahDetail);
      setSurahMeta(initialSurahMeta);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [detail, meta] = await Promise.all([
          fetchSurahDetail(surahId, controller.signal),
          fetchSurahMeta(surahId, controller.signal),
        ]);
        setSurahDetail(detail);
        setSurahMeta(meta);
      } catch (loadError) {
        const errorObject = loadError as { name?: string; message?: string };
        if (errorObject.name === 'AbortError') {
          return;
        }

        setError(errorObject.message ?? 'Unable to load Surah details.');
      } finally {
        setLoading(false);
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [hasInitialSurahContent, initialSurahDetail, initialSurahMeta, setPageNo, surahId]);

  const ayahs = useMemo<AyahWithTranslation[]>(() => {
    if (!surahDetail) {
      return [];
    }

    const translationByPreference =
      settings.audioPreference === 'tr' ? surahMeta?.urdu : surahMeta?.english;

    return surahDetail.ayahs.map((ayah, index) => ({
      ayah,
      translation: translationByPreference?.[index] ?? surahMeta?.english?.[index],
    }));
  }, [settings.audioPreference, surahDetail, surahMeta?.english, surahMeta?.urdu]);

  const hasUnloadedAyahs = Boolean(
    surahDetail && surahDetail.ayahs.length < surahDetail.numberOfAyahs
  );

  const loadCompleteSurahContent = useCallback(async () => {
    if (!hasUnloadedAyahs) {
      return true;
    }

    setLoadingRemainingAyahs(true);
    setRemainingAyahsError(null);

    const requestedSurahId = surahId;
    const request =
      completeContentPromiseRef.current ?? fetchCompleteSurahContent(requestedSurahId);
    completeContentPromiseRef.current = request;

    try {
      const payload = await request;
      if (
        activeSurahIdRef.current !== requestedSurahId ||
        payload.detail.number !== requestedSurahId
      ) {
        return false;
      }

      setSurahDetail(payload.detail);
      setSurahMeta((current) => ({
        ...payload.meta,
        audio: current?.audio ?? payload.meta.audio,
      }));
      return true;
    } catch (loadError) {
      const errorObject = loadError as { message?: string };
      const message = errorObject.message ?? 'Unable to load the remaining ayahs.';
      if (activeSurahIdRef.current === requestedSurahId) {
        setRemainingAyahsError(message);
      }
      return false;
    } finally {
      if (completeContentPromiseRef.current === request) {
        completeContentPromiseRef.current = null;
      }
      if (activeSurahIdRef.current === requestedSurahId) {
        setLoadingRemainingAyahs(false);
      }
    }
  }, [hasUnloadedAyahs, surahId]);

  const filteredAyahs = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) {
      return ayahs;
    }

    return ayahs.filter(({ ayah, translation }) => {
      return (
        ayah.text.toLowerCase().includes(query) ||
        (translation ?? '').toLowerCase().includes(query) ||
        String(ayah.numberInSurah).includes(query)
      );
    });
  }, [ayahs, debouncedSearch]);

  useEffect(() => {
    if (debouncedSearch.trim() && hasUnloadedAyahs) {
      void loadCompleteSurahContent();
    }
  }, [debouncedSearch, hasUnloadedAyahs, loadCompleteSurahContent]);

  useEffect(() => {
    if (audioRequested && hasUnloadedAyahs) {
      void loadCompleteSurahContent();
    }
  }, [audioRequested, hasUnloadedAyahs, loadCompleteSurahContent]);

  useEffect(() => {
    setVisibleAyahCount(INITIAL_VISIBLE_AYAHS);
  }, [debouncedSearch, surahId]);

  useEffect(() => {
    completeContentPromiseRef.current = null;
    setRemainingAyahsError(null);
    setLoadingRemainingAyahs(false);
  }, [surahId]);

  const visibleAyahs = useMemo(
    () => filteredAyahs.slice(0, visibleAyahCount),
    [filteredAyahs, visibleAyahCount]
  );

  useEffect(() => {
    if (!pendingAyahScroll) {
      return;
    }

    const target = document.getElementById(`ayah-${pendingAyahScroll.ayahNumber}`);
    if (!target) {
      return;
    }

    let settleTimer = 0;
    let cancelled = false;
    const frameId = window.requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: pendingAyahScroll.behavior,
        block: 'center',
      });

      // content-visibility can refine off-screen card sizes after the first
      // jump, and Quran font metrics can change once the font has loaded.
      void document.fonts.ready.then(() => {
        if (cancelled) return;

        settleTimer = window.setTimeout(() => {
          document
            .getElementById(`ayah-${pendingAyahScroll.ayahNumber}`)
            ?.scrollIntoView({ behavior: 'auto', block: 'center' });
          setPendingAyahScroll(null);
        }, 50);
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(settleTimer);
    };
  }, [pendingAyahScroll, visibleAyahs]);

  const currentLastRead =
    lastRead?.surahId === surahId ? lastRead : null;

  const revealAndScrollToAyah = useCallback(
    (ayahNumber: number, behavior: ScrollBehavior = 'smooth') => {
      const reveal = () => {
        setVisibleAyahCount((current) =>
          Math.max(current, getVisibleCountForAyah(ayahNumber))
        );
        setPendingAyahScroll({ ayahNumber, behavior });
      };

      if (hasUnloadedAyahs && ayahNumber > ayahs.length) {
        void loadCompleteSurahContent().then((loaded) => {
          if (loaded) reveal();
        });
        return;
      }

      reveal();
    },
    [ayahs.length, hasUnloadedAyahs, loadCompleteSurahContent]
  );

  const filteredNavigatorSurahs = useMemo(() => {
    const normalizedQuery = navigatorSearch.trim().toLowerCase();
    const ordered = [...surahs].sort((left, right) => left.id - right.id);

    if (!normalizedQuery) {
      return ordered;
    }

    return ordered.filter((surah) => {
      return (
        surah.surahName.toLowerCase().includes(normalizedQuery) ||
        surah.surahNameArabic.toLowerCase().includes(normalizedQuery) ||
        surah.surahNameTranslation.toLowerCase().includes(normalizedQuery) ||
        String(surah.id).includes(normalizedQuery)
      );
    });
  }, [navigatorSearch, surahs]);

  useEffect(() => {
    if (
      !currentLastRead ||
      didAutoResume ||
      window.location.hash.startsWith('#ayah-')
    ) {
      return;
    }

    revealAndScrollToAyah(currentLastRead.ayahNumber);
    setDidAutoResume(true);
  }, [currentLastRead, didAutoResume, revealAndScrollToAyah]);

  useEffect(() => {
    setDidAutoResume(false);
    const match = window.location.hash.match(/^#ayah-(\d+)$/);
    const ayahNumber = Number(match?.[1]);
    if (Number.isInteger(ayahNumber) && ayahNumber > 0) {
      revealAndScrollToAyah(ayahNumber, 'auto');
    }
  }, [revealAndScrollToAyah, surahId]);

  useEffect(() => {
    setExpandedSurahId(surahId);
  }, [surahId]);

  useEffect(() => {
    if (!isNavigatorOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNavigatorOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isNavigatorOpen]);

  useEffect(() => {
    if (!isNavigatorOpen || surahListLoading) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const listElement = navigatorListRef.current;
      if (!listElement) {
        return;
      }

      const currentSurahCard = listElement.querySelector<HTMLElement>(
        `[data-surah-id="${surahId}"]`
      );
      if (!currentSurahCard) {
        return;
      }

      const targetTop =
        currentSurahCard.offsetTop - listElement.clientHeight / 2 + currentSurahCard.clientHeight / 2;

      listElement.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: 'smooth',
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [filteredNavigatorSurahs, isNavigatorOpen, surahId, surahListLoading]);

  useEffect(() => {
    setAudioRequested(false);
    setAudioSrc('');
    setAudioReciters([]);
    setSelectedReciter(0);
    setAudioSourceError(null);
  }, [settings.audioPreference, surahId]);

  useEffect(() => {
    const controller = new AbortController();

    const loadAudioSource = async () => {
      if (!audioRequested) {
        setLoadingAudioSource(false);
        return;
      }

      setLoadingAudioSource(true);
      setAudioSourceError(null);

      if (settings.audioPreference === 'tr') {
        setAudioReciters([]);
        setSelectedReciter(0);
        setAudioSrc(getTranslationAudioUrl(surahId));
        setLoadingAudioSource(false);
        return;
      }

      try {
        const meta = await fetchSurahMeta(surahId, controller.signal);
        const availableReciters = Object.values(meta.audio ?? {}).filter(
          (item) => item.originalUrl || item.url
        );

        setAudioReciters(availableReciters);
        if (availableReciters.length === 0) {
          setAudioSrc('');
          setAudioSourceError('No Arabic recitation source found for this surah.');
          return;
        }

        const nextReciterIndex = clampRange(
          selectedReciter,
          0,
          availableReciters.length - 1
        );

        if (nextReciterIndex !== selectedReciter) {
          setSelectedReciter(nextReciterIndex);
        }

        const source =
          availableReciters[nextReciterIndex]?.originalUrl ??
          availableReciters[nextReciterIndex]?.url ??
          '';
        setAudioSrc(source);
      } catch (loadError) {
        const errorObject = loadError as { name?: string; message?: string };
        if (errorObject.name === 'AbortError') {
          return;
        }

        setAudioSrc('');
        setAudioSourceError(errorObject.message ?? 'Audio source failed to load.');
      } finally {
        setLoadingAudioSource(false);
      }
    };

    void loadAudioSource();

    return () => {
      controller.abort();
    };
  }, [audioRequested, selectedReciter, settings.audioPreference, surahId]);

  const selectedAudioReciterName = audioReciters[selectedReciter]?.reciter ?? '';

  useEffect(() => {
    const clearTimings = () => {
      setAyahTimings((current) => (current.length === 0 ? current : []));
      setWordTimings((current) => (current.length === 0 ? current : []));
    };

    if (settings.audioPreference !== 'ar') {
      clearTimings();
      return;
    }

    const recitationId = getQuranComRecitationId(selectedAudioReciterName);
    if (!recitationId) {
      clearTimings();
      return;
    }

    clearTimings();
    const controller = new AbortController();

    const loadTimings = async () => {
      try {
        const response = await fetch(
          `https://api.quran.com/api/v4/chapter_recitations/${recitationId}/${surahId}?segments=true`,
          {
            signal: controller.signal,
            headers: {
              Accept: 'application/json',
            },
          }
        );

        if (!response.ok) {
          clearTimings();
          return;
        }

        const payload = (await response.json()) as ChapterRecitationPayload;
        const parsedWordTimings: WordTimingRange[] = [];
        const parsedTimings = (payload.audio_file?.timestamps ?? [])
          .map((entry) => {
            const ayahPart = entry.verse_key?.split(':')?.[1];
            const ayahNumber = Number(ayahPart);
            const fromMs = Number(entry.timestamp_from);
            const toMs = Number(entry.timestamp_to);

            if (
              !Number.isInteger(ayahNumber) ||
              ayahNumber < 1 ||
              !Number.isFinite(fromMs) ||
              !Number.isFinite(toMs) ||
              toMs <= fromMs
            ) {
              return null;
            }

            for (const segment of entry.segments ?? []) {
              const wordIndex = Number(segment[0]);
              const wordFromMs = Number(segment[1]);
              const wordToMs = Number(segment[2]);

              if (
                segment.length < 3 ||
                !Number.isInteger(wordIndex) ||
                wordIndex < 1 ||
                !Number.isFinite(wordFromMs) ||
                !Number.isFinite(wordToMs) ||
                wordToMs <= wordFromMs
              ) {
                continue;
              }

              parsedWordTimings.push({
                ayahNumber,
                wordIndex,
                fromMs: wordFromMs,
                toMs: wordToMs,
              });
            }

            return {
              ayahNumber,
              fromMs,
              toMs,
            } satisfies AyahTimingRange;
          })
          .filter((entry): entry is AyahTimingRange => entry !== null)
          .sort((left, right) => left.ayahNumber - right.ayahNumber);

        setAyahTimings(parsedTimings);
        setWordTimings(
          parsedWordTimings.sort((left, right) => left.fromMs - right.fromMs)
        );
      } catch {
        if (!controller.signal.aborted) {
          clearTimings();
        }
      }
    };

    void loadTimings();

    return () => {
      controller.abort();
    };
  }, [selectedAudioReciterName, settings.audioPreference, surahId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!audioSrc) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      setIsPlaying(false);
      setIsPlayPending(false);
      lastCommittedAudioTimeRef.current = 0;
      setAudioCurrentTime(0);
      setAudioDuration(0);
      return;
    }

    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    lastCommittedAudioTimeRef.current = 0;
    setAudioCurrentTime(0);
    setAudioDuration(0);

    if (!settings.autoPlayAudio) {
      setIsPlaying(false);
      setIsPlayPending(false);
      return;
    }

    audio.src = audioSrc;
    audio.load();
    setIsPlayPending(true);
    audio.play().catch(() => {
      setIsPlaying(false);
      setIsPlayPending(false);
    });
  }, [audioRef, audioSrc, settings.autoPlayAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const refreshDuration = () => {
      const nextDuration = getAudioDuration(audio);
      setAudioDuration((previousDuration) =>
        Math.abs(previousDuration - nextDuration) > 0.25 ? nextDuration : previousDuration
      );
    };

    const onLoaded = () => {
      refreshDuration();
    };
    const onDurationChange = () => {
      refreshDuration();
    };
    const onCanPlay = () => {
      refreshDuration();
    };
    const onProgress = () => {
      refreshDuration();
    };
    const onTime = () => {
      const nextTime = audio.currentTime || 0;
      if (
        Math.abs(nextTime - lastCommittedAudioTimeRef.current) >= 0.25 ||
        audio.paused ||
        audio.ended
      ) {
        lastCommittedAudioTimeRef.current = nextTime;
        setAudioCurrentTime(nextTime);
      }
      refreshDuration();
    };

    const onPlay = () => {
      setIsPlayPending(true);
    };
    const onPlaying = () => {
      setIsPlaying(true);
      setIsPlayPending(false);
    };
    const onWaiting = () => {
      if (!audio.paused && !audio.ended) {
        setIsPlaying(false);
        setIsPlayPending(true);
      }
    };
    const onPause = () => {
      setIsPlaying(false);
      setIsPlayPending(false);
    };
    const onEnd = () => {
      setIsPlaying(false);
      setIsPlayPending(false);
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('progress', onProgress);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onEnd);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('progress', onProgress);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onEnd);
    };
  }, [audioRef, loading]);

  useEffect(() => {
    const audio = audioRef.current;
    audioUsageLastTimeRef.current = audio?.currentTime ?? 0;
  }, [audioRef, audioSrc]);

  const startCurrentAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) {
      return;
    }

    if (!audio.src) {
      audio.src = audioSrc;
      audio.load();
    }

    if (audio.ended) {
      audio.currentTime = 0;
    }

    setIsPlayPending(true);
    audio.play().catch(() => {
      setIsPlaying(false);
      setIsPlayPending(false);
    });
  }, [audioRef, audioSrc]);

  const handleStickyAudioShortcut = useCallback(() => {
    pendingStickyAudioPlayRef.current = true;
    setAudioRequested(true);

    if (audioSrc) {
      startCurrentAudio();
      pendingStickyAudioPlayRef.current = false;
    }
  }, [audioSrc, startCurrentAudio]);

  useEffect(() => {
    if (!audioSrc || !pendingStickyAudioPlayRef.current) {
      return;
    }

    pendingStickyAudioPlayRef.current = false;
    startCurrentAudio();
  }, [audioSrc, startCurrentAudio]);

  useEffect(() => {
    if (!isPlaying) {
      const audio = audioRef.current;
      audioUsageLastTimeRef.current = audio?.currentTime ?? 0;
      return;
    }

    const audioNode = audioRef.current;
    if (!audioNode) {
      return;
    }

    const interval = window.setInterval(() => {
      const currentTime = audioNode.currentTime || 0;
      const previousTime = audioUsageLastTimeRef.current || 0;
      const deltaSeconds = Math.floor(currentTime - previousTime);
      audioUsageLastTimeRef.current = currentTime;

      if (deltaSeconds >= AUDIO_USAGE_MIN_REPORT_SECONDS) {
        reportUsageDelta({
          audioSeconds: Math.min(deltaSeconds, AUDIO_USAGE_MAX_REPORT_SECONDS),
        });
      }
    }, AUDIO_USAGE_TRACK_INTERVAL_MS);

    const onBeforeUnload = () => {
      const currentTime = audioNode.currentTime || 0;
      const previousTime = audioUsageLastTimeRef.current || 0;
      const deltaSeconds = Math.floor(currentTime - previousTime);
      if (deltaSeconds >= AUDIO_USAGE_MIN_REPORT_SECONDS) {
        reportUsageDelta(
          {
            audioSeconds: Math.min(deltaSeconds, AUDIO_USAGE_MAX_REPORT_SECONDS),
          },
          true
        );
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('beforeunload', onBeforeUnload);

      const currentTime = audioNode.currentTime || 0;
      const previousTime = audioUsageLastTimeRef.current || 0;
      const deltaSeconds = Math.floor(currentTime - previousTime);
      audioUsageLastTimeRef.current = currentTime;

      if (deltaSeconds >= AUDIO_USAGE_MIN_REPORT_SECONDS) {
        reportUsageDelta({
          audioSeconds: Math.min(deltaSeconds, AUDIO_USAGE_MAX_REPORT_SECONDS),
        });
      }
    };
  }, [audioRef, isPlaying]);

  useEffect(() => {
    if (!isPlaying || ayahs.length === 0) {
      setActiveAudioAyahNumber((previousAyah) => (previousAyah === null ? previousAyah : null));
      return;
    }

    const currentMs = Math.max(audioCurrentTime, 0) * 1000;

    if (ayahTimings.length > 0) {
      const matchedTiming =
        ayahTimings.find(
          (timing) => currentMs >= timing.fromMs && currentMs < timing.toMs
        ) ??
        ayahTimings.find((timing) => currentMs < timing.toMs) ??
        ayahTimings[ayahTimings.length - 1];

      const nextAyahNumber = matchedTiming?.ayahNumber ?? null;
      setActiveAudioAyahNumber((previousAyah) =>
        previousAyah === nextAyahNumber ? previousAyah : nextAyahNumber
      );
      return;
    }

    if (audioDuration > 0) {
      const progress = clampRange(audioCurrentTime / audioDuration, 0, 0.999999);
      const index = getWeightedAyahIndex(progress, ayahs);

      const nextAyahNumber = ayahs[index]?.ayah.numberInSurah ?? null;
      setActiveAudioAyahNumber((previousAyah) =>
        previousAyah === nextAyahNumber ? previousAyah : nextAyahNumber
      );
      return;
    }

    setActiveAudioAyahNumber((previousAyah) => (previousAyah === null ? previousAyah : null));
  }, [audioCurrentTime, audioDuration, ayahTimings, ayahs, isPlaying]);

  const activeAudioWord = useMemo<ActiveAudioWord | null>(() => {
    if (!isPlaying || wordTimings.length === 0) {
      return null;
    }

    const currentMs = Math.max(audioCurrentTime, 0) * 1000;
    let low = 0;
    let high = wordTimings.length - 1;
    let candidateIndex = -1;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if (wordTimings[middle].fromMs <= currentMs) {
        candidateIndex = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    const timing = candidateIndex >= 0 ? wordTimings[candidateIndex] : null;
    if (!timing || currentMs >= timing.toMs + 180) {
      return null;
    }

    return {
      ayahNumber: timing.ayahNumber,
      wordIndex: timing.wordIndex,
    };
  }, [audioCurrentTime, isPlaying, wordTimings]);

  useEffect(() => {
    if (
      !isPlaying ||
      !activeAudioAyahNumber ||
      settings.readingMode !== 'ayah' ||
      isNavigatorOpen
    ) {
      return;
    }

    revealAndScrollToAyah(activeAudioAyahNumber);
  }, [
    activeAudioAyahNumber,
    isNavigatorOpen,
    isPlaying,
    settings.readingMode,
    revealAndScrollToAyah,
  ]);

  const highlightQuery = debouncedSearch.trim();
  const favorite = isFavoriteSurah(surahId);
  const likesCount = getSurahLikesCount(surahId);
  const activeReciterName =
    settings.audioPreference === 'tr'
      ? 'Arabic + Urdu'
      : audioReciters[selectedReciter]?.reciter ?? 'Arabic Recitation';
  const currentSurahPath = useMemo(() => {
    const targetSurah = surahs.find((entry) => entry.id === surahId);
    return targetSurah
      ? buildSurahPath(targetSurah.id, targetSurah.surahName)
      : `/surah/${surahId}`;
  }, [surahId, surahs]);
  const filteredAyahNumbers = useMemo(
    () => visibleAyahs.map(({ ayah }) => ayah.numberInSurah),
    [visibleAyahs]
  );

  useEffect(() => {
    if (!audioSrc) {
      updateSession(null);
      return;
    }

    updateSession({
      surahId,
      surahName: surahDetail?.englishName ?? `Surah ${surahId}`,
      surahPath: currentSurahPath,
      audioSrc,
      isPlaying,
      isPlayPending,
      currentTime: audioRef.current?.currentTime ?? 0,
      duration: audioRef.current ? getAudioDuration(audioRef.current) : 0,
      reciterName: activeReciterName,
      activeAyahNumber: activeAudioAyahNumber,
    });
  }, [
    activeAudioAyahNumber,
    activeReciterName,
    audioSrc,
    audioRef,
    currentSurahPath,
    isPlayPending,
    isPlaying,
    surahDetail?.englishName,
    surahId,
    updateSession,
  ]);

  if (loading) {
    return <Loading label="Loading Surah..." />;
  }

  if (error || !surahDetail) {
    return (
      <Error
        message={error ?? 'Surah could not be loaded.'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const openAyahDetails = (ayahNumber: number) => {
    const targetPath = `${currentSurahPath}?ayah=${ayahNumber}`;
    if (!navigateToQuranPopup(targetPath)) {
      router.push(targetPath, { scroll: false });
    }
  };

  const openTafsirPopup = (ayahNumber: number) => {
    const targetPath = `${currentSurahPath}?ayah=${ayahNumber}&view=tafsir`;
    if (!navigateToQuranPopup(targetPath)) {
      router.push(targetPath, { scroll: false });
    }
  };

  const handleSurahNavigation = (targetSurahId: number) => {
    setExpandedSurahId(targetSurahId);
    setIsNavigatorOpen(false);

    if (targetSurahId === surahId) {
      return;
    }

    const targetSurah = surahs.find((entry) => entry.id === targetSurahId);
    const targetPath = targetSurah
      ? buildSurahPath(targetSurah.id, targetSurah.surahName)
      : `/surah/${targetSurahId}`;
    router.push(targetPath);
  };

  const handleAyahNavigation = (targetSurahId: number, ayahNumber: number) => {
    const anchor = `ayah-${ayahNumber}`;
    setExpandedSurahId(targetSurahId);
    setIsNavigatorOpen(false);

    if (targetSurahId !== surahId) {
      const targetSurah = surahs.find((entry) => entry.id === targetSurahId);
      const targetPath = targetSurah
        ? buildSurahPath(targetSurah.id, targetSurah.surahName)
        : `/surah/${targetSurahId}`;
      router.push(`${targetPath}#${anchor}`);
      return;
    }

    window.location.hash = anchor;
    revealAndScrollToAyah(ayahNumber);
  };

  return (
    <div id="interactive-reader" className="pb-36 pt-6 sm:pb-28 sm:pt-8" data-slot="page-shell">
      <div className="mx-auto w-full max-w-4xl">
        <div className="min-w-0 space-y-5">
          <Card className="lux-light-card animate-fade-up overflow-hidden rounded-3xl border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_62%)] bg-[linear-gradient(145deg,var(--color-surface),color-mix(in_oklab,var(--color-accent),var(--color-surface)_97%))] shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)]">
            <CardHeader className="p-4 sm:p-6">
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="flex items-start gap-3">
                  <Button
                    ref={navigatorMenuButtonRef}
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      setExpandedSurahId(surahId);
                      setIsNavigatorOpen(true);
                    }}
                    aria-label="Open Surah navigator"
                    className="mt-0.5 size-9 shrink-0 rounded-full animate-pulse-border"
                  >
                    <Menu className="size-4" />
                  </Button>

                  <div>
                    <Badge className="mb-2 px-2.5 py-0.5 tracking-[0.12em]">Surah {surahDetail.number}</Badge>
                    
                    <CardTitle className="font-display text-3xl leading-none text-[var(--color-heading)] sm:text-4xl">
                      {surahDetail.englishName}
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      {surahDetail.englishNameTranslation} • {surahDetail.revelationType} •{' '}
                      {surahDetail.numberOfAyahs} ayahs
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                  <p className="arabic-font text-2xl text-[var(--color-heading)] sm:text-3xl">
                    {surahDetail.name}
                  </p>
                  <div className="sm:mt-3 sm:flex sm:justify-end">
                    <Button
                      variant={favorite ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleFavoriteSurah(surahId)}
                      className="rounded-full"
                    >
                      <Heart className={`size-4 ${favorite ? 'fill-current' : ''}`} />
                      {favorite ? 'Favorited' : 'Favorite'}
                      <span className="text-[10px] opacity-75">{likesCount}</span>
                    </Button>
                  </div>
                </div>
              </div>

              {currentLastRead ? (
                <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-muted-text)]">
                  <span>Last read · Ayah {currentLastRead.ayahNumber}</span>
                  <Button
                    ref={resumeTargetRef}
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-lg px-2.5"
                    onClick={() => {
                      revealAndScrollToAyah(currentLastRead.ayahNumber);
                    }}
                  >
                    Resume
                  </Button>
                </div>
              ) : null}

              <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-2),transparent_18%)] p-4">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div>
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                      Recitation
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-heading)]">
                      {activeReciterName}
                    </p>
                    {settings.audioPreference === 'ar' && audioReciters.length > 0 ? (
                      <div className="relative mt-2 w-full md:max-w-sm">
                        <select
                          id="reader-reciter"
                          className="app-select h-10 w-full appearance-none rounded-xl px-3 pr-9 text-sm font-medium"
                          value={selectedReciter}
                          onChange={(event) => setSelectedReciter(Number(event.target.value))}
                          aria-label="Reciter voice"
                        >
                          {audioReciters.map((reciter, index) => (
                            <option key={`${reciter.reciter}-${index}`} value={index}>
                              {reciter.reciter ?? `Reciter ${index + 1}`}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-muted-text)]" />
                      </div>
                    ) : null}
                    {loadingAudioSource || audioSourceError ? (
                      <p
                        className={`mt-2 text-xs ${audioSourceError ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted-text)]'}`}
                      >
                        {audioSourceError || 'Loading audio source...'}
                      </p>
                    ) : null}
                    {!audioRequested ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setAudioRequested(true)}
                        className="mt-3"
                      >
                        <Play className="size-4" />
                        Prepare audio player
                      </Button>
                    ) : null}
                  </div>
                  <div className="inline-flex w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 md:w-auto">
                    <Button
                      size="sm"
                      variant={settings.audioPreference === 'ar' ? 'default' : 'outline'}
                      onClick={() => setAudioPreference('ar')}
                      className="flex-1 border-0 shadow-none md:flex-none"
                    >
                      Arabic + English
                    </Button>
                    <Button
                      size="sm"
                      variant={settings.audioPreference === 'tr' ? 'default' : 'outline'}
                      onClick={() => setAudioPreference('tr')}
                      className="flex-1 border-0 shadow-none md:flex-none"
                    >
                      Arabic + Urdu
                    </Button>
                  </div>
                </div>

              </div>
            </CardHeader>
          </Card>

          <Card className="lux-light-card lux-light-card-soft z-20 animate-fade-up-delay-1 overflow-hidden border-[color-mix(in_oklab,var(--color-accent),var(--color-accent)_55%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-surface),white_14%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_90%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%))] shadow-[var(--shadow-card)] backdrop-blur">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                  Read mode
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={settings.readingMode === 'ayah' ? 'default' : 'outline'}
                    onClick={() => setReadingMode('ayah')}
                  >
                    Ayah by ayah
                  </Button>
                 
                </div>
              </div>

              <div>
                <label htmlFor="reader-search" className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                  Search ayah
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
                  <Input
                    id="reader-search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Arabic / translation"
                    className="border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_65%)] bg-[color-mix(in_oklab,var(--color-surface),white_26%)] pl-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {false ? (
            <Card className="animate-fade-up border-[color-mix(in_oklab,var(--color-accent),var(--color-accent)_50%)] bg-[linear-gradient(140deg,color-mix(in_oklab,var(--color-surface),white_14%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_93%))]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="size-5 text-[var(--color-accent)]" />
                  Continuous Reading
                </CardTitle>
                <CardDescription>
                  Flow mode for uninterrupted recitation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p
                  dir="rtl"
                  lang="ar"
                  className="arabic-font quran-script arabic-mushaf text-[var(--color-heading)]"
                >
                  {visibleAyahs.map(({ ayah }, index) => {
                    const isActive =
                      isPlaying && activeAudioAyahNumber === ayah.numberInSurah;

                    return (
                      <span key={ayah.number}>
                        <span
                          id={`ayah-${ayah.numberInSurah}`}
                          className={`ayah-phrase ${isActive ? 'is-active' : ''}`.trim()}
                        >
                          {formatQuranArabicForDisplay(ayah.text)}
                        </span>
                        <AyahEndMarker number={ayah.numberInSurah} />
                        {index === visibleAyahs.length - 1 ? '' : ' '}
                      </span>
                    );
                  })}
                </p>
              </CardContent>
            </Card>
          ) : (
            <section id="ayah-list" className="space-y-4 sm:space-y-5" aria-label="Ayah list">
              {visibleAyahs.map(({ ayah, translation }) => {
                const bookmarked = isBookmarked(surahId, ayah.numberInSurah);
                const isLastRead = currentLastRead?.ayahNumber === ayah.numberInSurah;
                const isAudioActiveAyah =
                  isPlaying && activeAudioAyahNumber === ayah.numberInSurah;
                const isUrduTranslation = settings.audioPreference === 'tr';
                const ayahHighlightClass = isAudioActiveAyah
                  ? 'border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_28%)] shadow-[var(--shadow-glow)]'
                  : isLastRead
                    ? 'border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_52%)] shadow-[var(--shadow-soft)]'
                    : '';

                return (
                  <Card
                    id={`ayah-${ayah.numberInSurah}`}
                    key={ayah.number}
                    className={`ayah-card-optimized group relative overflow-hidden rounded-2xl border-[color-mix(in_oklab,var(--color-border),var(--color-accent)_12%)] bg-[var(--color-surface)] shadow-[0_18px_45px_-36px_rgb(0_0_0_/_0.55)] transition-[border-color,box-shadow,transform] duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_55%)] ${ayahHighlightClass}`}
                  >
                    <span
                      className={`absolute inset-y-0 left-0 w-1 transition-colors ${
                        isAudioActiveAyah || isLastRead
                          ? 'bg-[var(--color-accent)]'
                          : 'bg-transparent group-hover:bg-[color-mix(in_oklab,var(--color-accent),transparent_55%)]'
                      }`}
                      aria-hidden="true"
                    />

                    <CardContent className="p-0">
                      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[color-mix(in_oklab,var(--color-border),transparent_18%)] bg-[color-mix(in_oklab,var(--color-surface-2),transparent_38%)] px-4 py-2.5 sm:px-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_84%)] text-sm font-bold tabular-nums text-[var(--color-accent-soft)] shadow-sm">
                            {ayah.numberInSurah}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--color-muted-text)]">
                              Ayah {surahId}:{ayah.numberInSurah}
                            </p>
                            {isAudioActiveAyah ? (
                              <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent-soft)]">
                                <AudioLines className="size-3.5" aria-hidden="true" />
                                Now reciting
                              </p>
                            ) : isLastRead ? (
                              <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent-soft)]">
                                <BookCheck className="size-3.5" aria-hidden="true" />
                                Last read
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={bookmarked ? 'Remove bookmark' : 'Save bookmark'}
                            aria-label={bookmarked ? 'Remove bookmark' : 'Save bookmark'}
                            onClick={() =>
                              toggleBookmark({
                                surahId,
                                ayahNumber: ayah.numberInSurah,
                                text: ayah.text,
                              })
                            }
                            className={`size-9 rounded-lg border shadow-none ${
                              bookmarked
                                ? 'border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_78%)] text-[var(--color-accent-soft)]'
                                : 'border-transparent text-[var(--color-muted-text)] hover:border-[var(--color-border)] hover:text-[var(--color-heading)]'
                            }`}
                          >
                            {bookmarked ? (
                              <BookmarkCheck className="size-4" />
                            ) : (
                              <Bookmark className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={isLastRead ? 'Last read ayah' : 'Mark as last read'}
                            aria-label={isLastRead ? 'Last read ayah' : 'Mark as last read'}
                            onClick={() =>
                              setLastRead({
                                surahId,
                                ayahNumber: ayah.numberInSurah,
                                updatedAt: new Date().toISOString(),
                              })
                            }
                            className={`size-9 rounded-lg border shadow-none ${
                              isLastRead
                                ? 'border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_78%)] text-[var(--color-accent-soft)]'
                                : 'border-transparent text-[var(--color-muted-text)] hover:border-[var(--color-border)] hover:text-[var(--color-heading)]'
                            }`}
                          >
                            <BookCheck className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Open ayah details"
                            aria-label="Open ayah details"
                            onClick={() => openAyahDetails(ayah.numberInSurah)}
                            className="size-9 rounded-lg border border-transparent text-[var(--color-muted-text)] shadow-none hover:border-[var(--color-border)] hover:text-[var(--color-heading)]"
                          >
                            <Maximize2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Open Urdu tafseer"
                            aria-label="Open Urdu tafseer"
                            onClick={() => openTafsirPopup(ayah.numberInSurah)}
                            className="size-9 rounded-lg border border-transparent text-[var(--color-muted-text)] shadow-none hover:border-[var(--color-border)] hover:text-[var(--color-heading)]"
                          >
                            <BookOpen className="size-4" />
                          </Button>
                        </div>
                      </div>

                      <div
                        className={`flex min-h-32 items-center justify-end px-5 py-6 sm:min-h-40 sm:px-8 sm:py-8 ${
                          isAudioActiveAyah
                            ? 'bg-[linear-gradient(110deg,transparent,color-mix(in_oklab,var(--color-accent),var(--color-surface)_93%))]'
                            : ''
                        }`}
                      >
                        <p
                          dir="rtl"
                          lang="ar"
                          className="arabic-font quran-script arabic-reading w-full text-[var(--color-heading)]"
                        >
                          <AudioSyncedArabicText
                            text={ayah.text}
                            query={highlightQuery}
                            ayahNumber={ayah.numberInSurah}
                            activeWord={activeAudioWord}
                          />
                          <AyahEndMarker
                            number={ayah.numberInSurah}
                            className="text-[var(--color-accent-soft)]"
                          />
                        </p>
                      </div>

                      {translation ? (
                        <div
                          className={`border-t border-[color-mix(in_oklab,var(--color-border),transparent_12%)] px-5 py-4 sm:px-8 sm:py-5 ${
                            isAudioActiveAyah
                              ? 'bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_95%)]'
                              : 'bg-[color-mix(in_oklab,var(--color-surface-2),transparent_45%)]'
                          }`}
                        >
                          <div
                            className={`mb-2 flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--color-muted-text)] ${
                              isUrduTranslation ? 'justify-end' : ''
                            }`}
                          >
                            <Languages className="size-3.5" aria-hidden="true" />
                            {isUrduTranslation ? 'Urdu translation' : 'English translation'}
                          </div>
                          <p
                            className={`text-[0.95rem] leading-7 text-[color-mix(in_oklab,var(--color-text),var(--color-muted-text)_20%)] ${
                              isUrduTranslation
                                ? 'urdu-font text-right text-[1.06rem]'
                                : 'max-w-[68ch]'
                            }`}
                            dir={isUrduTranslation ? 'rtl' : 'ltr'}
                          >
                            <HighlightText text={translation} query={highlightQuery} />
                          </p>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}

              {visibleAyahs.length < filteredAyahs.length || hasUnloadedAyahs ? (
                <Card className="border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
                  <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
                    <p className="text-sm text-[var(--color-muted-text)]">
                      Showing {visibleAyahs.length} of{' '}
                      {debouncedSearch.trim()
                        ? filteredAyahs.length
                        : (surahDetail?.numberOfAyahs ?? filteredAyahs.length)} Ayahs
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      aria-controls="ayah-list"
                      disabled={loadingRemainingAyahs}
                      onClick={() => {
                        const revealNextBatch = () =>
                          setVisibleAyahCount((count) => count + AYAH_RENDER_BATCH);

                        if (hasUnloadedAyahs) {
                          void loadCompleteSurahContent().then((loaded) => {
                            if (loaded) revealNextBatch();
                          });
                          return;
                        }

                        revealNextBatch();
                      }}
                    >
                      {loadingRemainingAyahs ? 'Loading Ayahs...' : 'Load more Ayahs'}
                    </Button>
                    {remainingAyahsError ? (
                      <p className="text-xs text-[var(--color-danger)]" role="alert">
                        {remainingAyahsError}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              {filteredAyahs.length === 0 && !loadingRemainingAyahs ? (
                <Card>
                  <CardContent className="p-6 text-sm text-[var(--color-muted-text)]">
                    No ayah matched your search query.
                  </CardContent>
                </Card>
              ) : null}
            </section>
          )}
        </div>

      </div>

      <SmartAyahScrollNav
        ayahNumbers={filteredAyahNumbers}
        activeAudioAyahNumber={activeAudioAyahNumber}
        isPlaying={isPlaying}
        hasAudioPlayer
      />
      <QuranSettingsPanel variant="floating" showTrigger={false} />
      <StickyNavigatorMenuButton
        targetRef={navigatorMenuButtonRef}
        isNavigatorOpen={isNavigatorOpen}
        surahName={`Surah ${surahDetail.englishName}`}
        surahArabicName={surahDetail.name}
        surahMeta={`${surahDetail.numberOfAyahs} ayahs`}
        showAudioShortcut={!audioSrc}
        audioShortcutPending={loadingAudioSource || isPlayPending}
        audioShortcutDisabled={loadingAudioSource}
        onAudioShortcut={handleStickyAudioShortcut}
        onOpenSettings={() => {
          window.dispatchEvent(new Event(OPEN_QURAN_SETTINGS_EVENT));
        }}
        onOpen={() => {
          setExpandedSurahId(surahId);
          setIsNavigatorOpen(true);
        }}
      />

      {isNavigatorOpen ? (
        <div className="fixed inset-0 z-[110]">
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={() => setIsNavigatorOpen(false)}
            aria-label="Close surah navigator"
          />
          <button
            type="button"
            onClick={() => setIsNavigatorOpen(false)}
            aria-label="Close navigator"
            className="absolute right-4 top-4 z-20 hidden size-11 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/65 md:flex"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <aside className="absolute left-0 top-0 flex h-full w-full max-w-md animate-fade-up flex-col border-r border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[linear-gradient(155deg,color-mix(in_oklab,var(--color-surface),white_12%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_95%))] shadow-2xl">
            <div className="sticky top-0 z-10 shrink-0 border-b border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[linear-gradient(155deg,color-mix(in_oklab,var(--color-surface),white_12%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_95%))] px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-text)]">
                    Quran Navigator
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted-text)]">
                    Jump directly to any surah or ayah.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNavigatorOpen(false)}
                  aria-label="Close navigator"
                  className="h-10 shrink-0 gap-1.5 rounded-xl border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[color-mix(in_oklab,var(--color-surface),white_24%)] px-3 shadow-sm md:h-9"
                >
                  <X className="size-4 shrink-0" aria-hidden="true" />
                  <span className="text-sm font-semibold">Close</span>
                </Button>
              </div>

              <label
                htmlFor="surah-navigator-search"
                className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]"
              >
                Search Surah
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
                <Input
                  id="surah-navigator-search"
                  value={navigatorSearch}
                  onChange={(event) => setNavigatorSearch(event.target.value)}
                  placeholder="Surah name / Arabic / number"
                  className="border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_65%)] bg-[color-mix(in_oklab,var(--color-surface),white_24%)] pl-9"
                />
              </div>
            </div>

            <div ref={navigatorListRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {surahListLoading ? (
                  <p className="rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_65%)] bg-[color-mix(in_oklab,var(--color-surface),white_14%)] p-3 text-sm text-[var(--color-muted-text)]">
                    Loading surah list...
                  </p>
                ) : null}

                {!surahListLoading && filteredNavigatorSurahs.length === 0 ? (
                  <p className="rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_65%)] bg-[color-mix(in_oklab,var(--color-surface),white_14%)] p-3 text-sm text-[var(--color-muted-text)]">
                    No surahs matched your search. Try a different query.
                  </p>
                ) : null}

                {!surahListLoading
                  ? filteredNavigatorSurahs.map((surah) => {
                      const isCurrentSurah = surah.id === surahId;
                      const isExpanded = expandedSurahId === surah.id;
                      const ayahCount =
                        isCurrentSurah && surahDetail
                          ? surahDetail.numberOfAyahs
                          : surah.totalAyah;
                      const ayahNumbers = Array.from(
                        { length: Math.max(ayahCount, 0) },
                        (_, index) => index + 1
                      );

                      return (
                        <div
                          key={surah.id}
                          data-surah-id={surah.id}
                          className={`rounded-xl border p-3 ${isCurrentSurah ? 'border-[color-mix(in_oklab,var(--color-accent),var(--color-accent)_48%)] bg-[color-mix(in_oklab,var(--color-surface-2),white_8%)]' : 'border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_68%)] bg-[color-mix(in_oklab,var(--color-surface),white_18%)]'}`}
                        >
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => handleSurahNavigation(surah.id)}
                              className="min-w-0 flex-1 rounded-lg text-left outline-none transition hover:text-[var(--color-heading)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/40"
                            >
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-text)]">
                                Surah {surah.id} • {ayahCount} Ayahs
                              </p>
                              <p className="mt-1 font-display text-xl text-[var(--color-heading)]">
                                {surah.surahName}
                              </p>
                              <p className="mt-1 text-sm text-[var(--color-muted-text)]">
                                {surah.surahNameTranslation}
                              </p>
                              <p className="font-arabic mt-1 text-right text-base text-[var(--color-heading)]">
                                {surah.surahNameArabic}
                              </p>
                            </button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setExpandedSurahId((previous) =>
                                  previous === surah.id ? 0 : surah.id
                                )
                              }
                              aria-label={
                                isExpanded ? 'Hide ayah numbers' : 'Show ayah numbers'
                              }
                            >
                              <ChevronDown
                                className={`size-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </Button>
                          </div>

                          {isExpanded ? (
                            <div className="mt-3 grid grid-cols-8 gap-1.5">
                              {ayahNumbers.map((ayahNumber) => (
                                <button
                                  key={`${surah.id}-${ayahNumber}`}
                                  type="button"
                                  onClick={() =>
                                    handleAyahNavigation(surah.id, ayahNumber)
                                  }
                                  className="rounded-md border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_62%)] bg-[color-mix(in_oklab,var(--color-surface),white_22%)] px-1.5 py-1 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent-soft)] hover:text-[var(--color-heading)]"
                                >
                                  {ayahNumber}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  : null}
              </div>
          </aside>
        </div>
      ) : null}

    </div>
  );
}
