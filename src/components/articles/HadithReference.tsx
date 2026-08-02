import Link from 'next/link';
import { ExternalLink, Library, ShieldAlert } from 'lucide-react';

export interface HadithReferenceProps {
  title: string;
  collection: string;
  reference: string;
  arabic?: string;
  english?: string;
  sourceUrl?: string;
  grade?: string;
  verificationNote?: string;
}

function SourceLink({ href }: { href: string }) {
  const className =
    'inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline dark:text-teal-300';

  if (href.startsWith('/') || href.startsWith('#')) {
    return (
      <Link href={href} prefetch={false} className={className}>
        Read source
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      Read source
      <ExternalLink className="size-3" aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function HadithReference({
  title,
  collection,
  reference,
  arabic,
  english,
  sourceUrl,
  grade,
  verificationNote,
}: HadithReferenceProps) {
  return (
    <figure className="my-8 overflow-hidden rounded-2xl border border-teal-700/20 bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] bg-teal-500/8 px-4 py-4 sm:px-6">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
            <Library className="size-4" aria-hidden="true" />
            Hadith reference
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold text-[var(--color-heading)]">{title}</h3>
        </div>
        {grade ? (
          <span className="rounded-full border border-emerald-600/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            Grade as supplied: {grade}
          </span>
        ) : null}
      </div>

      {arabic || english ? (
        <blockquote cite={sourceUrl} className="space-y-5 p-5 sm:p-7">
          {arabic ? (
            <p lang="ar" dir="rtl" className="arabic-font text-right text-[var(--color-heading)]">
              {arabic}
            </p>
          ) : null}
          {english ? (
            <p lang="en" className="border-t border-[var(--color-border)] pt-5 text-base leading-relaxed text-[var(--color-text)] sm:text-lg">
              {english}
            </p>
          ) : null}
        </blockquote>
      ) : null}

      {verificationNote ? (
        <div className="mx-4 mb-4 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-900 dark:text-amber-200 sm:mx-6 sm:mb-6">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">Verification note:</span> {verificationNote}
          </p>
        </div>
      ) : null}

      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-xs text-[var(--color-muted-text)] sm:px-6">
        <span>
          {collection} · {reference}
        </span>
        {sourceUrl ? <SourceLink href={sourceUrl} /> : null}
      </figcaption>
    </figure>
  );
}

export default HadithReference;
