import Link from 'next/link';

import { buildBreadcrumbJsonLd } from '@/lib/seo';
import type { BreadcrumbItem } from '@/types/breadcrumb';

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  includeSchema?: boolean;
}

export default function BreadcrumbNav({ items, includeSchema = true }: BreadcrumbNavProps) {
  const jsonLd = buildBreadcrumbJsonLd(
    items.map((item) => ({
      name: item.label,
      item: item.href,
    }))
  );

  return (
    <>
      {includeSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 min-w-0 max-w-full overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ol className="flex w-max flex-nowrap items-center gap-1.5 whitespace-nowrap text-sm text-[var(--color-muted-text)]">
          {items.map((item, index) => (
            <li key={`${item.href}-${index}`} className="flex shrink-0 items-center gap-1.5">
              {index > 0 && (
                <svg
                  className="h-3.5 w-3.5 text-[var(--color-border)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
              {index === items.length - 1 ? (
                <span className="font-medium text-[var(--color-heading)]" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  prefetch={false}
                  className="transition-colors hover:text-[var(--color-accent-soft)]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
