import 'server-only';

import { cache } from 'react';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import GithubSlugger from 'github-slugger';
import matter from 'gray-matter';
import { z } from 'zod';

const ARTICLES_DIRECTORY = join(process.cwd(), 'content', 'articles');
const ARTICLE_EXTENSION = '.mdx';
const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 24;
const WORDS_PER_MINUTE = 200;

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'surah-guides':
    'Source-aware introductions to individual Surahs, their themes, and careful reading notes.',
  'duas-and-wellbeing':
    'Referenced supplications and grounded guidance for spiritual wellbeing.',
  'quran-learning':
    'Practical, beginner-friendly guidance for reading and reflecting on the Quran.',
};

const isoDateSchema = z.preprocess(
  (value) =>
    value instanceof Date ? value.toISOString().slice(0, 10) : value,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'must use the YYYY-MM-DD format')
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'must be a valid date')
);

const articleFrontmatterSchema = z
  .object({
    title: z.string().trim().min(8).max(120),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase URL slug'),
    description: z.string().trim().min(50).max(180),
    category: z.string().trim().min(2).max(60),
    keywords: z.array(z.string().trim().min(2).max(80)).min(2).max(20),
    coverImage: z.string().trim().startsWith('/images/articles/'),
    coverAlt: z.string().trim().min(20).max(180),
    author: z.string().trim().min(2).max(100),
    reviewer: z.string().trim().min(2).max(140),
    reviewedAt: isoDateSchema.nullable().optional(),
    publishedAt: isoDateSchema,
    updatedAt: isoDateSchema,
    relatedSurahs: z.array(z.number().int().min(1).max(114)).max(12),
    relatedArticles: z.array(z.string().trim()).max(12),
    featured: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.updatedAt < data.publishedAt) {
      context.addIssue({
        code: 'custom',
        path: ['updatedAt'],
        message: 'must be on or after publishedAt',
      });
    }

    const expectedImageDirectory = `/images/articles/${data.slug}/`;
    if (!data.coverImage.startsWith(expectedImageDirectory)) {
      context.addIssue({
        code: 'custom',
        path: ['coverImage'],
        message: `must be stored inside ${expectedImageDirectory}`,
      });
    }

    if (data.relatedArticles.includes(data.slug)) {
      context.addIssue({
        code: 'custom',
        path: ['relatedArticles'],
        message: 'cannot include the current article',
      });
    }

    if (new Set(data.keywords.map(normalizeForSearch)).size !== data.keywords.length) {
      context.addIssue({
        code: 'custom',
        path: ['keywords'],
        message: 'must not contain duplicates',
      });
    }

    if (new Set(data.relatedSurahs).size !== data.relatedSurahs.length) {
      context.addIssue({
        code: 'custom',
        path: ['relatedSurahs'],
        message: 'must not contain duplicates',
      });
    }

    if (new Set(data.relatedArticles).size !== data.relatedArticles.length) {
      context.addIssue({
        code: 'custom',
        path: ['relatedArticles'],
        message: 'must not contain duplicates',
      });
    }
  });

export interface ArticleFrontmatter {
  title: string;
  slug: string;
  description: string;
  category: string;
  keywords: string[];
  coverImage: string;
  coverAlt: string;
  author: string;
  reviewer: string;
  reviewedAt?: string | null;
  publishedAt: string;
  updatedAt: string;
  relatedSurahs: number[];
  relatedArticles: string[];
  featured?: boolean;
}

export interface ArticleReadingTime {
  words: number;
  minutes: number;
  text: string;
}

export interface ArticleHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface ArticleSummary extends ArticleFrontmatter {
  href: string;
  categorySlug: string;
  readingTime: ArticleReadingTime;
}

export interface Article extends ArticleSummary {
  body: string;
  headings: ArticleHeading[];
}

export interface ArticleCategory {
  name: string;
  slug: string;
  description: string;
  count: number;
  latestUpdatedAt: string;
}

export interface ArticleQuery {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedArticles {
  items: ArticleSummary[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ParsedArticleFile {
  frontmatter: ArticleFrontmatter;
  body: string;
  fileName: string;
}

function normalizeForSearch(value: string) {
  return value.trim().toLocaleLowerCase('en');
}

export function slugifyArticleCategory(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function stripInlineMarkdown(value: string) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/\\([#{}])/g, '$1')
    .trim();
}

export function extractArticleHeadings(body: string): ArticleHeading[] {
  const headings: ArticleHeading[] = [];
  const slugger = new GithubSlugger();
  let inFence = false;
  let hasSecondLevelHeading = false;

  for (const line of body.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    if (/^#\s+/.test(line)) {
      throw new Error('Article MDX must not contain an H1; the article page owns the H1.');
    }

    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) {
      continue;
    }

    const level = match[1].length as 2 | 3;
    const text = stripInlineMarkdown(match[2]);
    if (!text) {
      continue;
    }

    if (level === 3 && !hasSecondLevelHeading) {
      throw new Error(`H3 heading "${text}" must follow an H2 heading.`);
    }

    if (level === 2) {
      hasSecondLevelHeading = true;
    }

    headings.push({
      id: slugger.slug(text),
      text,
      level,
    });
  }

  return headings;
}

function getReadingTime(body: string): ArticleReadingTime {
  const readableText = body
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#>*_`~\[\]()-]/g, ' ');
  const words = readableText.split(/\s+/u).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));

  return {
    words,
    minutes,
    text: `${minutes} min read`,
  };
}

function parseArticleFile(fileName: string): ParsedArticleFile {
  const filePath = join(ARTICLES_DIRECTORY, fileName);
  const raw = readFileSync(filePath, 'utf8');
  const parsed = matter(raw);

  let frontmatter: ArticleFrontmatter;
  try {
    frontmatter = articleFrontmatterSchema.parse(parsed.data) as ArticleFrontmatter;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join('.') || 'frontmatter'}: ${issue.message}`)
        .join('; ');
      throw new Error(`Invalid article frontmatter in ${fileName}: ${issues}`);
    }
    throw error;
  }

  const fileSlug = basename(fileName, extname(fileName));
  if (fileSlug !== frontmatter.slug) {
    throw new Error(
      `Article filename ${fileName} must match its frontmatter slug "${frontmatter.slug}".`
    );
  }

  const body = parsed.content.trim();
  if (!body) {
    throw new Error(`Article ${fileName} must contain MDX body content.`);
  }

  try {
    extractArticleHeadings(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid heading hierarchy in ${fileName}: ${message}`);
  }

  return { frontmatter, body, fileName };
}

const getArticleIndex = cache((): Article[] => {
  if (!existsSync(ARTICLES_DIRECTORY)) {
    return [];
  }

  const files = readdirSync(ARTICLES_DIRECTORY)
    .filter((fileName) => extname(fileName).toLowerCase() === ARTICLE_EXTENSION)
    .sort();
  const parsedFiles = files.map(parseArticleFile);
  const slugSet = new Set<string>();

  for (const article of parsedFiles) {
    const slug = article.frontmatter.slug;
    if (slugSet.has(slug)) {
      throw new Error(`Duplicate article slug "${slug}" in content/articles/.`);
    }
    slugSet.add(slug);
  }

  for (const article of parsedFiles) {
    for (const relatedSlug of article.frontmatter.relatedArticles) {
      if (!slugSet.has(relatedSlug)) {
        throw new Error(
          `Article ${article.fileName} references missing related article "${relatedSlug}".`
        );
      }
    }
  }

  return parsedFiles
    .map(({ frontmatter, body }) => ({
      ...frontmatter,
      href: `/articles/${frontmatter.slug}`,
      categorySlug: slugifyArticleCategory(frontmatter.category),
      readingTime: getReadingTime(body),
      body,
      headings: extractArticleHeadings(body),
    }))
    .sort((left, right) => {
      const dateOrder = right.publishedAt.localeCompare(left.publishedAt);
      return dateOrder || left.slug.localeCompare(right.slug);
    });
});

function toSummary(article: Article): ArticleSummary {
  const { body: _body, headings: _headings, ...summary } = article;
  return summary;
}

export const getAllArticles = cache((): Article[] =>
  getArticleIndex().map((article) => ({ ...article }))
);

export const getAllArticleSummaries = cache((): ArticleSummary[] =>
  getArticleIndex().map(toSummary)
);

export const getArticleBySlug = cache((slug: string): Article | null => {
  const normalizedSlug = slug.trim().toLowerCase();
  const article = getArticleIndex().find((entry) => entry.slug === normalizedSlug);
  return article ? { ...article } : null;
});

export const getArticleCategories = cache((): ArticleCategory[] => {
  const categories = new Map<string, ArticleCategory>();

  for (const article of getArticleIndex()) {
    const current = categories.get(article.categorySlug);
    if (current && current.name !== article.category) {
      throw new Error(
        `Article categories "${current.name}" and "${article.category}" resolve to the same URL slug.`
      );
    }

    categories.set(article.categorySlug, {
      name: article.category,
      slug: article.categorySlug,
      description:
        CATEGORY_DESCRIPTIONS[article.categorySlug] ??
        `Browse ${article.category.toLowerCase()} from the Read al Quran editorial library.`,
      count: (current?.count ?? 0) + 1,
      latestUpdatedAt:
        !current || article.updatedAt > current.latestUpdatedAt
          ? article.updatedAt
          : current.latestUpdatedAt,
    });
  }

  return Array.from(categories.values()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
});

export const getArticleCategoryBySlug = cache(
  (slug: string): ArticleCategory | null =>
    getArticleCategories().find((category) => category.slug === slug) ?? null
);

export function queryArticles({
  search = '',
  category,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: ArticleQuery = {}): PaginatedArticles {
  const normalizedSearch = normalizeForSearch(search).slice(0, 100);
  const normalizedCategory = category ? slugifyArticleCategory(category) : undefined;
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const safePageSize = Number.isFinite(pageSize)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize)))
    : DEFAULT_PAGE_SIZE;

  const filtered = getAllArticleSummaries().filter((article) => {
    if (normalizedCategory && article.categorySlug !== normalizedCategory) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const searchText = [
      article.title,
      article.description,
      article.category,
      ...article.keywords,
    ]
      .map(normalizeForSearch)
      .join(' ');

    return searchText.includes(normalizedSearch);
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const resolvedPage = Math.min(safePage, totalPages);
  const start = (resolvedPage - 1) * safePageSize;

  return {
    items: filtered.slice(start, start + safePageSize),
    page: resolvedPage,
    pageSize: safePageSize,
    totalItems,
    totalPages,
    hasNextPage: resolvedPage < totalPages,
    hasPreviousPage: resolvedPage > 1,
  };
}

export function getFeaturedArticles(limit = 2): ArticleSummary[] {
  const summaries = getAllArticleSummaries();
  const featured = summaries.filter((article) => article.featured);
  return (featured.length > 0 ? featured : summaries).slice(0, Math.max(0, limit));
}

export function getLatestArticles(limit = 4): ArticleSummary[] {
  return getAllArticleSummaries().slice(0, Math.max(0, limit));
}

export function getArticlesByCategory(categorySlug: string): ArticleSummary[] {
  const normalizedCategory = slugifyArticleCategory(categorySlug);
  return getAllArticleSummaries().filter(
    (article) => article.categorySlug === normalizedCategory
  );
}

export function getPopularSurahGuides(limit = 4): ArticleSummary[] {
  return getAllArticleSummaries()
    .filter((article) => article.categorySlug === 'surah-guides')
    .slice(0, Math.max(0, limit));
}

export function getRelatedArticles(
  slugs: readonly string[],
  limit = 3
): ArticleSummary[] {
  const bySlug = new Map(
    getAllArticleSummaries().map((article) => [article.slug, article] as const)
  );

  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((article): article is ArticleSummary => Boolean(article))
    .slice(0, Math.max(0, limit));
}
