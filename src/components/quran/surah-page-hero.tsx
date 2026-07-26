'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpenCheck,
  Bookmark,
  ChevronUp,
  Download,
  FileText,
  GripVertical,
  Headphones,
  Settings2,
} from 'lucide-react';

import BreadcrumbNav from '@/components/ui/breadcrumb-nav';

interface SurahPageHeroProps {
  surahId: number;
  surahName: string;
  surahNameArabic: string;
  surahNameArabicUthmani?: string;
  surahNameTranslation: string;
  revelationPlace: string;
  totalAyah: number;
  urduTitle: string;
  surahPath: string;
  downloadPath: string;
}

export default function SurahPageHero({
  surahId,
  surahName,
  surahNameArabic,
  surahNameArabicUthmani,
  surahNameTranslation,
  revelationPlace,
  totalAyah,
  urduTitle,
  surahPath,
  downloadPath,
}: SurahPageHeroProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const arabicTitle = surahNameArabicUthmani || surahNameArabic;

  const featureItems = [
    {
      label: 'Read',
      description: `${totalAyah} ayahs with translation`,
      icon: BookOpenCheck,
    },
    {
      label: 'Audio',
      description: 'Arabic and Urdu listening modes',
      icon: Headphones,
    },
    {
      label: 'Tafseer',
      description: 'Ayah-wise Urdu tafseer',
      icon: FileText,
    },
    {
      label: 'Bookmarks',
      description: 'Save ayahs after login',
      icon: Bookmark,
    },
    {
      label: 'Settings',
      description: 'Font, theme, and reading mode',
      icon: Settings2,
    },
  ];

  return (
    <section className="relative border-b border-[var(--color-border)] bg-[linear-gradient(145deg,var(--color-surface),color-mix(in_oklab,var(--color-accent),var(--color-surface)_96%))]">
      <div
        id="surah-page-hero-content"
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:grid-rows-[1fr] ${
          isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`px-3 py-4 transition-[opacity,transform] duration-300 sm:px-5 lg:translate-y-0 lg:py-5 lg:opacity-100 ${
              isCollapsed
                ? 'pointer-events-none -translate-y-3 opacity-0 lg:pointer-events-auto'
                : 'translate-y-0 opacity-100'
            }`}
          >
            <div className="mx-auto max-w-7xl">
              <BreadcrumbNav
                items={[
                  { label: 'Home', href: '/' },
                  { label: 'Surah Index', href: '/surah' },
                  { label: `Surah ${surahName}`, href: surahPath },
                ]}
                includeSchema={false}
              />

              <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                        Surah {surahId}
                      </p>
                      <h1 className="mt-1 truncate font-display text-3xl leading-tight text-[var(--color-heading)] sm:text-4xl">
                        Surah {surahName}
                      </h1>
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <p
                        className="surah-arabic-name text-3xl leading-tight text-[var(--color-heading)] sm:text-4xl"
                        dir="rtl"
                        lang="ar"
                      >
                        {arabicTitle}
                      </p>
                      <p
                        className="surah-arabic-name mt-1 text-lg text-[var(--color-accent-soft)] sm:text-xl"
                        dir="rtl"
                        lang="ur"
                      >
                        {urduTitle}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-muted-text)] sm:text-sm">
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1">
                      {surahNameTranslation}
                    </span>
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1">
                      {totalAyah} ayahs
                    </span>
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1">
                      {revelationPlace}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href="#interactive-reader"
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_38%)] bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] px-3 text-sm font-bold text-[var(--color-accent-foreground)] shadow-[var(--shadow-soft)]"
                    >
                      <BookOpenCheck className="size-4" />
                      Start Reading
                    </a>
                    <Link
                      href={downloadPath}
                      prefetch={false}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 text-sm font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)]"
                    >
                      <Download className="size-4" />
                      PDF &amp; Audio
                    </Link>
                  </div>
                </div>

                <div className="-mx-3 flex snap-x items-stretch gap-2 overflow-x-auto px-3 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-1 [&::-webkit-scrollbar]:hidden">
                  {featureItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex w-[min(18rem,82vw)] shrink-0 snap-start items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-elevated),transparent_4%)] px-2.5 py-2 sm:w-auto sm:min-w-0"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)] text-[var(--color-accent)]">
                          <Icon className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--color-heading)]">
                            {item.label}
                          </p>
                          <p className="hidden truncate text-xs leading-snug text-[var(--color-muted-text)] sm:block">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative h-10 border-t border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_75%)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-surface-elevated),transparent_12%),var(--color-surface))] lg:hidden">
        <button
          type="button"
          onClick={() => setIsCollapsed((current) => !current)}
          aria-expanded={!isCollapsed}
          aria-controls="surah-page-hero-content"
          aria-label={isCollapsed ? 'Show Surah overview' : 'Hide Surah overview'}
          title={isCollapsed ? 'Show Surah overview' : 'Hide Surah overview'}
          className="group absolute left-1/2 top-1/2 z-10 flex h-10 w-[7.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_30%)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-surface-elevated),white_2%),var(--color-surface))] text-[var(--color-accent)] shadow-[0_8px_24px_color-mix(in_oklab,var(--color-accent),transparent_78%)] transition duration-300 hover:border-[var(--color-accent)] hover:shadow-[0_10px_30px_color-mix(in_oklab,var(--color-accent),transparent_68%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
        >
          <GripVertical className="size-4 opacity-45 transition group-hover:opacity-75" aria-hidden="true" />
          <ChevronUp
            className={`size-5 transition-transform duration-500 ${
              isCollapsed ? 'rotate-180' : 'rotate-0'
            }`}
            aria-hidden="true"
          />
          <GripVertical className="size-4 opacity-45 transition group-hover:opacity-75" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
