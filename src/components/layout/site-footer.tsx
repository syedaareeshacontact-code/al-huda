import Link from 'next/link';
import { BookMarked, Compass, HeartHandshake, Sparkles } from 'lucide-react';

import navLinks, { popularSurahLinks } from '@/lib/navLinks';

export default function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="pointer-events-none absolute -left-16 top-4 size-56 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-accent),transparent_92%)_0%,transparent_72%)] blur-2xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 size-64 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-accent-soft),transparent_94%)_0%,transparent_74%)] blur-2xl" />

      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div className="space-y-3">
          <p className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-[var(--color-muted-text)]">
            <Sparkles className="size-4 text-[var(--color-accent)]" />
            Quranic Reflection
          </p>
          <h2 className="font-display text-2xl text-[var(--color-heading)]">
            Read with Khushu, Learn with Clarity
          </h2>
          <p className="max-w-md text-sm text-[var(--color-muted-text)]">
            Read al Quran provides Quran reading, Urdu translation, tafseer, hadith, recitation
            audio, and study tools in a focused interface.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[var(--color-muted-text)]">
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2.5 py-1">
              <BookMarked className="size-3.5 text-[var(--color-accent)]" />
              Bookmark Ayahs
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2.5 py-1">
              <Compass className="size-3.5 text-[var(--color-info)]" />
              Surah Navigator
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2.5 py-1">
              <HeartHandshake className="size-3.5 text-[var(--color-highlight)]" />
              Daily Reflection
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-muted-text)]">
            Explore
          </h3>
          <div className="flex flex-wrap gap-2">
            {navLinks.map((item) => (
              <Link
                key={item.id}
                href={item.link}
                prefetch={false}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1 text-xs font-semibold text-[var(--color-muted-text)] transition-all duration-200 hover:-translate-y-px hover:border-[var(--color-accent-soft)] hover:text-[var(--color-heading)]"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-3 md:text-right">
          <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-muted-text)]">
            Popular Surahs
          </h3>
          <div className="flex flex-wrap gap-2 md:justify-end">
            {popularSurahLinks.map((item) => (
              <Link
                key={item.link}
                href={item.link}
                prefetch={false}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1 text-xs font-semibold text-[var(--color-muted-text)] transition-all duration-200 hover:-translate-y-px hover:border-[var(--color-accent-soft)] hover:text-[var(--color-heading)]"
              >
                {item.name}
              </Link>
            ))}
          </div>
          <p className="text-xs text-[var(--color-muted-text)]">
            © {new Date().getFullYear()} Read al Quran. All rights reserved.
          </p>
          <nav aria-label="Trust and legal information" className="flex flex-wrap gap-x-3 gap-y-1 text-xs md:justify-end">
            <Link href="/editorial-policy" className="text-[var(--color-muted-text)] hover:text-[var(--color-heading)]">Sources</Link>
            <Link href="/corrections" className="text-[var(--color-muted-text)] hover:text-[var(--color-heading)]">Corrections</Link>
            <Link href="/privacy-policy" className="text-[var(--color-muted-text)] hover:text-[var(--color-heading)]">Privacy</Link>
            <Link href="/terms" className="text-[var(--color-muted-text)] hover:text-[var(--color-heading)]">Terms</Link>
            <Link href="/contact" className="text-[var(--color-muted-text)] hover:text-[var(--color-heading)]">Contact</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
