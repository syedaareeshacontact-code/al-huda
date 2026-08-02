import Link from 'next/link';
import { ListTree } from 'lucide-react';

import type { ArticleHeading } from '@/lib/articles';

export interface ArticleTableOfContentsProps {
  headings: ArticleHeading[];
  headingId?: string;
}

export function ArticleTableOfContents({
  headings,
  headingId = 'article-table-of-contents-heading',
}: ArticleTableOfContentsProps) {
  if (headings.length === 0) {
    return null;
  }

  return (
    <nav
      aria-labelledby={headingId}
      className="rounded-2xl border border-teal-700/15 bg-[color-mix(in_oklab,var(--color-surface),transparent_2%)] p-5 shadow-[var(--shadow-soft)] sm:p-6"
    >
      <h2
        id={headingId}
        className="flex items-center gap-2 font-display text-xl font-semibold text-[var(--color-heading)]"
      >
        <ListTree className="size-5 text-teal-600 dark:text-teal-300" aria-hidden="true" />
        In this article
      </h2>
      <ol className="mt-4 space-y-2.5 text-sm">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? 'ml-4 border-l border-[var(--color-border)] pl-3' : ''}>
            <Link
              href={`#${heading.id}`}
              prefetch={false}
              className="block leading-relaxed text-[var(--color-muted-text)] transition hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              {heading.text}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default ArticleTableOfContents;
