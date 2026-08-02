'use client';

import Link from 'next/link';
import { ListTree } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { ArticleHeading } from '@/lib/articles';

export interface ArticleTableOfContentsProps {
  headings: ArticleHeading[];
  headingId?: string;
}

export function ArticleTableOfContents({
  headings,
  headingId = 'article-table-of-contents-heading',
}: ArticleTableOfContentsProps) {
  const headingIds = useMemo(() => headings.map((heading) => heading.id), [headings]);
  const [activeId, setActiveId] = useState(() => headingIds[0] ?? '');

  useEffect(() => {
    if (headingIds.length === 0) {
      return;
    }

    const updateActiveHeading = () => {
      const scrollOffset = 140;
      const currentHeading = headingIds
        .map((id) => document.getElementById(id))
        .filter((element): element is HTMLElement => Boolean(element))
        .reduce<HTMLElement | null>((current, element) => {
          const top = element.getBoundingClientRect().top;
          if (top <= scrollOffset) {
            return element;
          }

          return current;
        }, null);

      setActiveId(currentHeading?.id ?? headingIds[0]);
    };

    let animationFrame = 0;
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateActiveHeading);
    };

    updateActiveHeading();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('hashchange', scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('hashchange', scheduleUpdate);
    };
  }, [headingIds]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav
      aria-labelledby={headingId}
      className="rounded-2xl border border-teal-700/15 bg-[color-mix(in_oklab,var(--color-surface),transparent_2%)] p-5 shadow-[var(--shadow-soft)] sm:p-6 lg:max-h-[calc(100dvh-7.5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-4"
    >
      <h2
        id={headingId}
        className="flex items-center gap-2 font-display text-xl font-semibold text-[var(--color-heading)]"
      >
        <ListTree className="size-5 text-teal-600 dark:text-teal-300" aria-hidden="true" />
        In this article
      </h2>
      <ol className="mt-4 space-y-2.5 text-sm">
        {headings.map((heading) => {
          const isActive = heading.id === activeId;

          return (
            <li
              key={heading.id}
              className={`transition-colors ${
                heading.level === 3
                  ? `ml-4 border-l pl-3 ${
                      isActive ? 'border-teal-500' : 'border-[var(--color-border)]'
                    }`
                  : ''
              }`}
            >
              <Link
                href={`#${heading.id}`}
                prefetch={false}
                aria-current={isActive ? 'location' : undefined}
                onClick={() => setActiveId(heading.id)}
                className={`block rounded-lg px-2 py-1.5 leading-relaxed transition ${
                  isActive
                    ? 'bg-teal-500/10 font-semibold text-teal-800 ring-1 ring-teal-500/15 dark:text-teal-200'
                    : 'text-[var(--color-muted-text)] hover:bg-teal-500/8 hover:text-emerald-700 dark:hover:text-emerald-300'
                }`}
              >
                {heading.text}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default ArticleTableOfContents;
