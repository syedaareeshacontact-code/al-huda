'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BookCheck,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Hash,
  Heart,
  Menu,
  Loader2,
  Pause,
  Play,
  Repeat,
  Search,
  Sparkles,
  WifiOff,
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
import QuranSettingsPanel from '@/components/quran/quran-settings-panel';
import { useGlobalQuranAudio } from '@/components/providers/global-quran-audio-provider';
import { useOfflineSurahStatus } from '@/hooks/useOfflineSurah';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSurahContext } from '@/hooks/useSurahContext';
import {
  fetchSurahDetail,
  fetchSurahMeta,
  fetchUrduTafsirByAyah,
} from '@/lib/quran-api';
import type {
  SurahAudioOption,
  SurahAyah,
  SurahDetail,
  SurahMeta,
  UrduTafsirEntry,
} from '@/types/quran';
import { useAppSettings } from '@/components/providers/app-settings-provider';
import { clampRange, formatAudioTime, isValidSurahId } from '@/lib/quran-utils';
import { buildSurahPath, parseSurahIdFromParam } from '@/lib/quran-routing';
import {
  downloadSurahForOffline,
  getOfflineAudioObjectUrl,
  getOfflineSurahRecord,
  getTranslationAudioUrl as getOfflineTranslationAudioUrl,
  removeOfflineSurah,
} from '@/lib/offline-surah-store';
import AyahEndMarker from '@/components/quran/AyahEndMarker';

const OPEN_AUTH_MODAL_EVENT = 'alhuda:open-auth-modal';

interface AyahWithTranslation {
  ayah: SurahAyah;
  translation?: string;
}

interface AyahTimingRange {
  ayahNumber: number;
  fromMs: number;
  toMs: number;
}

interface ChapterRecitationPayload {
  audio_file?: {
    timestamps?: Array<{
      verse_key?: string;
      timestamp_from?: number;
      timestamp_to?: number;
    }>;
  };
}

interface AbRepeatRange {
  startAyah: number;
  endAyah: number;
  startSeconds: number;
  endSeconds: number;
  source: 'timing' | 'approx';
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

function sanitizeTafsirHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\sstyle='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

function formatTafsirHtml(html: string) {
  const sanitizedHtml = sanitizeTafsirHtml(html);
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return sanitizedHtml;
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(
    `<div id="tafseer-rich-root">${sanitizedHtml}</div>`,
    'text/html'
  );
  const root = documentNode.getElementById('tafseer-rich-root');

  if (!root) {
    return sanitizedHtml;
  }

  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType !== 3) {
      break;
    }

    const rawTitle = node.textContent?.trim() ?? '';
    root.removeChild(node);

    if (!rawTitle) {
      continue;
    }

    const normalizedTitle = rawTitle.replace(/[٭*]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (normalizedTitle) {
      const title = documentNode.createElement('h4');
      title.className = 'tafseer-topic';
      title.textContent = normalizedTitle;
      root.insertBefore(title, root.firstChild);
    }

    break;
  }

  root.querySelectorAll('div.ur:not(.page-number)').forEach((element) => {
    element.classList.add('tafseer-urdu-block');
  });

  root.querySelectorAll('p.ur').forEach((element) => {
    element.classList.add('tafseer-urdu-paragraph');
  });

  root.querySelectorAll('p:not(.tafseer-urdu-paragraph)').forEach((element) => {
    element.classList.add('tafseer-body-paragraph');
  });

  root.querySelectorAll('.page-number').forEach((element) => {
    element.classList.add('tafseer-page-number');
  });

  root.querySelectorAll('.text-translation').forEach((element) => {
    element.classList.add('tafseer-translation');
  });

  root.querySelectorAll('.arabic, .qpc-hafs').forEach((element) => {
    element.classList.add('tafseer-arabic-inline');
  });

  root.querySelectorAll('.reference').forEach((element) => {
    element.classList.add('tafseer-reference-chip');
  });

  root.querySelectorAll('.saw').forEach((element) => {
    element.classList.add('tafseer-salawat');
  });

  return root.innerHTML;
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

function slugifyForFileName(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function clickFileDownloadLink(
  href: string,
  fileName: string,
  openInNewTab = false
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const anchor = document.createElement('a');
  anchor.href = href;
  if (openInNewTab) {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function getAudioFileExtension(url: string) {
  const normalizedUrl = url.toLowerCase();
  if (normalizedUrl.includes('.ogg')) {
    return 'ogg';
  }

  if (normalizedUrl.includes('.m4a')) {
    return 'm4a';
  }

  return 'mp3';
}

async function downloadAudioFromUrl(fileNameBase: string, audioUrl: string) {
  if (!audioUrl) {
    throw new globalThis.Error('Audio source unavailable for download.');
  }

  if (typeof window === 'undefined') {
    throw new globalThis.Error('Download is only available in browser.');
  }

  const fileName = `${fileNameBase}.${getAudioFileExtension(audioUrl)}`;
  let objectUrl: string | null = null;

  try {
    const response = await fetch(audioUrl, { mode: 'cors' });
    if (!response.ok) {
      throw new globalThis.Error(`Audio request failed (${response.status}).`);
    }

    const blob = await response.blob();
    objectUrl = window.URL.createObjectURL(blob);
    clickFileDownloadLink(objectUrl, fileName);
  } catch {
    clickFileDownloadLink(audioUrl, fileName, true);
  } finally {
    if (objectUrl) {
      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 0);
    }
  }
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

export default function QuranReaderPage() {
  const params = useParams<{ id?: string | string[]; surah?: string | string[] }>();
  const router = useRouter();
  const rawParam = Array.isArray(params?.surah)
    ? params.surah[0]
    : params?.surah ?? (Array.isArray(params?.id) ? params.id[0] : params?.id);
  const surahId = parseSurahIdFromParam(rawParam) ?? 1;

  const {
    setPageNo,
    surahs,
    loading: surahListLoading,
    toggleFavoriteSurah,
    isFavoriteSurah,
    getSurahLikesCount,
    bookmarks,
    toggleBookmark,
    isBookmarked,
    lastRead,
    setLastRead,
  } = useSurahContext();

  const {
    settings,
    setReadingMode,
    setAudioPreference,
    isAuthenticated,
  } = useAppSettings();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [surahMeta, setSurahMeta] = useState<SurahMeta | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [didAutoResume, setDidAutoResume] = useState(false);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [navigatorSearch, setNavigatorSearch] = useState('');
  const [expandedSurahId, setExpandedSurahId] = useState<number>(surahId);
  const navigatorListRef = useRef<HTMLDivElement | null>(null);
  const navigatorMenuButtonRef = useRef<HTMLButtonElement | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput, 280);
  const resumeTargetRef = useRef<HTMLButtonElement | null>(null);
  const { audioRef, registerReader, unregisterReader, updateSession } = useGlobalQuranAudio();
  const { isOfflineReady, refresh: refreshOfflineStatus } = useOfflineSurahStatus(surahId);
  const audioUsageLastTimeRef = useRef(0);
  const toggleAudioPlayRef = useRef<() => Promise<void>>(async () => {});
  const handleSeekChangeRef = useRef<(rawValue: number) => void>(() => {});
  const handlePreviousAudioStepRef = useRef<() => void>(() => {});
  const handleNextAudioStepRef = useRef<() => void>(() => {});

  const [audioSrc, setAudioSrc] = useState('');
  const [audioReciters, setAudioReciters] = useState<SurahAudioOption[]>([]);
  const [selectedReciter, setSelectedReciter] = useState(0);
  const [loadingAudioSource, setLoadingAudioSource] = useState(false);
  const [audioSourceError, setAudioSourceError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayPending, setIsPlayPending] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [ayahTimings, setAyahTimings] = useState<AyahTimingRange[]>([]);
  const [activeAudioAyahNumber, setActiveAudioAyahNumber] = useState<number | null>(null);
  const lastCommittedAudioTimeRef = useRef(0);
  const [abStartAyah, setAbStartAyah] = useState(1);
  const [abEndAyah, setAbEndAyah] = useState(3);
  const [abRepeatCount, setAbRepeatCount] = useState(3);
  const [abRepeatEnabled, setAbRepeatEnabled] = useState(false);
  const [abRepeatCycle, setAbRepeatCycle] = useState(1);
  const [abRepeatError, setAbRepeatError] = useState<string | null>(null);
  const [isAbRepeatPanelOpen, setIsAbRepeatPanelOpen] = useState(false);
  const [downloadAudioSelection, setDownloadAudioSelection] = useState<'ar' | 'tr'>('ar');
  const [isDownloadAudioSelectorOpen, setIsDownloadAudioSelectorOpen] = useState(false);
  const [downloadingAudioVariant, setDownloadingAudioVariant] = useState<'ar' | 'tr' | null>(
    null
  );
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [offlineDownloading, setOfflineDownloading] = useState(false);
  const [offlineDownloadProgress, setOfflineDownloadProgress] = useState(0);
  const [offlineDownloadError, setOfflineDownloadError] = useState<string | null>(null);

  const [tafseerOpen, setTafseerOpen] = useState(false);
  const [tafseerAyahNumber, setTafseerAyahNumber] = useState<number | null>(null);
  const [tafseerAyahText, setTafseerAyahText] = useState('');
  const [tafseerData, setTafseerData] = useState<UrduTafsirEntry | null>(null);
  const [tafseerLoading, setTafseerLoading] = useState(false);
  const [tafseerError, setTafseerError] = useState<string | null>(null);

  const tafseerCacheRef = useRef<Record<string, UrduTafsirEntry>>({});
  const tafseerRequestRef = useRef(0);
  const abRepeatJumpLockRef = useRef(false);

  useEffect(() => {
    if (!isValidSurahId(surahId)) {
      setError('Invalid surah id in route.');
      setLoading(false);
      return;
    }

    setPageNo(surahId);

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const offlineRecord = await getOfflineSurahRecord(surahId);
        if (offlineRecord) {
          setSurahDetail(offlineRecord.detail);
          setSurahMeta(offlineRecord.meta);
          return;
        }

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
  }, [setPageNo, surahId]);

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

  const surahBookmarks = useMemo(
    () => bookmarks.filter((item) => item.surahId === surahId),
    [bookmarks, surahId]
  );

  const currentLastRead =
    lastRead?.surahId === surahId ? lastRead : null;

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
    if (!currentLastRead || didAutoResume) {
      return;
    }

    const element = document.getElementById(`ayah-${currentLastRead.ayahNumber}`);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setDidAutoResume(true);
  }, [currentLastRead, didAutoResume]);

  useEffect(() => {
    setExpandedSurahId(surahId);
    setAbStartAyah(1);
    setAbEndAyah(3);
    setAbRepeatCount(3);
    setAbRepeatEnabled(false);
    setAbRepeatCycle(1);
    setAbRepeatError(null);
    setIsAbRepeatPanelOpen(false);
    setDownloadAudioSelection('ar');
    setIsDownloadAudioSelectorOpen(false);
    abRepeatJumpLockRef.current = false;
    setDownloadingAudioVariant(null);
    setDownloadError(null);
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
      document.body.style.overflow = tafseerOpen ? 'hidden' : previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isNavigatorOpen, tafseerOpen]);

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
    const controller = new AbortController();

    const loadAudioSource = async () => {
      setLoadingAudioSource(true);
      setAudioSourceError(null);

      if (settings.audioPreference === 'tr') {
        const offlineUrl = await getOfflineAudioObjectUrl(surahId, 'tr', 0);
        setAudioReciters([]);
        setSelectedReciter(0);
        setAudioSrc(offlineUrl ?? getTranslationAudioUrl(surahId));
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

        const offlineUrl = await getOfflineAudioObjectUrl(surahId, 'ar', nextReciterIndex);
        const source =
          offlineUrl ??
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
  }, [selectedReciter, settings.audioPreference, surahId]);

  useEffect(() => {
    if (settings.audioPreference !== 'ar') {
      setAyahTimings([]);
      return;
    }

    const reciterName = audioReciters[selectedReciter]?.reciter;
    const recitationId = getQuranComRecitationId(reciterName);
    if (!recitationId) {
      setAyahTimings([]);
      return;
    }

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
          setAyahTimings([]);
          return;
        }

        const payload = (await response.json()) as ChapterRecitationPayload;
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

            return {
              ayahNumber,
              fromMs,
              toMs,
            } satisfies AyahTimingRange;
          })
          .filter((entry): entry is AyahTimingRange => entry !== null)
          .sort((left, right) => left.ayahNumber - right.ayahNumber);

        setAyahTimings(parsedTimings);
      } catch {
        if (!controller.signal.aborted) {
          setAyahTimings([]);
        }
      }
    };

    void loadTimings();

    return () => {
      controller.abort();
    };
  }, [audioReciters, selectedReciter, settings.audioPreference, surahId]);

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

    audio.src = audioSrc;
    audio.load();
    lastCommittedAudioTimeRef.current = 0;
    setAudioCurrentTime(0);
    setAudioDuration(0);

    if (settings.autoPlayAudio) {
      setIsPlayPending(true);
      audio
        .play()
        .catch(() => {
          setIsPlaying(false);
          setIsPlayPending(false);
        });
      return;
    }

    setIsPlaying(false);
    setIsPlayPending(false);
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
        Math.abs(nextTime - lastCommittedAudioTimeRef.current) >= 0.45 ||
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

      if (deltaSeconds > 0) {
        reportUsageDelta({
          audioSeconds: Math.min(deltaSeconds, 120),
        });
      }
    }, 10000);

    const onBeforeUnload = () => {
      const currentTime = audioNode.currentTime || 0;
      const previousTime = audioUsageLastTimeRef.current || 0;
      const deltaSeconds = Math.floor(currentTime - previousTime);
      if (deltaSeconds > 0) {
        reportUsageDelta(
          {
            audioSeconds: Math.min(deltaSeconds, 120),
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

      if (deltaSeconds > 0) {
        reportUsageDelta({
          audioSeconds: Math.min(deltaSeconds, 120),
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

  useEffect(() => {
    if (
      !isPlaying ||
      !activeAudioAyahNumber ||
      settings.readingMode !== 'ayah' ||
      tafseerOpen ||
      isNavigatorOpen
    ) {
      return;
    }

    const target = document.getElementById(`ayah-${activeAudioAyahNumber}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [
    activeAudioAyahNumber,
    isNavigatorOpen,
    isPlaying,
    settings.readingMode,
    tafseerOpen,
  ]);

  useEffect(() => {
    if (!tafseerOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTafseerOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [tafseerOpen]);

  const highlightQuery = debouncedSearch.trim();
  const favorite = isFavoriteSurah(surahId);
  const likesCount = getSurahLikesCount(surahId);
  const totalAyahCount = surahDetail?.numberOfAyahs ?? 0;
  const activeReciterName =
    settings.audioPreference === 'tr'
      ? 'Arabic + Urdu'
      : audioReciters[selectedReciter]?.reciter ?? 'Arabic Recitation';
  const arabicAudioSources = useMemo(
    () =>
      Object.values(surahMeta?.audio ?? {}).filter(
        (item) => (item.originalUrl ?? item.url ?? '').trim().length > 0
      ),
    [surahMeta?.audio]
  );
  const currentSurahPath = useMemo(() => {
    const targetSurah = surahs.find((entry) => entry.id === surahId);
    return targetSurah
      ? buildSurahPath(targetSurah.id, targetSurah.surahName)
      : `/surah/${surahId}`;
  }, [surahId, surahs]);
  const hasArabicAudioSource = arabicAudioSources.length > 0;
  const selectedDownloadLabel =
    downloadAudioSelection === 'ar' ? 'Arabic Audio' : 'Arabic + Urdu Audio';
  const isSelectedDownloadBusy = downloadingAudioVariant === downloadAudioSelection;
  const isSelectedDownloadDisabled =
    Boolean(downloadingAudioVariant) ||
    (downloadAudioSelection === 'ar' && !hasArabicAudioSource);
  const formattedTafsirHtml = useMemo(
    () => (tafseerData?.textHtml ? formatTafsirHtml(tafseerData.textHtml) : ''),
    [tafseerData?.textHtml]
  );
  const ayahOptionValues = useMemo(
    () => Array.from({ length: totalAyahCount }, (_, index) => index + 1),
    [totalAyahCount]
  );
  const filteredAyahNumbers = useMemo(
    () => filteredAyahs.map(({ ayah }) => ayah.numberInSurah),
    [filteredAyahs]
  );
  const repeatCountOptions = useMemo(() => Array.from({ length: 10 }, (_, index) => index + 1), []);
  const abRepeatRange = useMemo<AbRepeatRange | null>(() => {
    if (totalAyahCount <= 0) {
      return null;
    }

    const normalizedStart = Math.round(clampRange(abStartAyah, 1, totalAyahCount));
    const normalizedEnd = Math.round(clampRange(abEndAyah, 1, totalAyahCount));
    const startAyah = Math.min(normalizedStart, normalizedEnd);
    const endAyah = Math.max(normalizedStart, normalizedEnd);

    const startTiming = ayahTimings.find((timing) => timing.ayahNumber === startAyah);
    const endTiming = ayahTimings.find((timing) => timing.ayahNumber === endAyah);
    if (
      startTiming &&
      endTiming &&
      Number.isFinite(startTiming.fromMs) &&
      Number.isFinite(endTiming.toMs) &&
      endTiming.toMs > startTiming.fromMs
    ) {
      return {
        startAyah,
        endAyah,
        startSeconds: startTiming.fromMs / 1000,
        endSeconds: endTiming.toMs / 1000,
        source: 'timing',
      };
    }

    if (audioDuration > 0) {
      const startSeconds = ((startAyah - 1) / totalAyahCount) * audioDuration;
      const endSeconds = (endAyah / totalAyahCount) * audioDuration;
      if (endSeconds - startSeconds > 0.08) {
        return {
          startAyah,
          endAyah,
          startSeconds,
          endSeconds: Math.min(endSeconds, audioDuration),
          source: 'approx',
        };
      }
    }

    return null;
  }, [abEndAyah, abStartAyah, audioDuration, ayahTimings, totalAyahCount]);
  const abRepeatStartSeconds = abRepeatRange?.startSeconds ?? null;
  const abRepeatEndSeconds = abRepeatRange?.endSeconds ?? null;
  const abRepeatStartAyah = abRepeatRange?.startAyah ?? null;
  const abRepeatEndAyah = abRepeatRange?.endAyah ?? null;
  const abRepeatSource = abRepeatRange?.source ?? null;

  useEffect(() => {
    if (totalAyahCount <= 0) {
      return;
    }

    const normalizedStart = Math.round(clampRange(abStartAyah, 1, totalAyahCount));
    const normalizedEnd = Math.round(clampRange(abEndAyah, 1, totalAyahCount));
    const nextStart = Math.min(normalizedStart, normalizedEnd);
    const nextEnd = Math.max(normalizedStart, normalizedEnd);

    if (abStartAyah !== nextStart) {
      setAbStartAyah(nextStart);
    }

    if (abEndAyah !== nextEnd) {
      setAbEndAyah(nextEnd);
    }
  }, [abEndAyah, abStartAyah, totalAyahCount]);

  useEffect(() => {
    if (!abRepeatEnabled || abRepeatStartSeconds === null) {
      return;
    }

    const audio = audioRef.current;
    if (!audio || !audioSrc) {
      return;
    }

    abRepeatJumpLockRef.current = false;
    setAbRepeatCycle(1);

    try {
      audio.currentTime = abRepeatStartSeconds;
      lastCommittedAudioTimeRef.current = abRepeatStartSeconds;
      setAudioCurrentTime(abRepeatStartSeconds);
    } catch {
      setAbRepeatError('Could not apply A-B repeat start point.');
      setAbRepeatEnabled(false);
    }
  }, [abRepeatCount, abRepeatEnabled, abRepeatStartSeconds, audioRef, audioSrc]);

  useEffect(() => {
    if (
      !abRepeatEnabled ||
      !isPlaying ||
      abRepeatStartSeconds === null ||
      abRepeatEndSeconds === null
    ) {
      return;
    }

    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const endThresholdSeconds = 0.05;
    if (audioCurrentTime + endThresholdSeconds < abRepeatEndSeconds) {
      if (abRepeatJumpLockRef.current && audioCurrentTime < abRepeatEndSeconds - 0.25) {
        abRepeatJumpLockRef.current = false;
      }
      return;
    }

    if (abRepeatJumpLockRef.current) {
      return;
    }

    abRepeatJumpLockRef.current = true;

    if (abRepeatCycle >= abRepeatCount) {
      const stopAt = Math.max(0, abRepeatEndSeconds);

      try {
        audio.currentTime = stopAt;
        lastCommittedAudioTimeRef.current = stopAt;
      } catch {
        // ignore seek bounds edge cases
      }

      audio.pause();
      setAudioCurrentTime(stopAt);
      setAbRepeatEnabled(false);
      setAbRepeatError(null);
      window.setTimeout(() => {
        abRepeatJumpLockRef.current = false;
      }, 220);
      return;
    }

    try {
      audio.currentTime = abRepeatStartSeconds;
      lastCommittedAudioTimeRef.current = abRepeatStartSeconds;
      setAudioCurrentTime(abRepeatStartSeconds);
      setAbRepeatCycle((currentCycle) => currentCycle + 1);
      setAbRepeatError(null);
    } catch {
      setAbRepeatError('Could not apply A-B repeat jump.');
      setAbRepeatEnabled(false);
    } finally {
      window.setTimeout(() => {
        abRepeatJumpLockRef.current = false;
      }, 220);
    }
  }, [
    abRepeatCount,
    abRepeatCycle,
    abRepeatEnabled,
    abRepeatEndSeconds,
    abRepeatStartSeconds,
    audioRef,
    audioCurrentTime,
    isPlaying,
  ]);

  useEffect(() => {
    registerReader({
      togglePlay: () => void toggleAudioPlayRef.current(),
      seek: (value) => handleSeekChangeRef.current(value),
      skipBack: () => handlePreviousAudioStepRef.current(),
      skipForward: () => handleNextAudioStepRef.current(),
    });

    return () => {
      unregisterReader();
    };
  }, [registerReader, unregisterReader]);

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
      currentTime: audioCurrentTime,
      duration: audioDuration,
      reciterName: activeReciterName,
      activeAyahNumber: activeAudioAyahNumber,
    });
  }, [
    activeAudioAyahNumber,
    activeReciterName,
    audioCurrentTime,
    audioDuration,
    audioSrc,
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

  const showWordByWord = false;
  const handleAbStartAyahChange = (value: number) => {
    if (totalAyahCount <= 0) {
      return;
    }

    const nextStart = Math.round(clampRange(value, 1, totalAyahCount));
    setAbStartAyah(nextStart);
    setAbEndAyah((currentEnd) => Math.max(currentEnd, nextStart));
    setAbRepeatError(null);
  };

  const handleAbEndAyahChange = (value: number) => {
    if (totalAyahCount <= 0) {
      return;
    }

    const nextEnd = Math.round(clampRange(value, 1, totalAyahCount));
    setAbEndAyah(nextEnd);
    setAbStartAyah((currentStart) => Math.min(currentStart, nextEnd));
    setAbRepeatError(null);
  };

  const handleAbRepeatCountChange = (value: number) => {
    const nextCount = Math.round(clampRange(value, 1, 10));
    setAbRepeatCount(nextCount);
    setAbRepeatError(null);
  };

  const toggleAbRepeat = async () => {
    if (abRepeatEnabled) {
      setAbRepeatEnabled(false);
      setAbRepeatCycle(1);
      setAbRepeatError(null);
      abRepeatJumpLockRef.current = false;
      return;
    }

    const audio = audioRef.current;
    if (!audio || !audioSrc) {
      setAbRepeatError('Audio source must be ready before using A-B repeat.');
      return;
    }

    if (abRepeatStartSeconds === null || abRepeatEndSeconds === null) {
      setAbRepeatError('Play the audio once before starting A-B repeat.');
      return;
    }

    setAbRepeatEnabled(true);
    setAbRepeatCycle(1);
    setAbRepeatError(null);
    abRepeatJumpLockRef.current = false;

    try {
      audio.currentTime = abRepeatStartSeconds;
      setAudioCurrentTime(abRepeatStartSeconds);
    } catch {
      setAbRepeatEnabled(false);
      setAbRepeatError('Could not seek to A-B repeat start point.');
      return;
    }

    if (audio.paused || audio.ended) {
      setIsPlayPending(true);

      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
        setIsPlayPending(false);
        setAbRepeatEnabled(false);
        setAbRepeatError('Audio could not start. Check browser permissions.');
      }
    }
  };

  const downloadSurahAudio = async (variant: 'ar' | 'tr') => {
    if (!isAuthenticated) {
      window.dispatchEvent(
        new CustomEvent(OPEN_AUTH_MODAL_EVENT, {
          detail: { tab: 'signin', reason: 'download audio' },
        })
      );
      return;
    }

    if (!surahDetail) {
      return;
    }
    if (downloadingAudioVariant) {
      return;
    }

    setDownloadError(null);
    setDownloadingAudioVariant(variant);

    const surahNumber = String(surahDetail.number).padStart(3, '0');
    const surahSlug = slugifyForFileName(surahDetail.englishName || `surah-${surahNumber}`);

    try {
      if (variant === 'ar') {
        if (!hasArabicAudioSource) {
          throw new globalThis.Error('Arabic audio source is unavailable for this surah.');
        }

        const reciterIndex = clampRange(
          selectedReciter,
          0,
          Math.max(arabicAudioSources.length - 1, 0)
        );
        const source =
          arabicAudioSources[reciterIndex]?.originalUrl ??
          arabicAudioSources[reciterIndex]?.url ??
          arabicAudioSources[0]?.originalUrl ??
          arabicAudioSources[0]?.url ??
          '';
        if (!source) {
          throw new globalThis.Error('Arabic audio source is unavailable for this surah.');
        }

        await downloadAudioFromUrl(
          `surah-${surahNumber}-${surahSlug}-arabic-audio`,
          source
        );
        return;
      }

      await downloadAudioFromUrl(
        `surah-${surahNumber}-${surahSlug}-urdu-translation-audio`,
        getTranslationAudioUrl(surahId)
      );
    } catch (downloadAudioError) {
      const message =
        downloadAudioError instanceof globalThis.Error && downloadAudioError.message
          ? downloadAudioError.message
          : 'Unable to download audio right now.';
      setDownloadError(message);
    } finally {
      setDownloadingAudioVariant(null);
    }
  };

  const openTafseer = async (ayahNumber: number, ayahText: string) => {
    setTafseerOpen(true);
    setTafseerAyahNumber(ayahNumber);
    setTafseerAyahText(ayahText);
    setTafseerError(null);

    const cacheKey = `${surahId}:${ayahNumber}`;
    const cached = tafseerCacheRef.current[cacheKey];
    if (cached) {
      setTafseerData(cached);
      setTafseerLoading(false);
      return;
    }

    setTafseerLoading(true);
    setTafseerData(null);
    const requestId = ++tafseerRequestRef.current;

    try {
      const tafseer = await fetchUrduTafsirByAyah(surahId, ayahNumber);
      if (requestId !== tafseerRequestRef.current) {
        return;
      }

      tafseerCacheRef.current[cacheKey] = tafseer;
      setTafseerData(tafseer);
    } catch (loadError) {
      if (requestId !== tafseerRequestRef.current) {
        return;
      }

      const errorObject = loadError as { message?: string };
      setTafseerError(errorObject.message ?? 'Urdu tafseer could not be loaded.');
    } finally {
      if (requestId === tafseerRequestRef.current) {
        setTafseerLoading(false);
      }
    }
  };

  const handleSeekChange = (rawValue: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(rawValue)) {
      return;
    }

    const effectiveDuration =
      audioDuration > 0 ? audioDuration : getAudioDuration(audio);

    if (effectiveDuration <= 0) {
      setAudioSourceError('Seek will be available after audio starts.');
      return;
    }

    const nextValue = clampRange(rawValue, 0, effectiveDuration);
    try {
      audio.currentTime = nextValue;
      setAudioCurrentTime(nextValue);
      setAudioDuration(effectiveDuration);
      setAudioSourceError(null);
    } catch {
      setAudioSourceError('Could not apply seek right now. Please try again.');
    }
  };

  const jumpAudioBy = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) {
      setAudioSourceError('Audio source is not ready yet.');
      return;
    }

    const detectedDuration = getAudioDuration(audio);
    const effectiveDuration = detectedDuration > 0 ? detectedDuration : audioDuration;
    const baseTime = Number.isFinite(audio.currentTime)
      ? audio.currentTime
      : audioCurrentTime;
    const upperLimit =
      effectiveDuration > 0
        ? effectiveDuration
        : Math.max(baseTime + Math.abs(seconds), 0);

    const nextValue = clampRange(baseTime + seconds, 0, upperLimit);

    try {
      audio.currentTime = nextValue;
      setAudioCurrentTime(nextValue);
      if (effectiveDuration > 0) {
        setAudioDuration(effectiveDuration);
      }
      setAudioSourceError(null);
    } catch {
      setAudioSourceError('Could not skip audio.');
    }
  };

  const handlePreviousAudioStep = () => {
    jumpAudioBy(-10);
  };

  const handleNextAudioStep = () => {
    jumpAudioBy(10);
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
    const target = document.getElementById(anchor);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const toggleAudioPlay = async () => {
    const audio = audioRef.current;
    if (loadingAudioSource) {
      setAudioSourceError('Audio source is loading. Please wait a moment.');
      return;
    }

    if (!audio || !audioSrc) {
      setAudioSourceError('Audio source is not ready yet.');
      return;
    }

    setAudioSourceError(null);

    const isCurrentlyPlaying = !audio.paused && !audio.ended;
    if (isCurrentlyPlaying) {
      audio.pause();
      setIsPlaying(false);
      setIsPlayPending(false);
      return;
    }

    setIsPlayPending(true);

    if (audio.src !== audioSrc) {
      audio.src = audioSrc;
      audio.load();
    }

    const playPromise = audio.play();
    if (!playPromise) {
      setIsPlayPending(false);
      return;
    }

    playPromise
      .then(() => undefined)
      .catch(() => {
        setIsPlaying(false);
        setIsPlayPending(false);
        setAudioSourceError('Could not start playback. Try another reciter.');
      });
  };

  toggleAudioPlayRef.current = toggleAudioPlay;
  handleSeekChangeRef.current = handleSeekChange;
  handlePreviousAudioStepRef.current = handlePreviousAudioStep;
  handleNextAudioStepRef.current = handleNextAudioStep;

  const saveSurahForOffline = async () => {
    if (!isAuthenticated) {
      window.dispatchEvent(
        new CustomEvent(OPEN_AUTH_MODAL_EVENT, {
          detail: { tab: 'signin', reason: 'save offline audio' },
        })
      );
      return;
    }

    if (!surahDetail || !surahMeta || offlineDownloading) {
      return;
    }

    setOfflineDownloadError(null);
    setOfflineDownloading(true);
    setOfflineDownloadProgress(0);

    const reciterIndex = clampRange(
      selectedReciter,
      0,
      Math.max(arabicAudioSources.length - 1, 0)
    );
    const arabicSource =
      arabicAudioSources[reciterIndex]?.originalUrl ??
      arabicAudioSources[reciterIndex]?.url ??
      '';

    try {
      await downloadSurahForOffline({
        surahId,
        detail: surahDetail,
        meta: surahMeta,
        arabicAudioUrl: arabicSource || undefined,
        urduAudioUrl: getOfflineTranslationAudioUrl(surahId),
        arabicReciterIndex: reciterIndex,
        onProgress: (progress) => {
          setOfflineDownloadProgress(progress.percent);
        },
      });
      await refreshOfflineStatus();
    } catch (offlineError) {
      const message =
        offlineError instanceof globalThis.Error
          ? offlineError.message
          : 'Unable to save this surah for offline reading.';
      setOfflineDownloadError(message);
    } finally {
      setOfflineDownloading(false);
    }
  };

  const clearOfflineSurah = async () => {
    if (!isAuthenticated) {
      window.dispatchEvent(
        new CustomEvent(OPEN_AUTH_MODAL_EVENT, {
          detail: { tab: 'signin', reason: 'manage offline audio' },
        })
      );
      return;
    }

    try {
      await removeOfflineSurah(surahId);
      await refreshOfflineStatus();
    } catch {
      setOfflineDownloadError('Unable to remove offline copy right now.');
    }
  };

  return (
    <div id="interactive-reader" className="pb-36 pt-6 sm:pb-28 sm:pt-8" data-slot="page-shell">
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <Card className="animate-fade-up border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] shadow-[var(--shadow-glow)]">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
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
                    className="mt-0.5 animate-pulse-border"
                  >
                    <Menu className="size-4" />
                  </Button>

                  <div>
                    <Badge className="mb-2">Surah {surahDetail.number}</Badge>
                    {isOfflineReady ? (
                      <Badge className="mb-2 ml-2 inline-flex items-center gap-1">
                        <WifiOff className="size-3.5" />
                        Offline Available
                      </Badge>
                    ) : null}
                    <CardTitle className="font-display text-4xl text-[var(--color-heading)]">
                      {surahDetail.englishName}
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      {surahDetail.englishNameTranslation} • {surahDetail.revelationType} •{' '}
                      {surahDetail.numberOfAyahs} ayahs
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <p className="arabic-font text-3xl text-[var(--color-heading)]">
                    {surahDetail.name}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <Button
                      variant={favorite ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleFavoriteSurah(surahId)}
                    >
                      <Heart className={`size-4 ${favorite ? 'fill-current' : ''}`} />
                      {favorite ? 'Favorited' : 'Favorite Surah'}
                    </Button>
                  </div>
                  <Badge
                    variant="secondary"
                    className="mt-2 border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_48%)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-accent),white_75%),color-mix(in_oklab,var(--color-accent-soft),white_80%))] px-2.5 py-1 text-[color-mix(in_oklab,var(--color-heading),var(--color-accent)_34%)] tracking-normal dark:bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-accent),black_24%),color-mix(in_oklab,var(--color-accent-soft),black_18%))] dark:text-[var(--color-accent-foreground)]"
                  >
                    <Heart className={`mr-1 size-3.5 ${favorite ? 'fill-current' : ''}`} />
                    {likesCount}
                  </Badge>
                </div>
              </div>

              {currentLastRead ? (
                <div className="mt-4 rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-accent)_55%)] bg-[linear-gradient(125deg,color-mix(in_oklab,var(--color-surface-2),white_12%),color-mix(in_oklab,var(--color-accent),var(--color-surface-2)_90%))] p-3 text-sm text-[var(--color-muted-text)] shadow-[var(--shadow-soft)]">
                  Last read: Ayah {currentLastRead.ayahNumber}
                  <Button
                    ref={resumeTargetRef}
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => {
                      const target = document.getElementById(`ayah-${currentLastRead.ayahNumber}`);
                      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    Resume
                  </Button>
                </div>
              ) : null}

              <div className="mt-4 space-y-3 rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-accent)_55%)] bg-[linear-gradient(140deg,color-mix(in_oklab,var(--color-surface),white_16%),color-mix(in_oklab,var(--color-highlight),var(--color-surface)_95%))] p-3 shadow-[var(--shadow-soft)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-text)]">
                      Audio Control
                    </p>
                    <p className="mt-1 font-display text-xl text-[var(--color-heading)]">
                      {activeReciterName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={settings.audioPreference === 'ar' ? 'default' : 'outline'}
                      onClick={() => setAudioPreference('ar')}
                    >
                      Arabic + English
                    </Button>
                    <Button
                      size="sm"
                      variant={settings.audioPreference === 'tr' ? 'default' : 'outline'}
                      onClick={() => setAudioPreference('tr')}
                    >
                      Arabic + Urdu
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-surface-2),white_12%),color-mix(in_oklab,var(--color-accent),var(--color-surface-2)_96%))] p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant={isDownloadAudioSelectorOpen ? 'default' : 'outline'}
                      onClick={() => setIsDownloadAudioSelectorOpen((currentOpen) => !currentOpen)}
                      aria-label="Toggle audio download selector"
                      className="size-8"
                    >
                      <Download className="size-3.5" />
                    </Button>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                      Download Audio
                    </p>
                  </div>

                  {isDownloadAudioSelectorOpen ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="relative w-full sm:w-auto sm:min-w-[13rem]">
                        <select
                          className="app-select h-9 w-full appearance-none rounded-xl px-2.5 pr-8 text-sm"
                          value={downloadAudioSelection}
                          onChange={(event) =>
                            setDownloadAudioSelection(event.target.value as 'ar' | 'tr')
                          }
                          aria-label="Select audio download type"
                        >
                          <option value="ar">Arabic Audio</option>
                          <option value="tr">Arabic + Urdu Audio</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-muted-text)]" />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void downloadSurahAudio(downloadAudioSelection)}
                        disabled={isSelectedDownloadDisabled}
                        className="border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[color-mix(in_oklab,var(--color-surface),white_16%)]"
                      >
                        <Download className="size-4" />
                        {isSelectedDownloadBusy
                          ? 'Downloading...'
                          : `Download ${selectedDownloadLabel}`}
                      </Button>
                    </div>
                  ) : null}

                  {downloadError ? (
                    <p className="mt-2 text-xs text-[var(--color-danger)]">{downloadError}</p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-surface-2),white_10%),color-mix(in_oklab,var(--color-highlight),var(--color-surface-2)_96%))] p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <WifiOff className="size-4 text-[var(--color-info)]" />
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                          Offline Reading
                        </p>
                        <p className="text-xs text-[var(--color-muted-text)]">
                          {isOfflineReady
                            ? 'This surah is available offline (text + audio).'
                            : 'Save text and audio to read without internet.'}
                        </p>
                      </div>
                    </div>
                    {isOfflineReady ? (
                      <Badge className="bg-[color-mix(in_oklab,var(--color-info),var(--color-surface)_82%)] text-[var(--color-heading)]">
                        Offline Ready
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={isOfflineReady ? 'outline' : 'default'}
                      disabled={offlineDownloading || !surahDetail || !surahMeta}
                      onClick={() => void saveSurahForOffline()}
                    >
                      <Download className="size-4" />
                      {offlineDownloading
                        ? `Saving... ${offlineDownloadProgress}%`
                        : isOfflineReady
                          ? 'Update Offline Copy'
                          : 'Download for Offline'}
                    </Button>
                    {isOfflineReady ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={offlineDownloading}
                        onClick={() => void clearOfflineSurah()}
                      >
                        Remove Offline Copy
                      </Button>
                    ) : null}
                  </div>

                  {offlineDownloadError ? (
                    <p className="mt-2 text-xs text-[var(--color-danger)]">{offlineDownloadError}</p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-surface-2),white_10%),color-mix(in_oklab,var(--color-highlight),var(--color-surface-2)_96%))] p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant={isAbRepeatPanelOpen ? 'default' : 'outline'}
                        onClick={() => setIsAbRepeatPanelOpen((currentOpen) => !currentOpen)}
                        aria-label="Toggle A-B repeat controls"
                        className="size-8"
                      >
                        <Repeat className={`size-3.5 ${abRepeatEnabled ? 'animate-spin' : ''}`} />
                      </Button>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                        A-B Repeat
                      </p>
                    </div>
                    {abRepeatEnabled ? (
                      <Badge variant="secondary" className="px-2 py-0.5 tracking-normal">
                        {abRepeatCycle}/{abRepeatCount}
                      </Badge>
                    ) : null}
                  </div>

                  {isAbRepeatPanelOpen ? (
                    <>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_60%)] bg-[color-mix(in_oklab,var(--color-surface),white_16%)] p-2">
                        <p className="text-xs text-[var(--color-muted-text)]">
                          {`Ayah ${abRepeatStartAyah ?? abStartAyah} to Ayah ${abRepeatEndAyah ?? abEndAyah}${abRepeatSource === 'approx' ? ' (approx timing)' : ''}`}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant={abRepeatEnabled ? 'default' : 'outline'}
                          onClick={() => void toggleAbRepeat()}
                          className={abRepeatEnabled ? 'shadow-[var(--shadow-soft)]' : ''}
                        >
                          <Repeat className={`size-4 ${abRepeatEnabled ? 'animate-spin' : ''}`} />
                          {abRepeatEnabled ? 'Stop Loop' : 'Start Loop'}
                        </Button>
                      </div>

                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        <div>
                          <label htmlFor="ab-start-ayah" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-text)]">
                            A Ayah
                          </label>
                          <select
                            id="ab-start-ayah"
                            className="app-select h-9 w-full appearance-none rounded-xl px-2.5 text-sm"
                            value={abStartAyah}
                            onChange={(event) =>
                              handleAbStartAyahChange(Number(event.target.value))
                            }
                          >
                            {ayahOptionValues.map((ayahNo) => (
                              <option key={`ab-start-${ayahNo}`} value={ayahNo}>
                                Ayah {ayahNo}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label htmlFor="ab-end-ayah" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-text)]">
                            B Ayah
                          </label>
                          <select
                            id="ab-end-ayah"
                            className="app-select h-9 w-full appearance-none rounded-xl px-2.5 text-sm"
                            value={abEndAyah}
                            onChange={(event) =>
                              handleAbEndAyahChange(Number(event.target.value))
                            }
                          >
                            {ayahOptionValues.map((ayahNo) => (
                              <option key={`ab-end-${ayahNo}`} value={ayahNo}>
                                Ayah {ayahNo}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label htmlFor="ab-repeat-count" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-text)]">
                            Repeat Count
                          </label>
                          <select
                            id="ab-repeat-count"
                            className="app-select h-9 w-full appearance-none rounded-xl px-2.5 text-sm"
                            value={abRepeatCount}
                            onChange={(event) =>
                              handleAbRepeatCountChange(Number(event.target.value))
                            }
                          >
                            {repeatCountOptions.map((count) => (
                              <option key={`ab-repeat-${count}`} value={count}>
                                {count}x
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-[var(--color-muted-text)]">
                      Click the Repeat icon to open the controls.
                    </p>
                  )}

                  {abRepeatError ? (
                    <p className="mt-1 text-xs text-[var(--color-danger)]">{abRepeatError}</p>
                  ) : null}
                </div>

              </div>
            </CardHeader>
          </Card>

          <Card className="z-20 animate-fade-up-delay-1 overflow-hidden border-[color-mix(in_oklab,var(--color-accent),var(--color-accent)_55%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-surface),white_14%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_90%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%))] shadow-[var(--shadow-card)] backdrop-blur">
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
            {!showWordByWord ? (
              <p className="px-4 pb-3 pt-2 text-xs text-[var(--color-muted-text)]">
                Word-by-word mode will be enabled when tokenized ayah data is available.
              </p>
            ) : null}
          </Card>

          {settings.readingMode === 'continuous' ? (
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
                <p className="arabic-font arabic-mushaf text-[var(--color-heading)]">
                  {filteredAyahs.map(({ ayah }, index) => {
                    const isActive =
                      isPlaying && activeAudioAyahNumber === ayah.numberInSurah;

                    return (
                      <span key={ayah.number}>
                        <span
                          id={`ayah-${ayah.numberInSurah}`}
                          className={`ayah-phrase ${isActive ? 'is-active' : ''}`.trim()}
                        >
                          {ayah.text}
                        </span>
                        <AyahEndMarker number={ayah.numberInSurah} />
                        {index === filteredAyahs.length - 1 ? '' : ' '}
                      </span>
                    );
                  })}
                </p>
              </CardContent>
            </Card>
          ) : (
            <section className="space-y-3" aria-label="Ayah list">
              {filteredAyahs.map(({ ayah, translation }) => {
                const bookmarked = isBookmarked(surahId, ayah.numberInSurah);
                const isLastRead = currentLastRead?.ayahNumber === ayah.numberInSurah;
                const isCurrentTafseerAyah =
                  tafseerOpen && tafseerAyahNumber === ayah.numberInSurah;
                const isAudioActiveAyah =
                  isPlaying && activeAudioAyahNumber === ayah.numberInSurah;
                const isUrduTranslation = settings.audioPreference === 'tr';
                const ayahHighlightClass = isAudioActiveAyah
                  ? 'ring-2 ring-[color-mix(in_oklab,var(--color-accent),var(--color-accent)_45%)] shadow-[var(--shadow-soft)]'
                  : isLastRead
                    ? 'ring-2 ring-[var(--color-accent)]/20'
                    : '';

                return (
                  <Card
                    id={`ayah-${ayah.numberInSurah}`}
                    key={ayah.number}
                    className={`border-[color-mix(in_oklab,var(--color-accent),var(--color-accent)_52%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-surface),white_10%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_96%))] ${ayahHighlightClass}`}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge
                          variant="secondary"
                          className="border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_52%)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-accent),white_76%),color-mix(in_oklab,var(--color-accent-soft),white_82%))] text-[color-mix(in_oklab,var(--color-heading),var(--color-accent)_34%)] dark:bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-accent),black_20%),color-mix(in_oklab,var(--color-accent-soft),black_14%))] dark:text-[var(--color-accent-foreground)]"
                        >
                          <Hash className="mr-1 size-3.5" />
                          Ayah {ayah.numberInSurah}
                        </Badge>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant={bookmarked ? 'default' : 'outline'}
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
                            className="size-9"
                          >
                            {bookmarked ? (
                              <BookmarkCheck className="size-4" />
                            ) : (
                              <Bookmark className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant={isLastRead ? 'default' : 'ghost'}
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
                            className="size-9"
                          >
                            <BookCheck className="size-4" />
                          </Button>
                          <Button
                            variant={isCurrentTafseerAyah ? 'default' : 'outline'}
                            size="icon"
                            title="Open Urdu tafseer"
                            aria-label="Open Urdu tafseer"
                            onClick={() => openTafseer(ayah.numberInSurah, ayah.text)}
                            className="size-9"
                          >
                            <BookOpen className="size-4" />
                          </Button>
                        </div>
                      </div>

                      <p
                        className={`arabic-font arabic-reading mt-4 text-[var(--color-heading)] ${isAudioActiveAyah ? 'rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_92%)] px-3 py-2 shadow-[var(--shadow-glow)]' : ''}`}
                      >
                        <HighlightText text={ayah.text} query={highlightQuery} />
                        <AyahEndMarker number={ayah.numberInSurah} />
                      </p>

                      {translation ? (
                        <p
                          className={`mt-3 text-sm leading-relaxed text-[var(--color-muted-text)] ${isUrduTranslation ? 'urdu-font text-right text-[1.06rem]' : ''} ${isAudioActiveAyah ? 'rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_92%)] px-3 py-2 text-[var(--color-heading)] shadow-[var(--shadow-glow)]' : ''}`}
                          dir={isUrduTranslation ? 'rtl' : 'ltr'}
                        >
                          <HighlightText text={translation} query={highlightQuery} />
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}

              {filteredAyahs.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-[var(--color-muted-text)]">
                    No ayah matched your search query.
                  </CardContent>
                </Card>
              ) : null}
            </section>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-[5rem] xl:self-start">
          <Card className="animate-fade-up border-[color-mix(in_oklab,var(--color-accent),var(--color-accent)_52%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-surface),white_14%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_92%))]">
            <CardHeader>
              <CardTitle className="text-xl">Bookmarks</CardTitle>
              <CardDescription>
                {surahBookmarks.length} saved ayah{surahBookmarks.length === 1 ? '' : 's'} in this surah
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {surahBookmarks.length > 0 ? (
                surahBookmarks.map((bookmark) => (
                  <Link
                    key={bookmark.id}
                    href={`#ayah-${bookmark.ayahNumber}`}
                    className="block rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_65%)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-surface-2),white_8%),color-mix(in_oklab,var(--color-accent),var(--color-surface-2)_94%))] px-3 py-2 text-sm text-[var(--color-text)] transition hover:border-[var(--color-accent-soft)]"
                  >
                    Ayah {bookmark.ayahNumber}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-[var(--color-muted-text)]">
                  No bookmarks yet. Save ayahs for quick revisit.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="animate-fade-up-delay-1 border-[color-mix(in_oklab,var(--color-accent),var(--color-accent)_52%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-surface),white_12%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_93%))]">
            <CardHeader>
              <CardTitle className="text-xl">Word-by-word</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--color-muted-text)]">
              Structured placeholder is ready. Once token-level data is available, each
              word can show translation and transliteration here.
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="fixed bottom-2 left-1/2 z-[70] w-[min(46rem,calc(100vw-0.75rem))] -translate-x-1/2">
        <div className="rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_50%)] bg-[linear-gradient(150deg,color-mix(in_oklab,var(--color-surface),white_12%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_90%))] p-2 shadow-[var(--shadow-card)] backdrop-blur-xl sm:p-2.5">
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-medium text-[var(--color-muted-text)] sm:text-[11px]">
            <span className="truncate">
              {isPlaying && activeAudioAyahNumber
                ? `Now Playing Ayah ${activeAudioAyahNumber}`
                : activeReciterName}
            </span>
            <span className="whitespace-nowrap">
              {formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration)}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={audioDuration > 0 ? audioDuration : 1}
            step={0.1}
            value={
              audioDuration > 0
                ? clampRange(audioCurrentTime, 0, audioDuration)
                : 0
            }
            onChange={(event) => handleSeekChange(Number(event.target.value))}
            onInput={(event) =>
              handleSeekChange(Number((event.target as HTMLInputElement).value))
            }
            className="app-range h-1.5 cursor-pointer"
            aria-label="Audio seek"
          />

          <div className="mt-2 flex items-center gap-1.5">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handlePreviousAudioStep}
              aria-label="Previous 10 seconds"
              className="size-8 rounded-xl border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[color-mix(in_oklab,var(--color-surface),white_18%)]"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              className="size-9 rounded-xl shadow-[var(--shadow-soft)]"
              onClick={toggleAudioPlay}
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            >
              {isPlaying ? (
                <Pause className="size-4" />
              ) : isPlayPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleNextAudioStep}
              aria-label="Next 10 seconds"
              className="size-8 rounded-xl border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[color-mix(in_oklab,var(--color-surface),white_18%)]"
            >
              <ChevronRight className="size-4" />
            </Button>

            <div className="ml-auto min-w-0">
              {settings.audioPreference === 'ar' && audioReciters.length > 0 ? (
                <div className="relative w-[9.8rem] max-w-full sm:w-[12rem]">
                  <select
                    id="reader-reciter-top"
                    className="app-select h-8 w-full appearance-none rounded-xl px-2.5 pr-8 text-[11px] font-medium"
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
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-muted-text)]" />
                </div>
              ) : (
                <p className="truncate text-[10px] text-[var(--color-muted-text)] sm:text-[11px]">
                  {settings.audioPreference === 'tr' ? 'Urdu mode' : 'Voice unavailable'}
                </p>
              )}
            </div>
          </div>

          {(loadingAudioSource || audioSourceError) ? (
            <p className={`mt-1 text-[10px] sm:text-[11px] ${audioSourceError ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted-text)]'}`}>
              {audioSourceError || 'Loading audio source...'}
            </p>
          ) : null}
        </div>
      </div>
      <SmartAyahScrollNav
        ayahNumbers={filteredAyahNumbers}
        activeAudioAyahNumber={activeAudioAyahNumber}
        isPlaying={isPlaying}
        hasAudioPlayer
      />
      <QuranSettingsPanel variant="floating" />
      <StickyNavigatorMenuButton
        targetRef={navigatorMenuButtonRef}
        isNavigatorOpen={isNavigatorOpen}
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

      {tafseerOpen ? (
        <div className="fixed inset-0 z-[90]">
          <button
            type="button"
            className="absolute inset-0 bg-black/58 backdrop-blur-[2px]"
            onClick={() => setTafseerOpen(false)}
            aria-label="Close tafseer panel"
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-2xl animate-fade-up border-l border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[linear-gradient(160deg,color-mix(in_oklab,var(--color-surface),white_14%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_95%))] shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] p-4 sm:p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-text)]">
                    Urdu Tafseer
                  </p>
                  <h3 className="mt-1 font-display text-2xl text-[var(--color-heading)]">
                    Ayah {tafseerAyahNumber ?? '-'}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--color-muted-text)]">
                    {tafseerData?.sourceName ?? 'Loading source...'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTafseerOpen(false)}
                  aria-label="Close panel"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                <Card className="border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_52%)] bg-[linear-gradient(140deg,color-mix(in_oklab,var(--color-surface),white_14%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_93%))] shadow-[var(--shadow-soft)]">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color-mix(in_oklab,var(--color-muted-text),#f3d690_38%)]">
                      Arabic Ayah
                    </p>
                    <p className="arabic-font text-right text-[color-mix(in_oklab,#f7e1ad,var(--color-heading)_58%)]">
                      {tafseerAyahText}
                    </p>
                  </CardContent>
                </Card>

                {tafseerLoading ? (
                  <Card className="border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[color-mix(in_oklab,var(--color-surface),white_14%)]">
                    <CardContent className="p-5 text-sm text-[var(--color-muted-text)]">
                      Tafseer is Loading...
                    </CardContent>
                  </Card>
                ) : null}

                {tafseerError ? (
                  <Card className="border-[color-mix(in_oklab,var(--color-danger),var(--color-border)_65%)] bg-[color-mix(in_oklab,var(--color-surface),white_10%)]">
                    <CardContent className="p-5 text-sm text-[var(--color-danger)]">
                      {tafseerError}
                    </CardContent>
                  </Card>
                ) : null}

                {tafseerData ? (
                  <Card className="border-[color-mix(in_oklab,var(--color-accent),var(--color-accent)_48%)] bg-[linear-gradient(155deg,color-mix(in_oklab,var(--color-surface),white_10%),color-mix(in_oklab,var(--color-surface-2),white_4%))] shadow-[var(--shadow-soft)]">
                    <CardContent className="p-5 sm:p-6">
                      <div
                        className="tafseer-rich urdu-font text-right leading-relaxed text-[var(--color-text)]"
                        dir="rtl"
                        dangerouslySetInnerHTML={{
                          __html: formattedTafsirHtml,
                        }}
                      />
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
