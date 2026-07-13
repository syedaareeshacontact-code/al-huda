'use client';

import Link from 'next/link';
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  BookOpen,
  BookOpenText,
  ChevronRight,
  Headphones,
  Sun,
  Moon,
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SurahFeatureTour from '@/components/quran/surah-feature-tour';
import QuranSettingsPanel from '@/components/quran/quran-settings-panel';
import SurahSearchAutocomplete from '@/components/quran/surah-search-autocomplete';
import FilterDrawer from '@/components/ui/filter-drawer';
import StickySearchShell from '@/components/ui/sticky-search-shell';
import { buildSurahPath } from '@/lib/quran-routing';
import type { SurahIndexEntry } from '@/lib/quran-index';

interface SurahIndexClientProps {
  initialSurahs: SurahIndexEntry[];
  initialSearchQuery?: string;
}

type RevelationFilter = 'all' | 'mecca' | 'madina' | 'popular';
type LengthPreset = 'all' | 'short' | 'medium' | 'long' | 'very-long';
type SortField = 'id' | 'name' | 'ayahs';
type SortDirection = 'asc' | 'desc';

// Popular surah list (commonly read)
const POPULAR_SURAH_IDS = [1, 18, 36, 55, 56, 67];
const PAGE_SIZE = 24;

export default function SurahIndexClient({ initialSurahs, initialSearchQuery = '' }: SurahIndexClientProps) {
  // State variables
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [revelationFilter, setRevelationFilter] = useState<RevelationFilter>('all');
  const [lengthPreset, setLengthPreset] = useState<LengthPreset>('all');
  const [minAyahs, setMinAyahs] = useState<string>('');
  const [maxAyahs, setMaxAyahs] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
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

  // Computed and filtered surahs
  const filteredSurahs = useMemo(() => {
    let result = [...initialSurahs];

    // 1. Text Search Filter
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

    // 2. Revelation Place Filter
    if (revelationFilter === 'mecca') {
      result = result.filter((surah) => surah.revelationPlace.toLowerCase() === 'mecca' || surah.revelationPlace.toLowerCase() === 'mecca');
    } else if (revelationFilter === 'madina') {
      result = result.filter((surah) => surah.revelationPlace.toLowerCase() === 'madina' || surah.revelationPlace.toLowerCase() === 'madina');
    } else if (revelationFilter === 'popular') {
      result = result.filter((surah) => POPULAR_SURAH_IDS.includes(surah.id));
    }

    // 3. Length Preset Filter
    if (lengthPreset === 'short') {
      result = result.filter((surah) => surah.totalAyah < 20);
    } else if (lengthPreset === 'medium') {
      result = result.filter((surah) => surah.totalAyah >= 20 && surah.totalAyah <= 75);
    } else if (lengthPreset === 'long') {
      result = result.filter((surah) => surah.totalAyah > 75 && surah.totalAyah <= 150);
    } else if (lengthPreset === 'very-long') {
      result = result.filter((surah) => surah.totalAyah > 150);
    }

    // 4. Custom Ayah Range Filter
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

    // 5. Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'id') {
        comparison = a.id - b.id;
      } else if (sortBy === 'name') {
        comparison = a.surahName.localeCompare(b.surahName);
      } else if (sortBy === 'ayahs') {
        comparison = a.totalAyah - b.totalAyah;
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

  const handleTourStepChange = useCallback((stepId: string) => {
    setIsFiltersOpen(stepId === 'filters');
  }, []);

  const handleTourClose = useCallback(() => {
    setIsFiltersOpen(false);
  }, []);

  return (
    <div className="space-y-6">
      <SurahFeatureTour onStepChange={handleTourStepChange} onClose={handleTourClose} />
      {/* Search Bar & Advanced Toggle Row */}
      <StickySearchShell className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div className="flex gap-2">
          <Button
            id="surah-tour-filters"
            type="button"
            size="icon"
            variant={isFiltersOpen || isFiltered ? 'default' : 'outline'}
            className="relative h-auto min-h-12 w-12 shrink-0 rounded-xl border-2"
            onClick={() => setIsFiltersOpen(true)}
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
          <div id="surah-tour-search" className="relative flex-1">
            <SurahSearchAutocomplete
              surahs={initialSurahs}
              id="surah-search"
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Search by name, translation, Arabic, or surah number..."
              inputClassName="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-elevated)] pl-11 pr-10 py-3 text-sm md:text-base outline-none transition-all hover:border-[var(--color-accent)]/30 focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/20 text-[var(--color-text)]"
            />
          </div>
        </div>
      </StickySearchShell>

      {/* Quick Tabs with Icons */}
      <div
        id="surah-tour-quick-tabs"
        className="-mx-4 flex items-center gap-2 overflow-x-auto border-b border-[var(--color-border)] px-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        <button
          onClick={() => setRevelationFilter('all')}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            revelationFilter === 'all'
              ? 'bg-[var(--color-accent)]  shadow-sm font-bold'
              : 'bg-[var(--color-surface-elevated)]  border border-[var(--color-border)]'
          }`}
        >
          <BookOpen className="size-4" />
          <span>All Chapters</span>
        </button>

        <button
          onClick={() => setRevelationFilter('mecca')}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            revelationFilter === 'mecca'
              ? 'bg-[var(--color-accent)]  shadow-sm font-bold'
              : 'bg-[var(--color-surface-elevated)]  border border-[var(--color-border)]'
          }`}
        >
          <Sun className="size-4 text-amber-500" />
          <span>Meccan (Makki)</span>
        </button>

        <button
          onClick={() => setRevelationFilter('madina')}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            revelationFilter === 'madina'
              ? 'bg-[var(--color-accent)]  shadow-sm font-bold'
              : 'bg-[var(--color-surface-elevated)]  border border-[var(--color-border)]'
          }`}
        >
          <Moon className="size-4 text-blue-500" />
          <span>Medinan (Madani)</span>
        </button>

        <button
          onClick={() => setRevelationFilter('popular')}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            revelationFilter === 'popular'
              ? 'bg-[var(--color-accent)]  shadow-sm font-bold'
              : 'bg-[var(--color-surface-elevated)]  border border-[var(--color-border)]'
          }`}
        >
          <Sparkles className="size-4 text-purple-500" />
          <span>Popular Chapters</span>
        </button>
      </div>

      <FilterDrawer
        open={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        title="Surah Filters"
        summary={`${filteredSurahs.length} of ${initialSurahs.length} surahs`}
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

              {/* 1. Filter by Ayah Count Presets */}
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

              {/* 2. Custom Ayah Number Range Inputs */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-text)]">
                  Filter by Ayah Range
                </h4>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <label htmlFor="min-ayah" className="text-xs text-[var(--color-muted-text)]">Min Ayahs</label>
                    <input
                      id="min-ayah"
                      type="number"
                      min="1"
                      max="286"
                      value={minAyahs}
                      onChange={(e) => setMinAyahs(e.target.value)}
                      placeholder="e.g. 7"
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] text-[var(--color-text)]"
                    />
                  </div>
                  <span className="text-[var(--color-muted-text)] self-end mb-2">—</span>
                  <div className="flex-1 space-y-1">
                    <label htmlFor="max-ayah" className="text-xs text-[var(--color-muted-text)]">Max Ayahs</label>
                    <input
                      id="max-ayah"
                      type="number"
                      min="1"
                      max="286"
                      value={maxAyahs}
                      onChange={(e) => setMaxAyahs(e.target.value)}
                      placeholder="e.g. 286"
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] text-[var(--color-text)]"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-[var(--color-muted-text)]">
                  Enter number of verses to filter surahs.
                </p>
              </div>

              {/* 3. Sorting Controls */}
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
                    ].map((field) => (
                      <button
                        key={field.value}
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
                  <div className="flex gap-2">
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
            </div>

            {/* Clear All Row */}
            <div className="flex items-center justify-end pt-4 border-t border-[var(--color-border)] gap-3">
              <span className="text-xs text-[var(--color-muted-text)] mr-auto">
                Selected: <strong className="text-[var(--color-text)]">{filteredSurahs.length}</strong> / {initialSurahs.length} Surahs
              </span>
              
              {isFiltered && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResetFilters}
                  className="text-xs font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 cursor-pointer"
                >
                  Clear All Filters
                </Button>
              )}

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

      {/* Showing Results Info Box (when filtered) */}
      {isFiltered && (
        <div className="flex items-center justify-between text-sm text-[var(--color-muted-text)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-4 py-2.5 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-semibold text-xs">
              {filteredSurahs.length}
            </span>
            <span>surah{filteredSurahs.length === 1 ? '' : 's'} matching filters.</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Surahs Grid */}
      {filteredSurahs.length === 0 ? (
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="p-12 text-center text-sm text-[var(--color-muted-text)] space-y-2">
            <p className="font-semibold text-base text-[var(--color-heading)]">No Surahs Found</p>
            <p>Try modifying your search or expanding the ayah count parameters.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="mt-3 border-[var(--color-accent)]/30 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 cursor-pointer"
            >
              Reset All Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleSurahs.map((surah, index) => {
            const surahPath = buildSurahPath(surah.id, surah.surahName);
            const isMeccan = surah.revelationPlace.toLowerCase() === 'mecca';

            return (
              <Link
                key={surah.id}
                href={surahPath}
                prefetch={false}
                className="group rounded-2xl outline-none transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
                style={{ animationDelay: `${Math.min(index, 12) * 20}ms` }}
              >
                <Card 
                  className="h-full overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_78%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-surface),white_4%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_97%))] transition-all duration-200 group-hover:border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_28%)] group-hover:shadow-[var(--shadow-card)]"
                >
                  <CardContent className="flex h-full flex-col p-4 sm:p-4.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="inline-flex size-8 items-center justify-center rounded-lg border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_55%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%)]">
                          <span className="font-mono text-xs font-bold text-[var(--color-accent)]">
                            {surah.id}
                          </span>
                        </div>
                        <div className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-text)]">
                          Surah
                        </div>
                      </div>
                      
                      {isMeccan ? (
                        <Badge variant="secondary" className="border-[var(--color-info)]/20 bg-[var(--color-info)]/10 px-2 py-0 text-[0.62rem] text-[var(--color-info)]">
                          Meccan
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-2 py-0 text-[0.62rem] text-[var(--color-accent)]">
                          Medinan
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-display text-xl font-bold leading-tight text-[var(--color-heading)] transition-colors group-hover:text-[var(--color-accent)]">
                          {surah.surahName}
                        </h2>
                        <p className="mt-1 truncate text-xs text-[var(--color-muted-text)]">
                          {surah.surahNameTranslation}
                        </p>
                      </div>
                      <p
                        dir="rtl"
                        lang="ar"
                        className="font-arabic-amiri text-2xl font-medium leading-relaxed text-[var(--color-heading)] transition-colors group-hover:text-[var(--color-accent)]"
                      >
                        {surah.surahNameArabic}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
                      <div className="flex min-w-0 items-center gap-3 text-xs text-[var(--color-muted-text)]">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <BookOpenText className="size-3.5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
                          {surah.totalAyah} Ayahs
                        </span>
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <Headphones className="size-3.5 shrink-0 text-[var(--color-info)]" aria-hidden="true" />
                          Audio
                        </span>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--color-accent)]">
                        Read
                        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
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
            className="min-w-40"
          >
            Load more Surahs
          </Button>
        </div>
      ) : null}

      <QuranSettingsPanel variant="inline" />
    </div>
  );
}
