'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  BookOpenText,
  ChevronRight,
  Headphones,
  Heart,
  Languages,
  Settings2,
  Sparkles,
  ScrollText,
  X,
} from 'lucide-react';

import HomeFeatureTour from '@/components/home/home-feature-tour';
import SurahSearchAutocomplete from '@/components/quran/surah-search-autocomplete';
import { AUTH_CHANGED_EVENT } from '@/lib/quran-user-state';
import { getAllSurahs, getSurahById } from '@/lib/quran-index';
import { buildSurahPath } from '@/lib/quran-routing';
import { getClientSession, invalidateClientSession } from '@/lib/client-session';
import type { AyahBookmark, LastReadEntry } from '@/types/quran';

function resolveSurahPath(surahId: number | null | undefined) {
  if (!surahId || !Number.isInteger(surahId)) return '/surah';

  const surah = getSurahById(surahId);
  return surah ? buildSurahPath(surah.id, surah.surahName) : `/surah/${surahId}`;
}

const POPULAR_SURAH_IDS = [1, 36, 18, 55, 67, 56] as const;
const ALL_SURAHS = getAllSurahs();
const POPULAR_SURAHS = POPULAR_SURAH_IDS.map((id) => getSurahById(id)).filter(
  (surah) => surah !== null
);
type LibraryPanel = 'favorites' | 'bookmarks';

export default function HomeRoot() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<number[]>([]);
  const [bookmarks, setBookmarks] = useState<AyahBookmark[]>([]);
  const [lastRead, setLastRead] = useState<LastReadEntry | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [surahSearch, setSurahSearch] = useState('');
  const [activeLibraryPanel, setActiveLibraryPanel] = useState<LibraryPanel | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadQuranState = async () => {
      try {
        const sessionPayload = (await getClientSession()) as {
          user?: { id?: string | null } | null;
        };
        if (!sessionPayload.user?.id) throw new Error('Signed out');

        const quranStateResponse = await fetch('/api/auth/quran-state', { cache: 'no-store' });
        if (!quranStateResponse.ok) throw new Error('Quran state unavailable');

        const quranStatePayload = (await quranStateResponse.json()) as {
          favoriteSurahIds?: number[];
          bookmarkedAyahs?: AyahBookmark[];
          lastRead?: LastReadEntry | null;
        };

        if (!ignore) {
          setFavorites(quranStatePayload.favoriteSurahIds ?? []);
          setBookmarks(quranStatePayload.bookmarkedAyahs ?? []);
          setLastRead(quranStatePayload.lastRead ?? null);
        }
      } catch {
        if (!ignore) {
          setFavorites([]);
          setBookmarks([]);
          setLastRead(null);
        }
      } finally {
        if (!ignore) setIsLoaded(true);
      }
    };

    void loadQuranState();
    const onAuthChanged = () => {
      invalidateClientSession();
      void loadQuranState();
    };
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);

    return () => {
      ignore = true;
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    };
  }, []);

  const hasLastRead = Boolean(lastRead?.surahId && lastRead?.ayahNumber);
  const lastReadSurah = lastRead ? getSurahById(lastRead.surahId) : null;
  const lastReadPath = hasLastRead
    ? `${resolveSurahPath(lastRead?.surahId)}#ayah-${lastRead?.ayahNumber}`
    : '/surah';
  const favoriteSurahs = useMemo(
    () =>
      favorites
        .map((surahId) => getSurahById(surahId))
        .filter((surah) => surah !== null),
    [favorites]
  );
  const bookmarkItems = useMemo(
    () =>
      bookmarks.map((bookmark) => ({
        bookmark,
        surah: getSurahById(bookmark.surahId),
        href: `${resolveSurahPath(bookmark.surahId)}#ayah-${bookmark.ayahNumber}`,
      })),
    [bookmarks]
  );
  const activeLibraryCount =
    activeLibraryPanel === 'favorites'
      ? favoriteSurahs.length
      : activeLibraryPanel === 'bookmarks'
        ? bookmarkItems.length
        : 0;

  useEffect(() => {
    if (!activeLibraryPanel) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveLibraryPanel(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeLibraryPanel]);

  const openLibraryPanel = (panel: LibraryPanel) => {
    if (!isLoaded) {
      return;
    }

    const hasItems =
      panel === 'favorites' ? favoriteSurahs.length > 0 : bookmarkItems.length > 0;

    if (!hasItems) {
      router.push('/surah');
      return;
    }

    setActiveLibraryPanel(panel);
  };

  return (
    <div className="pb-20 pt-5 sm:pt-9">
      <HomeFeatureTour />

      <section className="relative z-20" data-slot="page-shell" aria-labelledby="home-heading">
        <div className="relative overflow-visible rounded-[1.75rem] border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-accent),var(--color-surface)_92%),var(--color-surface)_58%,var(--color-surface-elevated))] px-5 py-6 shadow-[var(--shadow-card)] sm:px-8 sm:py-9 lg:px-12 lg:py-11">
          <div className="pointer-events-none absolute -right-14 -top-20 hidden size-64 rounded-full border border-[color-mix(in_oklab,var(--color-accent),transparent_82%)] opacity-60 sm:block" />
          <div className="pointer-events-none absolute -right-4 -top-10 hidden size-40 rounded-full border border-[color-mix(in_oklab,var(--color-accent),transparent_78%)] opacity-40 sm:block" />

          <div className="relative max-w-3xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent-soft)]">
              Your Quran companion
            </p>
            <p className="font-arabic text-right text-2xl leading-loose text-[var(--color-heading)] sm:text-3xl" dir="rtl">
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
            </p>
            <h1 id="home-heading" className="mt-1 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-[var(--color-heading)] sm:text-5xl lg:text-6xl">
              Read. Understand. Reflect
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--color-muted-text)] sm:text-base">
              Read the Quran with translation and tafseer, and return to your last ayah without losing your place.
            </p>
          </div>

          <div className="relative z-[90] mt-6 max-w-2xl" role="search" id="home-tour-search">
            <label htmlFor="home-quran-search" className="sr-only">Search the Quran by Surah name or number</label>
            <SurahSearchAutocomplete
              surahs={ALL_SURAHS}
              id="home-quran-search"
              value={surahSearch}
              onValueChange={setSurahSearch}
              placeholder="Search a Surah..."
              inputClassName="h-14 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] pl-12 pr-24 text-sm text-[var(--color-text)] shadow-[var(--shadow-soft)] outline-none placeholder:text-[var(--color-muted-text)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--color-accent),transparent_75%)] sm:pr-28 sm:text-base"
              showSubmitButton
              onSubmit={(query) => router.push(`/surah?search=${encodeURIComponent(query)}`)}
            />
          </div>
        </div>
      </section>

      <section className="mt-4 sm:mt-5" data-slot="page-shell" aria-label="Main Quran actions">
        <div className="grid gap-3 lg:grid-cols-[1.35fr_0.65fr] lg:gap-4">
          <Link
            id="home-tour-primary-cta"
            href={lastReadPath}
            prefetch={false}
            className="group relative flex min-h-40 overflow-hidden rounded-[1.6rem] bg-[linear-gradient(135deg,#8c6a08,var(--color-accent-soft))] p-5 text-[var(--color-accent-foreground)] shadow-[0_22px_45px_-25px_color-mix(in_oklab,var(--color-accent),black_25%)] sm:min-h-48 sm:p-7"
          >
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] opacity-80">
                  <BookOpenText className="size-4" />
                  {hasLastRead ? 'Continue reading' : 'Begin your reading'}
                </span>
                <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                  {hasLastRead && lastReadSurah ? lastReadSurah.surahName : 'Open the Holy Quran'}
                </h2>
                <p className="mt-1 text-sm opacity-80">
                  {hasLastRead
                    ? `Surah ${lastRead?.surahId} · Ayah ${lastRead?.ayahNumber}`
                    : 'Choose from all 114 Surahs'}
                </p>
              </div>
              <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                {hasLastRead ? 'Resume now' : 'Start reading'}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
            <BookOpen className="absolute -bottom-6 -right-5 size-36 rotate-[-8deg] opacity-15 sm:size-44" strokeWidth={1.2} />
          </Link>

          <div className="grid grid-cols-2 gap-3 pt-2 lg:grid-cols-1 lg:pt-0">
            <Link
              id="home-tour-read-online"
              href="/surah"
              prefetch={false}
              className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-[1.4rem] border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_68%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-accent),var(--color-surface-elevated)_92%),var(--color-surface-elevated)_58%)] p-4 shadow-[var(--shadow-soft)] hover:border-[var(--color-accent-soft)] sm:p-5 lg:min-h-0 lg:flex-row lg:items-center"
            >
              <span className="relative z-10">
                <span className="flex size-11 items-center justify-center rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),transparent_68%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_80%)] text-[var(--color-accent-soft)] shadow-sm">
                  <BookOpenText className="size-5" strokeWidth={2} />
                </span>
                <span className="mt-4 block font-semibold text-[var(--color-heading)] lg:mt-2">Read Quran</span>
                <span className="mt-0.5 hidden text-xs text-[var(--color-muted-text)] sm:block">All 114 Surahs</span>
              </span>
              <span className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-text)] lg:static lg:shrink-0">
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            <Link
              href="/tafsir"
              prefetch={false}
              className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-[1.4rem] border border-[color-mix(in_oklab,var(--color-highlight),var(--color-border)_72%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-highlight),var(--color-surface-elevated)_93%),var(--color-surface-elevated)_58%)] p-4 shadow-[var(--shadow-soft)] hover:border-[var(--color-accent-soft)] sm:p-5 lg:min-h-0 lg:flex-row lg:items-center"
            >
              <span className="relative z-10">
                <span className="flex size-11 items-center justify-center rounded-2xl border border-[color-mix(in_oklab,var(--color-highlight),transparent_68%)] bg-[color-mix(in_oklab,var(--color-highlight),var(--color-surface)_82%)] text-[color-mix(in_oklab,var(--color-highlight),var(--color-heading)_30%)] shadow-sm">
                  <ScrollText className="size-5" strokeWidth={2} />
                </span>
                <span className="mt-4 block font-semibold text-[var(--color-heading)] lg:mt-2">Explore Tafseer</span>
                <span className="mt-0.5 hidden text-xs text-[var(--color-muted-text)] sm:block">Understand each Ayah</span>
              </span>
              <span className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-text)] lg:static lg:shrink-0">
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10 sm:mt-14" data-slot="page-shell" aria-labelledby="popular-surahs-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">Quick access</p>
            <h2 id="popular-surahs-heading" className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)]">Popular Surahs</h2>
          </div>
          <Link href="/surah" prefetch={false} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--color-accent-soft)] hover:underline">
            View all <ChevronRight className="size-4" />
          </Link>
        </div>

        <div className="flex snap-x gap-3 overflow-x-auto pb-3 pl-1 pr-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6 [&::-webkit-scrollbar]:hidden">
          {POPULAR_SURAHS.map((surah) => (
            <Link
              key={surah.id}
              href={resolveSurahPath(surah.id)}
              prefetch={false}
              className="group min-w-[9.5rem] snap-start rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-soft)] hover:border-[var(--color-accent-soft)] sm:min-w-0"
            >
              <span className="surah-arabic-name block text-right text-2xl leading-relaxed text-[var(--color-accent)]" dir="rtl" lang="ar">
                {surah.surahNameArabicUthmani || surah.surahNameArabic}
              </span>
              <span className="mt-3 block text-sm font-semibold text-[var(--color-heading)]">{surah.surahName}</span>
              <span className="mt-1 flex items-center justify-between text-xs text-[var(--color-muted-text)]">
                Surah {surah.id}
                <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 sm:mt-14" data-slot="page-shell" aria-labelledby="library-heading">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">Personal space</p>
          <h2 id="library-heading" className="mt-1 font-display text-3xl font-semibold text-[var(--color-heading)]">Your Quran Library</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={!isLoaded}
            onClick={() => openLibraryPanel('favorites')}
            className="group flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-soft)] hover:border-[var(--color-accent-soft)]"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--color-highlight),var(--color-surface)_88%)] text-[var(--color-highlight)]"><Heart className="size-5" /></span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block font-semibold text-[var(--color-heading)]">Favorite Surahs</span>
              <span className="block text-sm text-[var(--color-muted-text)]">{isLoaded ? `${favorites.length} saved` : 'Loading…'}</span>
            </span>
            <ChevronRight className="size-5 text-[var(--color-muted-text)] transition-transform group-hover:translate-x-1" />
          </button>

          <button
            type="button"
            disabled={!isLoaded}
            onClick={() => openLibraryPanel('bookmarks')}
            className="group flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-soft)] hover:border-[var(--color-accent-soft)]"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)] text-[var(--color-accent)]"><BookMarked className="size-5" /></span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block font-semibold text-[var(--color-heading)]">Bookmarks</span>
              <span className="block text-sm text-[var(--color-muted-text)]">{isLoaded ? `${bookmarks.length} saved ayahs` : 'Loading…'}</span>
            </span>
            <ChevronRight className="size-5 text-[var(--color-muted-text)] transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </section>

      {activeLibraryPanel ? (
        <div className="fixed inset-0 z-[130] flex items-end justify-center px-3 pb-3 pt-16 sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setActiveLibraryPanel(null)}
            aria-label="Close Quran library"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="library-panel-heading"
            className="relative flex max-h-[min(82vh,38rem)] w-full max-w-2xl animate-fade-up flex-col overflow-hidden rounded-[1.25rem] border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_55%)] bg-[linear-gradient(155deg,color-mix(in_oklab,var(--color-surface),white_8%),var(--color-surface)_70%,color-mix(in_oklab,var(--color-accent),var(--color-surface)_95%))] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[color-mix(in_oklab,var(--color-border),transparent_18%)] bg-[color-mix(in_oklab,var(--color-surface-2),transparent_38%)] px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  activeLibraryPanel === 'favorites'
                    ? 'bg-[color-mix(in_oklab,var(--color-highlight),var(--color-surface)_86%)] text-[var(--color-highlight)]'
                    : 'bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)] text-[var(--color-accent)]'
                }`}>
                  {activeLibraryPanel === 'favorites' ? (
                    <Heart className="size-4" />
                  ) : (
                    <BookMarked className="size-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
                    {activeLibraryPanel === 'favorites' ? 'Favorite Surahs' : 'Saved Ayahs'}
                  </p>
                  <h3 id="library-panel-heading" className="mt-0.5 truncate font-display text-xl font-semibold text-[var(--color-heading)] sm:text-2xl">
                    {activeLibraryPanel === 'favorites' ? 'Your Favorite Surahs' : 'Your Bookmarks'}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--color-muted-text)]">
                    {activeLibraryCount} {activeLibraryPanel === 'favorites' ? 'saved surahs' : 'saved ayahs'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveLibraryPanel(null)}
                aria-label="Close"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-muted-text)] transition hover:border-[var(--color-accent-soft)] hover:text-[var(--color-heading)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-3">
              {activeLibraryPanel === 'favorites' ? (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {favoriteSurahs.map((surah) => (
                    <Link
                      key={surah.id}
                      href={buildSurahPath(surah.id, surah.surahName)}
                      prefetch={false}
                      onClick={() => setActiveLibraryPanel(null)}
                      className="group rounded-xl border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-elevated),transparent_4%)] px-3 py-2.5 shadow-[var(--shadow-soft)] transition hover:border-[var(--color-accent-soft)] hover:bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_96%)]"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--color-highlight),var(--color-surface)_86%)] text-xs font-bold text-[var(--color-highlight)]">
                          {surah.id}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[var(--color-heading)]">
                            Surah {surah.surahName}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-[var(--color-muted-text)]">
                            {surah.surahNameTranslation} · {surah.totalAyah} ayahs
                          </span>
                          <span className="font-arabic mt-1 block truncate text-right text-base leading-snug text-[var(--color-accent-soft)]" dir="rtl" lang="ar">
                            {surah.surahNameArabic}
                          </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-[var(--color-muted-text)] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {bookmarkItems.map(({ bookmark, surah, href }) => (
                    <Link
                      key={bookmark.id}
                      href={href}
                      prefetch={false}
                      onClick={() => setActiveLibraryPanel(null)}
                      className="group block rounded-xl border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-elevated),transparent_4%)] px-3 py-2.5 shadow-[var(--shadow-soft)] transition hover:border-[var(--color-accent-soft)] hover:bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_96%)]"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)] text-[var(--color-accent)]">
                          <BookMarked className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-xs font-bold uppercase tracking-[0.13em] text-[var(--color-muted-text)]">
                              Surah {bookmark.surahId}:{bookmark.ayahNumber}
                            </span>
                            <span className="truncate text-sm font-semibold text-[var(--color-heading)]">
                              {surah ? surah.surahName : `Surah ${bookmark.surahId}`}
                            </span>
                          </span>
                          {bookmark.text ? (
                            <p
                              className="arabic-font quran-script arabic-reading mt-1 max-h-[5.2rem] overflow-hidden text-[var(--color-heading)]"
                              data-size="sm"
                              dir="rtl"
                              lang="ar"
                            >
                              {bookmark.text}
                            </p>
                          ) : null}
                        </span>
                        <ChevronRight className="mt-1 size-4 shrink-0 text-[var(--color-muted-text)] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      <section className="mt-10 sm:mt-14" data-slot="page-shell" aria-labelledby="study-heading">
        <div className="rounded-[1.6rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]"><Sparkles className="size-4" /> Go beyond recitation</span>
              <h2 id="study-heading" className="mt-2 font-display text-3xl font-semibold text-[var(--color-heading)]">Study every Ayah with Tafseer</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">Open Urdu tafseer alongside the Quran to explore meaning and context, ayah by ayah.</p>
            </div>
            <Link href="/tafsir" prefetch={false} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] px-5 text-sm font-bold !text-[var(--color-accent-foreground)] shadow-[0_14px_30px_-18px_color-mix(in_oklab,var(--color-accent),transparent_25%)] hover:brightness-110">
              Browse Tafseer <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-6 grid gap-2 border-t border-[var(--color-border)] pt-5 sm:grid-cols-3">
            <span className="flex items-center gap-2 text-sm text-[var(--color-muted-text)]"><Languages className="size-4 text-[var(--color-accent)]" /> Urdu translation</span>
            <span className="flex items-center gap-2 text-sm text-[var(--color-muted-text)]"><Headphones className="size-4 text-[var(--color-accent)]" /> Recitation audio</span>
            <Link id="home-tour-quran-settings" href="/surah#quran-settings" prefetch={false} className="flex items-center gap-2 text-sm text-[var(--color-muted-text)] hover:text-[var(--color-heading)]"><Settings2 className="size-4 text-[var(--color-accent)]" /> Reading settings</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
