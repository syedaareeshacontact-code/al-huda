import Link from 'next/link';
import { CheckCircle2, ExternalLink, ShieldAlert } from 'lucide-react';

export interface ArticleReferenceItem {
  title: string;
  url: string;
  note?: string;
  status?: 'verified' | 'review-pending';
}

export interface ArticleReferencesProps {
  items: ArticleReferenceItem[];
}

function ReferenceTitle({ item }: { item: ArticleReferenceItem }) {
  const className =
    'font-semibold text-[var(--color-heading)] underline-offset-4 hover:text-teal-700 hover:underline dark:hover:text-teal-300';

  if (item.url.startsWith('/') || item.url.startsWith('#')) {
    return (
      <Link href={item.url} prefetch={false} className={className}>
        {item.title}
      </Link>
    );
  }

  return (
    <a href={item.url} target="_blank" rel="noreferrer" className={`${className} inline-flex items-center gap-1.5`}>
      {item.title}
      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function ArticleReferences({ items }: ArticleReferencesProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="article-references-heading" className="my-10 scroll-mt-28" id="references">
      <h2 id="article-references-heading" className="font-display text-2xl font-semibold text-[var(--color-heading)] sm:text-3xl">
        Sources &amp; references
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-text)]">
        Review the cited source and verification status for each reference used in this article.
      </p>

      <ol className="mt-5 space-y-3">
        {items.map((item, index) => (
          <li
            key={`${item.url}-${index}`}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)] sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <ReferenceTitle item={item} />
              {item.status === 'verified' ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  Verified
                </span>
              ) : item.status === 'review-pending' ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                  <ShieldAlert className="size-3.5" aria-hidden="true" />
                  Review pending
                </span>
              ) : null}
            </div>
            {item.note ? <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-text)]">{item.note}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default ArticleReferences;
