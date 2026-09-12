import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchX } from 'lucide-react';

import HadithCard from '@/components/hadith/HadithCard';
import HadithPageHeader from '@/components/hadith/HadithPageHeader';
import HadithPagination from '@/components/hadith/HadithPagination';
import { Card, CardContent } from '@/components/ui/card';
import { HadithApiError } from '@/lib/hadith/api-client';
import { searchHadiths } from '@/lib/hadith/hadith.service';
import { buildHadithSearchPath } from '@/lib/hadith/hadith-routing';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;

  return buildPageMetadata({
    title: q ? `"${q}" – Hadith Search` : 'Search Hadiths Online',
    description: q
      ? `Search results for "${q}" across major Hadith collections with English and Urdu translations.`
      : 'Search thousands of narrations by keyword across major Hadith collections, with grades shown where supplied.',
    path: q ? `${buildHadithSearchPath()}?q=${encodeURIComponent(q)}` : buildHadithSearchPath(),
    index: false,
  });
}

async function SearchResults({ query, page }: { query: string; page: number }) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <SearchX className="mx-auto mb-4 size-10 text-[var(--color-muted-text)]" aria-hidden="true" />
          <p className="text-lg font-medium text-[var(--color-heading)]">
            Search Hadith collections
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted-text)]">
            Type a keyword above in English or Urdu to find hadiths across all major collections.
          </p>
        </CardContent>
      </Card>
    );
  }

  let results;

  try {
    results = await searchHadiths(normalizedQuery, page);
  } catch (error) {
    const message =
      error instanceof HadithApiError
        ? 'Hadith search is temporarily unavailable. Please try again in a moment.'
        : 'Something went wrong while searching hadiths. Please try again.';

    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-lg font-medium text-[var(--color-heading)]">Search unavailable</p>
          <p className="mt-2 text-sm text-[var(--color-muted-text)]">{message}</p>
        </CardContent>
      </Card>
    );
  }

  if (results.hadiths.data.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <SearchX className="mx-auto mb-4 size-10 text-[var(--color-muted-text)]" aria-hidden="true" />
          <p className="text-lg font-medium text-[var(--color-heading)]">
            No hadiths found for &ldquo;{normalizedQuery}&rdquo;
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted-text)]">
            Try different keywords or check spelling
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted-text)]">
        {results.hadiths.total.toLocaleString()} results for &ldquo;{normalizedQuery}&rdquo;
      </p>
      {results.hadiths.data.map((hadith) => (
        <HadithCard key={hadith.id} hadith={hadith} showBook />
      ))}
      <HadithPagination
        currentPage={page}
        totalPages={results.hadiths.last_page}
        baseUrl={`${buildHadithSearchPath()}?q=${encodeURIComponent(normalizedQuery)}`}
      />
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = '', page = '1' } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10));

  return (
    <div className="space-y-6 animate-fade-up">
      <HadithPageHeader
        badge="Hadith Search"
        title="Search Hadiths"
        description="Find hadiths by keyword across Sahih Bukhari, Sahih Muslim, and all major collections — in English or Urdu."
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-48 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
              />
            ))}
          </div>
        }
      >
        <SearchResults query={q} page={currentPage} />
      </Suspense>
    </div>
  );
}
