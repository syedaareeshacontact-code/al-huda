'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  FileText,
  Sun,
  Moon,
  Sparkles,
  Check,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SurahSearchAutocomplete from '@/components/quran/surah-search-autocomplete';
import FilterDrawer from '@/components/ui/filter-drawer';
import StickySearchShell from '@/components/ui/sticky-search-shell';
import { buildSurahPath, buildTafsirPath } from '@/lib/quran-routing';
import type { SurahIndexEntry } from '@/lib/quran-index';

interface SurahWithTafseer extends SurahIndexEntry {
  tafseerAyahs: number[];
  tafseerAyahCount: number;
}

interface TafsirIndexClientProps {
  initialSurahs: SurahWithTafseer[];
  initialSearchQuery?: string;
}

type RevelationFilter = 'all' | 'mecca' | 'madina' | 'popular';
type LengthPreset = 'all' | 'short' | 'medium' | 'long' | 'very-long';
type SortField = 'id' | 'name' | 'ayahs' | 'tafseer-ayahs';
type SortDirection = 'asc' | 'desc';
const PAGE_SIZE = 20;
const POPULAR_SURAH_IDS = [1, 18, 36, 55, 56, 67];

export default function TafsirIndexClient({
  initialSurahs,
  initialSearchQuery = '',
}: TafsirIndexClientProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [revelationFilter, setRevelationFilter] = useState<RevelationFilter>('all');
  const [lengthPreset, setLengthPreset] = useState<LengthPreset>('all');
  const [minAyahs, setMinAyahs] = useState<string>('');
  const [maxAyahs, setMaxAyahs] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [expandedSurah, setExpandedSurah] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const syncSearchFromUrl = () => {
      const query = new URLSearchParams(window.location.search).get('search')?.trim() ?? '';
      setSearchQuery(query);
    };

    syncSearchFromUrl();
    window.addEventListener('popstate', syncSearchFromUrl);
    return () => window.removeEventListener('popstate', syncSearchFromUrl);
  }, []);

  // Filtered and sorted surahs
  const filteredSurahs = useMemo(() => {
    let result = [...initialSurahs].filter((surah) => surah.tafseerAyahCount > 0);

    // Text Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (surah) =>
          surah.surahName.toLowerCase().includes(query) ||
          surah.surahNameArabic.toLowerCase().includes(query) ||
          surah.surahNameTranslation.toLowerCase().includes(query) ||
          String(surah.id).includes(query)
      );
    }

    // Revelation Place Filter
    if (revelationFilter === 'mecca') {
      result = result.filter(
        (surah) => surah.revelationPlace.toLowerCase() === 'mecca'
      );
    } else if (revelationFilter === 'madina') {
      result = result.filter(
        (surah) => surah.revelationPlace.toLowerCase() === 'madina'
      );
    } else if (revelationFilter === 'popular') {
      result = result.filter((surah) => POPULAR_SURAH_IDS.includes(surah.id));
    }

    // Length Preset Filter
    if (lengthPreset === 'short') {
      result = result.filter((surah) => surah.totalAyah < 20);
    } else if (lengthPreset === 'medium') {
      result = result.filter((surah) => surah.totalAyah >= 20 && surah.totalAyah <= 75);
    } else if (lengthPreset === 'long') {
      result = result.filter((surah) => surah.totalAyah > 75 && surah.totalAyah <= 150);
    } else if (lengthPreset === 'very-long') {
      result = result.filter((surah) => surah.totalAyah > 150);
    }

    if (minAyahs !== '') {
      const min = parseInt(minAyahs, 10);
      if (!isNaN(min)) {
        result = result.filter((surah) => surah.totalAyah >= min);
      }
    }

    if (maxAyahs !== '') {
      const max = parseInt(maxAyahs, 10);
      if (!isNaN(max)) {
        result = result.filter((surah) => surah.totalAyah <= max);
      }
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'id') {
        comparison = a.id - b.id;
      } else if (sortBy === 'name') {
        comparison = a.surahName.localeCompare(b.surahName);
      } else if (sortBy === 'ayahs') {
        comparison = a.totalAyah - b.totalAyah;
      } else if (sortBy === 'tafseer-ayahs') {
        comparison = a.tafseerAyahCount - b.tafseerAyahCount;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [initialSurahs, searchQuery, revelationFilter, lengthPreset, minAyahs, maxAyahs, sortBy, sortDirection]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, revelationFilter, lengthPreset, minAyahs, maxAyahs, sortBy, sortDirection]);

  const visibleSurahs = filteredSurahs.slice(0, visibleCount);

  // Reset all filters to default
  const handleResetFilters = () => {
    setSearchQuery('');
    setRevelationFilter('all');
    setLengthPreset('all');
    setMinAyahs('');
    setMaxAyahs('');
    setSortBy('id');
    setSortDirection('asc');
  };

  const isFiltered = useMemo(() => {
    return (
      searchQuery !== '' ||
      revelationFilter !== 'all' ||
      lengthPreset !== 'all' ||
      minAyahs !== '' ||
      maxAyahs !== '' ||
      sortBy !== 'id' ||
      sortDirection !== 'asc'
    );
  }, [searchQuery, revelationFilter, lengthPreset, minAyahs, maxAyahs, sortBy, sortDirection]);

  const activeFilterCount = [
    searchQuery !== '',
    revelationFilter !== 'all',
    lengthPreset !== 'all',
    minAyahs !== '',
    maxAyahs !== '',
    sortBy !== 'id',
    sortDirection !== 'asc',
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Search Bar & Advanced Toggle Row */}
      <StickySearchShell className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div className="flex gap-2">
          <Button
            type="button"
            size="icon"
            onClick={() => setIsFiltersOpen(true)}
            variant={isFiltersOpen || isFiltered ? 'default' : 'outline'}
            className="relative h-auto min-h-12 w-12 shrink-0 rounded-xl border-2"
            aria-label="Open filters"
            title="Filters"
          >
            <SlidersHorizontal className="size-5" />
            {activeFilterCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full border border-[var(--color-bg)] bg-[var(--color-accent)] px-1 text-[10px] font-bold leading-5 text-[var(--color-accent-foreground)]">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
          <div className="relative flex-1">
            <SurahSearchAutocomplete
              surahs={initialSurahs}
              id="tafsir-search"
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Search surahs... (e.g., Yaseen, Rahman, Kahf)"
              inputClassName="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-elevated)] pl-11 pr-10 py-3 text-sm md:text-base outline-none transition-all hover:border-[var(--color-accent)]/30 focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/20 text-[var(--color-text)]"
              onSurahSelect={(surah) => setSearchQuery(surah.surahName)}
            />
          </div>
        </div>
      </StickySearchShell>

      <FilterDrawer
        open={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        title="Tafseer Filters"
        summary={`${filteredSurahs.length} of ${initialSurahs.filter((surah) => surah.tafseerAyahCount > 0).length} surahs`}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-text)]">
                Chapter Type
              </h4>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'All Chapters', value: 'all', icon: BookOpen },
                  { label: 'Meccan (Makki)', value: 'mecca', icon: Sun },
                  { label: 'Medinan (Madani)', value: 'madina', icon: Moon },
                  { label: 'Popular Chapters', value: 'popular', icon: Sparkles },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = revelationFilter === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setRevelationFilter(item.value as RevelationFilter)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 text-[var(--color-accent)] font-bold'
                          : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] hover:border-[var(--color-accent)]/50'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon className="size-4" />
                        {item.label}
                      </span>
                      {active && <Check className="size-3 text-[var(--color-accent)]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-text)]">
                Surah Length (Presets)
              </h4>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'All Lengths', value: 'all' },
                  { label: 'Short (< 20 Ayahs)', value: 'short' },
                  { label: 'Medium (20 - 75 Ayahs)', value: 'medium' },
                  { label: 'Long (75 - 150 Ayahs)', value: 'long' },
                  { label: 'Very Long (> 150 Ayahs)', value: 'very-long' },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setLengthPreset(preset.value as LengthPreset)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-all cursor-pointer ${
                      lengthPreset === preset.value
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 text-[var(--color-accent)] font-bold'
                        : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] hover:border-[var(--color-accent)]/50'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {lengthPreset === preset.value && <Check className="size-3 text-[var(--color-accent)]" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-text)]">
                Filter by Ayah Range
              </h4>
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <label htmlFor="tafsir-min-ayah" className="text-xs text-[var(--color-muted-text)]">
                    Min Ayahs
                  </label>
                  <input
                    id="tafsir-min-ayah"
                    type="number"
                    min="1"
                    max="286"
                    value={minAyahs}
                    onChange={(event) => setMinAyahs(event.target.value)}
                    placeholder="e.g. 7"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] text-[var(--color-text)]"
                  />
                </div>
                <span className="text-[var(--color-muted-text)] self-end mb-2">-</span>
                <div className="flex-1 space-y-1">
                  <label htmlFor="tafsir-max-ayah" className="text-xs text-[var(--color-muted-text)]">
                    Max Ayahs
                  </label>
                  <input
                    id="tafsir-max-ayah"
                    type="number"
                    min="1"
                    max="286"
                    value={maxAyahs}
                    onChange={(event) => setMaxAyahs(event.target.value)}
                    placeholder="e.g. 286"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] text-[var(--color-text)]"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[var(--color-muted-text)]">
                Enter number of verses to filter tafseer surahs.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-text)] mb-3">
                  Sort By
                </h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Surah Number', value: 'id' },
                    { label: 'Alphabetical', value: 'name' },
                    { label: 'Ayah Count', value: 'ayahs' },
                    { label: 'Tafseer Count', value: 'tafseer-ayahs' },
                  ].map((field) => (
                    <button
                      key={field.value}
                      type="button"
                      onClick={() => setSortBy(field.value as SortField)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        sortBy === field.value
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold'
                          : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] hover:border-[var(--color-accent)]/30'
                      }`}
                    >
                      {field.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-text)] mb-3">
                  Sort Order
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-2 border-[var(--color-border)] text-xs h-9 cursor-pointer"
                >
                  <ArrowUpDown className="size-3 text-[var(--color-accent)]" />
                  {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-[var(--color-border)] gap-3">
            <span className="text-xs text-[var(--color-muted-text)] mr-auto">
              Selected:{' '}
              <strong className="text-[var(--color-text)]">{filteredSurahs.length}</strong> /{' '}
              {initialSurahs.filter((surah) => surah.tafseerAyahCount > 0).length} Surahs
            </span>
            {isFiltered ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 cursor-pointer"
              >
                Clear All Filters
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsFiltersOpen(false)}
              className="text-xs font-semibold cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>
      </FilterDrawer>

      <div className="min-w-0 space-y-6">

      {/* Results Info */}
      <div className="text-sm text-[var(--color-muted-text)]">
        Showing{' '}
        <strong className="text-[var(--color-heading)]">{filteredSurahs.length}</strong>{' '}
        surah{filteredSurahs.length !== 1 ? 's' : ''} with tafseer
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Surahs Grid */}
      {filteredSurahs.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {visibleSurahs.map((surah) => (
            <Card
              key={surah.id}
              className="border border-[var(--color-border)] hover:border-[var(--color-accent-soft)] transition-colors"
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-[var(--color-accent)] text-white">
                          {surah.id}
                        </Badge>
                        <h3 className="font-display text-lg font-bold text-[var(--color-heading)]">
                          {surah.surahName}
                        </h3>
                      </div>
                      <p
                        lang="ar"
                        className="arabic-font text-sm text-[var(--color-text)] mb-2"
                      >
                        {surah.surahNameArabic}
                      </p>
                      <p className="text-sm text-[var(--color-muted-text)]">
                        {surah.surahNameTranslation} • {surah.totalAyah} Ayahs •{' '}
                        <span className="font-semibold text-[var(--color-accent)]">
                          {surah.tafseerAyahCount} Tafseer
                        </span>
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setExpandedSurah(
                          expandedSurah === surah.id ? null : surah.id
                        )
                      }
                      className="p-2 rounded-lg hover:bg-[var(--color-surface-soft)]"
                    >
                      {expandedSurah === surah.id ? (
                        <ChevronUp className="size-5 text-[var(--color-muted-text)]" />
                      ) : (
                        <ChevronDown className="size-5 text-[var(--color-muted-text)]" />
                      )}
                    </button>
                  </div>

                  {/* Expanded View - Tafseer Ayahs List */}
                  {expandedSurah === surah.id && (
                    <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
                      <p className="text-xs font-semibold text-[var(--color-heading)]">
                        Tafseer Available for:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {surah.tafseerAyahs.slice(0, 10).map((ayahNum) => (
                          <Link
                            key={ayahNum}
                            href={buildTafsirPath(
                              surah.id,
                              surah.surahName,
                              ayahNum
                            )}
                            prefetch={false}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-accent)] hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-soft)]"
                          >
                            <FileText className="size-3" />
                            Ayah {ayahNum}
                          </Link>
                        ))}
                        {surah.tafseerAyahCount > surah.tafseerAyahs.length && (
                          <span className="px-2 py-1 text-xs font-medium text-[var(--color-muted-text)]">
                            +{surah.tafseerAyahCount - surah.tafseerAyahs.length} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--color-border)]">
                    <Link
                      href={buildSurahPath(surah.id, surah.surahName)}
                      prefetch={false}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm font-semibold text-[var(--color-accent)] hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-soft)]"
                    >
                      <BookOpen className="size-4" />
                      Read Surah
                    </Link>

                    {surah.tafseerAyahs.length > 0 && (
                      <Link
                        href={buildTafsirPath(
                          surah.id,
                          surah.surahName,
                          surah.tafseerAyahs[0]
                        )}
                        prefetch={false}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[var(--color-accent)] text-sm font-semibold text-white hover:bg-[var(--color-accent-soft)]"
                      >
                        <FileText className="size-4" />
                        View Tafseer
                        <ChevronRight className="size-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-[var(--color-border)] bg-[var(--color-surface-soft)]">
          <CardContent className="p-8 text-center">
            <p className="text-[var(--color-muted-text)]">
              No surahs found with tafseer matching your search.
            </p>
          </CardContent>
        </Card>
      )}

      {visibleSurahs.length < filteredSurahs.length ? (
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-xs text-[var(--color-muted-text)]">
            Showing {visibleSurahs.length} of {filteredSurahs.length} Surahs
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            Load more Tafseer
          </Button>
        </div>
      ) : null}
        </div>
    </div>
  );
}
