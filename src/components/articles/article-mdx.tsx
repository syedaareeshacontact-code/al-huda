import type { ComponentPropsWithoutRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

import { ArticleReferences } from '@/components/articles/ArticleReferences';
import { HadithReference } from '@/components/articles/HadithReference';
import { QuranVerse } from '@/components/articles/QuranVerse';
import { cn } from '@/lib/utils';

type ArticleMdxProps = {
  source: string;
};

function MdxLink({ href = '', className, children, ...props }: ComponentPropsWithoutRef<'a'>) {
  const linkClassName = cn(
    'font-semibold text-teal-700 underline decoration-teal-600/35 underline-offset-4 transition hover:text-teal-600 dark:text-teal-300 dark:hover:text-teal-200',
    className
  );

  if (href.startsWith('/')) {
    return (
      <Link href={href} className={linkClassName}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={linkClassName}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      {...props}
    >
      {children}
    </a>
  );
}

function MdxImage({ src, alt, title }: ComponentPropsWithoutRef<'img'>) {
  if (typeof src !== 'string') {
    return null;
  }

  return (
    <span className="my-8 block overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] shadow-[var(--shadow-soft)]">
      <Image
        src={src}
        alt={alt ?? ''}
        title={title}
        width={1200}
        height={630}
        sizes="(max-width: 768px) 100vw, 760px"
        className="h-auto w-full object-cover"
      />
    </span>
  );
}

const articleMdxComponents = {
  h2: ({ className, ...props }: ComponentPropsWithoutRef<'h2'>) => (
    <h2
      className={cn(
        'mt-12 scroll-mt-28 font-display text-3xl font-semibold leading-tight text-[var(--color-heading)] first:mt-0 md:text-4xl',
        className
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: ComponentPropsWithoutRef<'h3'>) => (
    <h3
      className={cn(
        'mt-9 scroll-mt-28 text-xl font-bold leading-snug text-[var(--color-heading)] md:text-2xl',
        className
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }: ComponentPropsWithoutRef<'p'>) => (
    <p
      className={cn('mt-5 text-[1.02rem] leading-8 text-[var(--color-text)]', className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }: ComponentPropsWithoutRef<'ul'>) => (
    <ul
      className={cn(
        'mt-5 list-disc space-y-3 pl-6 text-[1.02rem] leading-7 marker:text-teal-600 dark:marker:text-teal-300',
        className
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }: ComponentPropsWithoutRef<'ol'>) => (
    <ol
      className={cn(
        'mt-5 list-decimal space-y-3 pl-6 text-[1.02rem] leading-7 marker:font-bold marker:text-teal-700 dark:marker:text-teal-300',
        className
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }: ComponentPropsWithoutRef<'li'>) => (
    <li className={cn('pl-1 text-[var(--color-text)]', className)} {...props} />
  ),
  blockquote: ({ className, ...props }: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote
      className={cn(
        'my-7 rounded-r-2xl border-l-4 border-teal-600 bg-teal-50 px-5 py-4 text-[var(--color-text)] dark:bg-teal-950/25',
        className
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }: ComponentPropsWithoutRef<'hr'>) => (
    <hr className={cn('my-10 border-[var(--color-border)]', className)} {...props} />
  ),
  strong: ({ className, ...props }: ComponentPropsWithoutRef<'strong'>) => (
    <strong className={cn('font-bold text-[var(--color-heading)]', className)} {...props} />
  ),
  a: MdxLink,
  img: MdxImage,
  table: ({ className, ...props }: ComponentPropsWithoutRef<'table'>) => (
    <div className="my-7 overflow-x-auto rounded-xl border border-[var(--color-border)]">
      <table className={cn('w-full min-w-[34rem] border-collapse text-left text-sm', className)} {...props} />
    </div>
  ),
  thead: ({ className, ...props }: ComponentPropsWithoutRef<'thead'>) => (
    <thead className={cn('bg-teal-50 text-[var(--color-heading)] dark:bg-teal-950/35', className)} {...props} />
  ),
  th: ({ className, ...props }: ComponentPropsWithoutRef<'th'>) => (
    <th className={cn('border-b border-[var(--color-border)] px-4 py-3 font-bold', className)} {...props} />
  ),
  td: ({ className, ...props }: ComponentPropsWithoutRef<'td'>) => (
    <td className={cn('border-b border-[var(--color-border)] px-4 py-3 align-top', className)} {...props} />
  ),
  code: ({ className, ...props }: ComponentPropsWithoutRef<'code'>) => (
    <code
      className={cn(
        'rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 font-mono text-[0.9em] text-[var(--color-heading)]',
        className
      )}
      {...props}
    />
  ),
  QuranVerse,
  HadithReference,
  ArticleReferences,
};

export async function ArticleMdx({ source }: ArticleMdxProps) {
  return (
    <div className="article-copy min-w-0">
      <MDXRemote
        source={source}
        components={articleMdxComponents}
        options={{
          blockJS: false,
          blockDangerousJS: true,
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeSlug],
          },
        }}
      />
    </div>
  );
}
