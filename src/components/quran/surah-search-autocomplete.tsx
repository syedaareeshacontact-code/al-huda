'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Hash, Search, X } from 'lucide-react';

import { buildSurahPath } from '@/lib/quran-routing';
import type { SurahIndexEntry } from '@/lib/quran-index';

interface SurahSearchAutocompleteProps {
  surahs: SurahIndexEntry[];
  value: string;
  onValueChange: (value: string) => void;
  id: string;
  placeholder: string;
  inputClassName?: string;
  dropdownClassName?: string;
  showSubmitButton?: boolean;
  submitLabel?: string;
  onSubmit?: (query: string) => void;
  onSurahSelect?: (surah: SurahIndexEntry) => void;
}

function getSearchScore(surah: SurahIndexEntry, query: string) {
  const name = surah.surahName.toLocaleLowerCase();
  const translation = surah.surahNameTranslation.toLocaleLowerCase();
  const arabic = surah.surahNameArabic.toLocaleLowerCase();
  const arabicLong = surah.surahNameArabicLong?.toLocaleLowerCase() ?? '';
  const number = String(surah.id);

  if (number === query || name === query || translation === query || arabic === query) {
    return 0;
  }
  if (name.startsWith(query) || translation.startsWith(query) || arabic.startsWith(query)) {
    return 1;
  }
  if (arabicLong.startsWith(query)) {
    return 2;
  }
  if (name.includes(query) || translation.includes(query) || arabic.includes(query) || arabicLong.includes(query)) {
    return 3;
  }
  if (number.startsWith(query)) {
    return 4;
  }

  return Number.POSITIVE_INFINITY;
}

export default function SurahSearchAutocomplete({
  surahs,
  value,
  onValueChange,
  id,
  placeholder,
  inputClassName = '',
  dropdownClassName = '',
  showSubmitButton = false,
  submitLabel = 'Search',
  onSubmit,
  onSurahSelect,
}: SurahSearchAutocompleteProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = value.trim().toLocaleLowerCase();

  const suggestions = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return surahs
      .map((surah) => ({ surah, score: getSearchScore(surah, normalizedQuery) }))
      .filter((item) => Number.isFinite(item.score))
      .sort((left, right) => left.score - right.score || left.surah.id - right.surah.id)
      .slice(0, 8)
      .map((item) => item.surah);
  }, [normalizedQuery, surahs]);

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

  const selectSurah = (surah: SurahIndexEntry) => {
    setIsOpen(false);
    onValueChange(surah.surahName);

    if (onSurahSelect) {
      onSurahSelect(surah);
      return;
    }

    router.push(buildSurahPath(surah.id, surah.surahName));
  };

  const submitSearch = () => {
    const selected = suggestions[activeIndex] ?? suggestions[0];
    if (selected) {
      selectSurah(selected);
      return;
    }

    if (normalizedQuery) {
      setIsOpen(false);
      onSubmit?.(value.trim());
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
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
      setActiveIndex((current) => {
        if (event.key === 'ArrowDown') {
          return (current + 1) % suggestions.length;
        }

        return (current - 1 + suggestions.length) % suggestions.length;
      });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      submitSearch();
    }
  };

  const canShowDropdown = isOpen && normalizedQuery.length > 0;

  return (
    <div ref={rootRef} className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-[var(--color-muted-text)]" />
      <input
        id={id}
        type="text"
        inputMode="search"
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={canShowDropdown}
        aria-controls={`${id}-suggestions`}
        aria-activedescendant={
          canShowDropdown && suggestions[activeIndex]
            ? `${id}-option-${suggestions[activeIndex].id}`
            : undefined
        }
        className={inputClassName}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onValueChange('');
            setIsOpen(false);
          }}
          className={`absolute top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-[var(--color-muted-text)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-accent)] ${
            showSubmitButton ? 'right-24' : 'right-3'
          }`}
          aria-label="Clear Surah search"
        >
          <X className="size-4" />
        </button>
      ) : null}
      {showSubmitButton ? (
        <button
          type="button"
          onClick={submitSearch}
          className="absolute right-2 top-2 z-10 h-10 rounded-xl bg-[var(--color-heading)] px-4 text-sm font-semibold text-[var(--color-bg)] transition-opacity hover:opacity-85"
        >
          {submitLabel}
        </button>
      ) : null}

      {canShowDropdown ? (
        <div
          id={`${id}-suggestions`}
          role="listbox"
          aria-label="Matching Surahs"
          className={`absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_55%)] bg-[var(--color-surface-elevated)] p-1.5 shadow-[var(--shadow-card)] backdrop-blur ${dropdownClassName}`}
        >
          {suggestions.length > 0 ? (
            <>
              <div className="flex items-center justify-between px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--color-muted-text)]">
                <span>Matching Surahs</span>
                <span>{suggestions.length} result{suggestions.length === 1 ? '' : 's'}</span>
              </div>
              {suggestions.map((surah, index) => (
                <button
                  key={surah.id}
                  id={`${id}-option-${surah.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectSurah(surah)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    index === activeIndex
                      ? 'bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)]'
                      : 'hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-2)] text-xs font-bold text-[var(--color-accent)]">
                    {surah.id}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--color-heading)]">
                      {surah.surahName}
                    </span>
                    <span className="block truncate text-xs text-[var(--color-muted-text)]">
                      {surah.surahNameTranslation} · {surah.totalAyah} ayahs
                    </span>
                  </span>
                  <span dir="rtl" lang="ar" className="arabic-font shrink-0 text-lg leading-none text-[var(--color-heading)]">
                    {surah.surahNameArabic}
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-[var(--color-muted-text)]" />
                </button>
              ))}
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-[var(--color-muted-text)]">
              <Hash className="size-4 text-[var(--color-accent)]" />
              No Surah matches “{value.trim()}”. Try name, Arabic, meaning, or number.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
