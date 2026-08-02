import Link from 'next/link';
import { AlertTriangle, ArrowRight, Home, SearchX } from 'lucide-react';

interface PublicContentStateProps {
  eyebrow?: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  kind?: 'missing' | 'unavailable';
}

export default function PublicContentState({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  kind = 'unavailable',
}: PublicContentStateProps) {
  const Icon = kind === 'missing' ? SearchX : AlertTriangle;

  return (
    <div className="grid min-h-[56vh] place-items-center px-4 py-12" data-slot="page-shell">
      <section className="w-full max-w-2xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-card)] sm:p-10">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--color-accent),transparent_88%)] text-[var(--color-accent)]">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          {eyebrow ?? (kind === 'missing' ? 'Page not found' : 'Temporary issue')}
        </p>
        <h1 className="mt-2 font-display text-3xl text-[var(--color-heading)] sm:text-4xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--color-muted-text)] sm:text-base">
          {description}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href={primaryHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-bold text-[var(--color-accent-foreground)]"
          >
            {primaryLabel}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold text-[var(--color-heading)]"
          >
            <Home className="size-4" aria-hidden="true" />
            Home
          </Link>
        </div>
      </section>
    </div>
  );
}
