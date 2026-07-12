'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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

const POPULAR_SURAHS = [
  { label: 'Al-Fatihah', arabic: 'الفاتحة', id: 1 },
  { label: 'Ya-Sin', arabic: 'يس', id: 36 },
  { label: 'Al-Kahf', arabic: 'الكهف', id: 18 },
  { label: 'Ar-Rahman', arabic: 'الرحمن', id: 55 },
  { label: 'Al-Mulk', arabic: 'الملك', id: 67 },
  { label: 'Al-Waqiah', arabic: 'الواقعة', id: 56 },
];
const ALL_SURAHS = getAllSurahs();

export default function HomeRoot() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<number[]>([]);
  const [bookmarks, setBookmarks] = useState<AyahBookmark[]>([]);
  const [lastRead, setLastRead] = useState<LastReadEntry | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [surahSearch, setSurahSearch] = useState('');

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
  const firstFavoriteId = favorites[0];
  const latestBookmark = bookmarks[0];

  return (
    <main className="pb-20 pt-5 sm:pt-9">
      <HomeFeatureTour />

      <section data-slot="page-shell" aria-labelledby="home-heading">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-accent),var(--color-surface)_92%),var(--color-surface)_58%,var(--color-surface-elevated))] px-5 py-6 shadow-[var(--shadow-card)] sm:overflow-visible sm:px-8 sm:py-9 lg:px-12 lg:py-11">
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
              Read. Understand. Reflect.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--color-muted-text)] sm:text-base">
              Read the Quran with translation and tafseer, and return to your last ayah without losing your place.
            </p>
          </div>

          <div className="relative z-30 mt-6 max-w-2xl" role="search" id="home-tour-search">
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

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
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

        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
          {POPULAR_SURAHS.map((surah) => (
            <Link
              key={surah.id}
              href={resolveSurahPath(surah.id)}
              prefetch={false}
              className="group min-w-[9.5rem] snap-start rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-soft)] hover:border-[var(--color-accent-soft)] sm:min-w-0"
            >
              <span className="font-arabic block text-right text-2xl leading-relaxed text-[var(--color-accent)]" dir="rtl">{surah.arabic}</span>
              <span className="mt-3 block text-sm font-semibold text-[var(--color-heading)]">{surah.label}</span>
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
          <Link
            href={firstFavoriteId ? resolveSurahPath(firstFavoriteId) : '/surah'}
            prefetch={false}
            className="group flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-soft)] hover:border-[var(--color-accent-soft)]"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--color-highlight),var(--color-surface)_88%)] text-[var(--color-highlight)]"><Heart className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-[var(--color-heading)]">Favorite Surahs</span>
              <span className="block text-sm text-[var(--color-muted-text)]">{isLoaded ? `${favorites.length} saved` : 'Loading…'}</span>
            </span>
            <ChevronRight className="size-5 text-[var(--color-muted-text)] transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href={latestBookmark ? `${resolveSurahPath(latestBookmark.surahId)}#ayah-${latestBookmark.ayahNumber}` : '/surah'}
            prefetch={false}
            className="group flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-soft)] hover:border-[var(--color-accent-soft)]"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)] text-[var(--color-accent)]"><BookMarked className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-[var(--color-heading)]">Bookmarks</span>
              <span className="block text-sm text-[var(--color-muted-text)]">{isLoaded ? `${bookmarks.length} saved ayahs` : 'Loading…'}</span>
            </span>
            <ChevronRight className="size-5 text-[var(--color-muted-text)] transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

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
    </main>
  );
}
