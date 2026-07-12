'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  ChevronRight,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

type RevelationFilter = 'all' | 'mecca' | 'madina';
type SortField = 'id' | 'name' | 'tafseer-ayahs';
type SortDirection = 'asc' | 'desc';
const PAGE_SIZE = 20;

export default function TafsirIndexClient({
  initialSurahs,
  initialSearchQuery = '',
}: TafsirIndexClientProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [revelationFilter, setRevelationFilter] = useState<RevelationFilter>('all');
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
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'id') {
        comparison = a.id - b.id;
      } else if (sortBy === 'name') {
        comparison = a.surahName.localeCompare(b.surahName);
      } else if (sortBy === 'tafseer-ayahs') {
        comparison = b.tafseerAyahCount - a.tafseerAyahCount;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [initialSurahs, searchQuery, revelationFilter, sortBy, sortDirection]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, revelationFilter, sortBy, sortDirection]);

  const visibleSurahs = filteredSurahs.slice(0, visibleCount);

  // Reset all filters to default
  const handleResetFilters = () => {
    setSearchQuery('');
    setRevelationFilter('all');
    setSortBy('id');
    setSortDirection('asc');
  };

  const isFiltered = useMemo(() => {
    return (
      searchQuery !== '' ||
      revelationFilter !== 'all' ||
      sortBy !== 'id' ||
      sortDirection !== 'asc'
    );
  }, [searchQuery, revelationFilter, sortBy, sortDirection]);

  return (
    <div className="space-y-6">
      {/* Search Bar & Advanced Toggle Row */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[var(--color-muted-text)] pointer-events-none" />
          <input
            id="tafsir-search"
            type="search"
            placeholder="Search surahs... (e.g., Yaseen, Rahman, Kahf)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-muted-text)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <Button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          variant="outline"
          className="md:w-auto"
        >
          <SlidersHorizontal className="size-4 mr-2" />
          Filters
          {isFiltered && <Badge className="ml-2 bg-[var(--color-accent)] text-white">✓</Badge>}
        </Button>
      </div>

      {/* Advanced Filters */}
      {isFiltersOpen && (
        <Card className="border border-[var(--color-border)] bg-[var(--color-surface-soft)]">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Revelation Place */}
              <div>
                <label className="block text-sm font-semibold text-[var(--color-heading)] mb-2">
                  Revelation Place
                </label>
                <select
                  value={revelationFilter}
                  onChange={(e) =>
                    setRevelationFilter(e.target.value as RevelationFilter)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="all">All Surahs</option>
                  <option value="mecca">Mecca (Makki)</option>
                  <option value="madina">Madina (Madani)</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-semibold text-[var(--color-heading)] mb-2">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortField)}
                    className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                  >
                    <option value="id">Surah Order</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="tafseer-ayahs">Tafseer Ayahs</option>
                  </select>

                  <button
                    onClick={() =>
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    }
                    className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-soft)]"
                    title={
                      sortDirection === 'asc' ? 'Ascending' : 'Descending'
                    }
                  >
                    <ArrowUpDown className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-semibold text-[var(--color-accent)] hover:border-[var(--color-accent-soft)]"
              >
                <X className="size-4 mr-2 inline-block" />
                Reset All Filters
              </button>
            )}
          </CardContent>
        </Card>
      )}

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
  );
}
