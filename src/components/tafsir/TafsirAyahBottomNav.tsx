import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TafsirAyahBottomNavProps {
  ayahPath: string;
  tafsirSurahPath: string;
  surahPath: string;
  surahName: string;
  prevTafsirPath: string | null;
  nextTafsirPath: string | null;
}

const navLinkClassName =
  'inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[color-mix(in_oklab,var(--color-surface),white_10%)] px-2 py-1 text-[11px] font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)] hover:bg-[color-mix(in_oklab,var(--color-surface-2),var(--color-accent)_8%)] hover:text-[var(--color-accent)] sm:gap-1 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm';

export default function TafsirAyahBottomNav({
  ayahPath,
  tafsirSurahPath,
  surahPath,
  surahName,
  prevTafsirPath,
  nextTafsirPath,
}: TafsirAyahBottomNavProps) {
  return (
    <nav
      aria-label="Tafseer navigation"
      className="fixed inset-x-1.5 bottom-1.5 z-[60] sm:inset-x-auto sm:left-1/2 sm:bottom-4 sm:w-[min(52rem,calc(100vw-1rem))] sm:-translate-x-1/2"
    >
      <div className="rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_50%)] bg-[linear-gradient(150deg,color-mix(in_oklab,var(--color-surface),white_12%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_92%))] p-1.5 shadow-[var(--shadow-card)] backdrop-blur-xl sm:rounded-2xl sm:p-3">
        <div className="flex items-center justify-start gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:gap-2 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          <Link href={ayahPath} prefetch={false} className={navLinkClassName}>
            <ChevronLeft className="size-3 sm:size-4" />
            Back to Ayah
          </Link>
          <Link href={tafsirSurahPath} prefetch={false} className={navLinkClassName}>
            All {surahName} Tafseer
          </Link>
          <Link href={surahPath} prefetch={false} className={navLinkClassName}>
            Back to Surah
          </Link>
          {prevTafsirPath ? (
            <Link href={prevTafsirPath} prefetch={false} className={navLinkClassName}>
              <ChevronLeft className="size-3 sm:size-4" />
              Previous
            </Link>
          ) : null}
          {nextTafsirPath ? (
            <Link href={nextTafsirPath} prefetch={false} className={navLinkClassName}>
              Next
              <ChevronRight className="size-3 sm:size-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
