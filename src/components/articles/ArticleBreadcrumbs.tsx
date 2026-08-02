import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface ArticleBreadcrumbItem {
  label: string;
  href?: string;
}

export interface ArticleBreadcrumbsProps {
  items: ArticleBreadcrumbItem[];
}

export function ArticleBreadcrumbs({ items }: ArticleBreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 min-w-0 max-w-full overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ol className="flex w-max flex-nowrap items-center gap-1.5 whitespace-nowrap text-sm text-[var(--color-muted-text)]">
        {items.map((item, index) => {
          const current = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex shrink-0 items-center gap-1.5">
              {index > 0 ? <ChevronRight className="size-3.5 text-[var(--color-border)]" aria-hidden="true" /> : null}
              {item.href && !current ? (
                <Link href={item.href} prefetch={false} className="transition hover:text-teal-700 dark:hover:text-teal-300">
                  {item.label}
                </Link>
              ) : (
                <span className={current ? 'max-w-[18rem] truncate font-semibold text-[var(--color-heading)]' : ''} aria-current={current ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default ArticleBreadcrumbs;
