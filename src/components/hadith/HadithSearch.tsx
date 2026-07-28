'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { ArrowUpRight, BookOpen, Loader2, Search, X } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

import { buildHadithSearchPath } from '@/lib/hadith/hadith-routing';

interface HadithSuggestion {
  id: number;
  hadithNumber: string;
  bookName: string;
  bookSlug: string;
  chapterName: string;
  status: string;
  englishNarrator: string;
  hadithEnglish: string;
  hadithUrdu: string;
  href: string;
}

function cleanText(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSuggestionExcerpt(suggestion: HadithSuggestion, query: string) {
  const hasArabicScript = /[\u0600-\u06FF]/.test(query);
  const preferred = hasArabicScript ? suggestion.hadithUrdu : suggestion.hadithEnglish;
  return cleanText(preferred || suggestion.hadithEnglish || suggestion.hadithUrdu);
}

function isHadithNumberQuery(value: string) {
  return /^#?\d+$/.test(value.trim());
}

export default function HadithSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const [isPending, startTransition] = useTransition();

  const currentQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(currentQuery);
  const [suggestions, setSuggestions] = useState<HadithSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const normalizedQuery = query.trim();
  const canSearch = normalizedQuery.length > 0;
  const canSuggest = normalizedQuery.length >= 2 || isHadithNumberQuery(normalizedQuery);
  const canShowDropdown = isOpen && canSuggest;

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedQuery]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const navigateToSearch = useCallback(
    (term: string) => {
      const params = new URLSearchParams();
      const trimmed = term.trim();

      if (trimmed) {
        params.set('q', trimmed);
      }

      startTransition(() => {
        router.push(`${buildHadithSearchPath()}?${params.toString()}`);
      });
    },
    [router]
  );

  const fetchSuggestions = useDebouncedCallback(async (term: string) => {
    const trimmed = term.trim();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (trimmed.length < 2 && !isHadithNumberQuery(trimmed)) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    setSuggestionsLoading(true);
    try {
      const response = await fetch(`/api/hadith/search?q=${encodeURIComponent(trimmed)}`, {
        cache: 'no-store',
      });
      const payload = (await response.json()) as { results?: HadithSuggestion[] };

      if (requestIdRef.current === requestId) {
        setSuggestions(payload.results ?? []);
        setIsOpen(true);
      }
    } catch {
      if (requestIdRef.current === requestId) {
        setSuggestions([]);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setSuggestionsLoading(false);
      }
    }
  }, 350);

  useEffect(() => () => fetchSuggestions.cancel(), [fetchSuggestions]);

  const activeSuggestion = useMemo(
    () => suggestions[activeIndex] ?? suggestions[0] ?? null,
    [activeIndex, suggestions]
  );

  const selectSuggestion = (suggestion: HadithSuggestion) => {
    setIsOpen(false);
    setQuery(`${suggestion.bookName} ${suggestion.hadithNumber}`);
    router.push(suggestion.href);
  };

  const submitSearch = () => {
    if (!canSearch) {
      return;
    }

    setIsOpen(false);
    navigateToSearch(normalizedQuery);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearch();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (suggestions.length === 0) {
        return;
      }

      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) =>
        event.key === 'ArrowDown'
          ? (current + 1) % suggestions.length
          : (current - 1 + suggestions.length) % suggestions.length
      );
      return;
    }

    if (event.key === 'Enter' && canShowDropdown && activeSuggestion) {
      event.preventDefault();
      selectSuggestion(activeSuggestion);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <label htmlFor="hadith-search" className="sr-only">
          Search Hadiths
        </label>
        <span className="pointer-events-none absolute inset-y-0 left-0 z-10 grid w-11 place-items-center text-[var(--color-muted-text)]">
          <Search className="size-4" aria-hidden="true" />
        </span>
        <input
          id="hadith-search"
          name="q"
          type="text"
          inputMode="search"
          placeholder="Search hadiths in English or Urdu..."
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setIsOpen(true);
            void fetchSuggestions(nextQuery);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (canSuggest) {
              void fetchSuggestions(query);
            }
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={canShowDropdown}
          aria-controls="hadith-search-suggestions"
          aria-activedescendant={
            canShowDropdown && activeSuggestion
              ? `hadith-search-option-${activeSuggestion.id}`
              : undefined
          }
          className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-11 pr-24 text-sm text-[var(--color-text)] shadow-[var(--shadow-soft)] outline-none transition-all focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
          aria-label="Search hadiths"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setIsOpen(false);
            }}
            className="absolute right-20 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-[var(--color-muted-text)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-accent)]"
            aria-label="Clear hadith search"
          >
            <X className="size-4" />
          </button>
        ) : null}
        <div className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2">
          {isPending ? (
            <Loader2 className="size-4 animate-spin text-[var(--color-accent)]" aria-hidden="true" />
          ) : null}
          <button
            type="submit"
            className="rounded-xl bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent-foreground)] transition-opacity hover:opacity-90"
          >
            Search
          </button>
        </div>
      </form>

      {canShowDropdown ? (
        <div
          id="hadith-search-suggestions"
          role="listbox"
          aria-label="Matching hadiths"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[95] overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_55%)] bg-[var(--color-surface-elevated)] p-1.5 shadow-[var(--shadow-card)] backdrop-blur"
        >
          <div className="flex items-center justify-between px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--color-muted-text)]">
            <span>Related Hadiths</span>
            <span>{suggestionsLoading ? 'Searching...' : `${suggestions.length} result${suggestions.length === 1 ? '' : 's'}`}</span>
          </div>

          {suggestionsLoading && suggestions.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-[var(--color-muted-text)]">
              <Loader2 className="size-4 animate-spin text-[var(--color-accent)]" />
              Searching hadiths...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => {
              const excerpt = getSuggestionExcerpt(suggestion, normalizedQuery);

              return (
                <button
                  key={`${suggestion.bookSlug}-${suggestion.hadithNumber}-${suggestion.id}`}
                  id={`hadith-search-option-${suggestion.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectSuggestion(suggestion)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    index === activeIndex
                      ? 'bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)]'
                      : 'hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-accent)]">
                    <BookOpen className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[var(--color-heading)]">
                        {suggestion.bookName} #{suggestion.hadithNumber}
                      </span>
                      <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-muted-text)]">
                        {suggestion.status || 'Hadith'}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[var(--color-muted-text)]">
                      {suggestion.chapterName || suggestion.englishNarrator || 'Hadith narration'}
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--color-muted-text)]">
                      {excerpt}
                    </span>
                  </span>
                  <ArrowUpRight className="mt-2 size-4 shrink-0 text-[var(--color-muted-text)]" />
                </button>
              );
            })
          ) : (
            <div className="px-3 py-4 text-sm text-[var(--color-muted-text)]">
              No hadith matched &ldquo;{normalizedQuery}&rdquo;. Try another keyword.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
