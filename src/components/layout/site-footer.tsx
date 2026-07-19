import Link from 'next/link';
import {
  ArrowUpRight,
  BookMarked,
  BookOpen,
  Compass,
  HeartHandshake,
  Sparkles,
} from 'lucide-react';

import navLinks, { popularSurahLinks } from '@/lib/navLinks';

const footerHighlights = [
  { label: 'Bookmark Ayahs', icon: BookMarked },
  { label: 'Surah Navigator', icon: Compass },
  { label: 'Daily Reflection', icon: HeartHandshake },
];

const footerLinkClass =
  'group flex min-h-10 items-center justify-between gap-1.5 rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_78%)] bg-[color-mix(in_oklab,var(--color-surface-elevated),transparent_4%)] px-3 py-2 text-xs font-medium text-[var(--color-text)] transition duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_38%)] hover:bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_94%)] hover:text-[var(--color-heading)] focus-visible:border-[var(--color-accent-soft)] sm:min-h-11 sm:px-3.5 sm:text-sm';

export default function SiteFooter() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_68%)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[0_-16px_48px_-42px_color-mix(in_oklab,var(--color-accent),transparent_48%)] transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-accent),var(--color-surface)_96%)_0%,var(--color-surface)_48%,var(--color-bg-alt)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-[linear-gradient(90deg,transparent_4%,var(--color-accent)_35%,var(--color-accent-soft)_50%,var(--color-accent)_65%,transparent_96%)] opacity-60" />
      <div className="pointer-events-none absolute -left-28 -top-28 -z-10 size-72 rounded-full bg-[color-mix(in_oklab,var(--color-accent),transparent_92%)] blur-3xl sm:size-80" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 -z-10 size-80 rounded-full bg-[color-mix(in_oklab,var(--color-accent-soft),transparent_94%)] blur-3xl" />
      <div className="pointer-events-none absolute left-[58%] top-0 -z-10 h-64 w-64 -translate-x-1/2 bg-[radial-gradient(circle,var(--color-accent)_0%,transparent_68%)] opacity-[0.04] blur-2xl" />

      <BookOpen
        aria-hidden="true"
        strokeWidth={0.7}
        className="pointer-events-none absolute -bottom-14 -right-12 -z-10 size-56 rotate-[-8deg] text-[var(--color-accent)] opacity-[0.04] sm:size-72 lg:right-8"
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-5 pt-8 sm:px-6 sm:pt-10 lg:pt-12">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1.25fr_0.85fr_0.85fr] lg:gap-10">
          <section className="border-b border-[var(--color-border)] pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-9">
            <div className="flex items-center gap-3">
              <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_96%))] text-[var(--color-accent)] shadow-[var(--shadow-soft)]">
                <BookOpen className="size-[1.125rem]" strokeWidth={1.8} aria-hidden="true" />
                <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[var(--color-accent-soft)] shadow-[0_0_8px_color-mix(in_oklab,var(--color-accent-soft),transparent_45%)]" />
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--color-accent)] sm:text-[10px]">
                  <Sparkles className="size-3" aria-hidden="true" />
                  Quranic Reflection
                </p>
                <p className="font-display text-lg font-semibold tracking-wide text-[var(--color-heading)] sm:text-xl">
                  Read al Quran
                </p>
              </div>
            </div>

            <h2 className="mt-4 max-w-xl font-display text-2xl font-semibold leading-tight text-[var(--color-heading)] sm:text-[1.7rem]">
              Read with Khushu,{' '}
              <span className="bg-[linear-gradient(90deg,var(--color-accent),var(--color-accent-soft),var(--color-highlight))] bg-clip-text text-transparent">
                learn with clarity.
              </span>
            </h2>
            <p className="mt-2 max-w-lg text-[0.8rem] leading-5 text-[var(--color-muted-text)] sm:text-sm sm:leading-6">
              Quran reading, Urdu translation, tafseer, hadith and recitation tools—thoughtfully
              brought together for focused daily learning.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2 lg:max-w-xl">
              {footerHighlights.map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_72%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_96%)] px-1.5 py-2 text-center text-[9px] font-medium leading-tight text-[var(--color-text)] sm:min-h-10 sm:flex-row sm:gap-2 sm:px-3 sm:text-left sm:text-xs"
                >
                  <Icon className="size-3.5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>

            <Link
              href="/surah"
              prefetch={false}
              className="group mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_38%)] bg-[linear-gradient(110deg,var(--color-accent),var(--color-accent-soft)_55%,var(--color-accent))] px-3.5 py-2 text-xs font-bold text-[var(--color-accent-foreground)] shadow-[0_10px_22px_-18px_color-mix(in_oklab,var(--color-accent),transparent_42%)] transition hover:-translate-y-0.5 hover:brightness-105 sm:min-h-11 sm:px-4 sm:text-sm"
            >
              Begin reading
              <ArrowUpRight
                className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </Link>
          </section>

          <nav aria-label="Explore Read al Quran">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="h-px w-6 bg-[linear-gradient(90deg,var(--color-accent),transparent)]" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-accent)] sm:text-[11px]">
                Explore
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-1">
              {navLinks.map((item) => (
                <Link
                  key={item.id}
                  href={item.link}
                  prefetch={false}
                  className={footerLinkClass}
                >
                  <span>{item.name}</span>
                  <ArrowUpRight
                    className="hidden size-3.5 shrink-0 text-[var(--color-muted-text)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--color-accent)] sm:block"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </nav>

          <nav aria-label="Popular Surahs">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="h-px w-6 bg-[linear-gradient(90deg,var(--color-accent),transparent)]" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-accent)] sm:text-[11px]">
                Popular Surahs
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-1">
              {popularSurahLinks.map((item) => (
                <Link
                  key={item.link}
                  href={item.link}
                  prefetch={false}
                  className={footerLinkClass}
                >
                  <span>{item.name}</span>
                  <ArrowUpRight
                    className="hidden size-3.5 shrink-0 text-[var(--color-muted-text)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--color-accent)] sm:block"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </nav>
        </div>

        <div className="mt-7 border-t border-[var(--color-border)] pt-4 sm:mt-9 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <p className="text-center text-xs text-[var(--color-muted-text)] sm:text-left">
            © {new Date().getFullYear()} Read al Quran. All rights reserved.
          </p>
          <nav
            aria-label="Trust and legal information"
            className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs sm:mt-0 sm:justify-end"
          >
            <Link href="/editorial-policy" className="text-[var(--color-muted-text)] hover:text-[var(--color-accent)]">Sources</Link>
            <Link href="/corrections" className="text-[var(--color-muted-text)] hover:text-[var(--color-accent)]">Corrections</Link>
            <Link href="/privacy-policy" className="text-[var(--color-muted-text)] hover:text-[var(--color-accent)]">Privacy</Link>
            <Link href="/terms" className="text-[var(--color-muted-text)] hover:text-[var(--color-accent)]">Terms</Link>
            <Link href="/contact" className="text-[var(--color-muted-text)] hover:text-[var(--color-accent)]">Contact</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
