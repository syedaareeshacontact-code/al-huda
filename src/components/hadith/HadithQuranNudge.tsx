import Link from 'next/link';
import { ArrowRight, BookOpenText, Headphones, Languages } from 'lucide-react';

import { Button } from '@/components/ui/button';

export interface HadithQuranNudgeLink {
  label: string;
  arabicLabel: string;
  href: string;
}

interface HadithQuranNudgeProps {
  links: HadithQuranNudgeLink[];
}

export default function HadithQuranNudge({ links }: HadithQuranNudgeProps) {
  return (
    <aside
      aria-labelledby="quran-companion-heading"
      className="overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_48%)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)] text-[var(--color-accent)]">
            <BookOpenText className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">
              Quran Companion
            </p>
            <h2 id="quran-companion-heading" className="mt-1 text-base font-semibold text-[var(--color-heading)]">
              Continue with the Quran
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--color-muted-text)]">
              Read Arabic, Urdu translation, tafseer, and audio tilawat after this Hadith.
            </p>
          </div>
        </div>

        {links.length > 0 ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-2 text-center transition hover:border-[var(--color-accent-soft)]"
              >
                <span dir="rtl" lang="ar" className="block truncate font-arabic text-base leading-none text-[var(--color-heading)]">
                  {link.arabicLabel}
                </span>
                <span className="mt-1 block truncate text-[0.68rem] font-semibold text-[var(--color-muted-text)]">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm" className="h-9 rounded-lg px-3 text-xs">
            <Link href="/surah" prefetch={false}>
              Open Quran
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9 rounded-lg px-3 text-xs">
            <Link href="/tafsir" prefetch={false}>
              <Languages className="size-3.5" aria-hidden="true" />
              Tafseer
            </Link>
          </Button>
          <p className="flex items-center gap-1.5 text-[0.68rem] text-[var(--color-muted-text)] sm:ml-auto">
            <Headphones className="size-3.5 text-[var(--color-accent)]" aria-hidden="true" />
            Listen, read, and reflect
          </p>
        </div>
      </div>
    </aside>
  );
}
