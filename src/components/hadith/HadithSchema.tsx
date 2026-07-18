import type { HadithBook } from '@/lib/hadith/types/hadith.types';
import {
  buildHadithCollectionPath,
  buildHadithIndexPath,
  buildHadithBookPath,
} from '@/lib/hadith/hadith-routing';
import { toAbsoluteUrl, getSiteName } from '@/lib/seo';

/**
 * Props for HadithIndexSchema component
 */
interface HadithIndexSchemaProps {
  collections: HadithBook[];
}

/**
 * JSON-LD Schema component for the Hadith index page (/hadith)
 * Uses "CollectionPage" and "ItemList" schema types
 */
export function HadithIndexSchema({ collections }: HadithIndexSchemaProps) {
  const pageUrl = toAbsoluteUrl(buildHadithIndexPath());
  const siteName = getSiteName();

  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${pageUrl}#collection-page`,
    url: pageUrl,
    name: 'Hadith Collections',
    description: `Major Hadith collections including Sahih Bukhari, Sahih Muslim, Tirmidhi, Abu Dawood, Ibn Majah, Nasai, and Mishkat with translations and grades where supplied.`,
    isPartOf: {
      '@type': 'WebSite',
      name: siteName,
      url: toAbsoluteUrl('/'),
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      url: toAbsoluteUrl('/'),
      logo: toAbsoluteUrl('/logos/logo1.png'),
    },
  };

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${pageUrl}#item-list`,
    name: 'Hadith Collections List',
    numberOfItems: collections.length,
    itemListElement: collections.map((col, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Book',
        name: col.bookName,
        url: toAbsoluteUrl(buildHadithCollectionPath(col.bookSlug)),
        author: {
          '@type': 'Person',
          name: col.writerName,
        },
        numberOfItems: col.hadiths_count,
        inLanguage: ['ar', 'en', 'ur'],
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
    </>
  );
}

/**
 * Props for HadithDetailSchema component
 */
interface HadithDetailSchemaProps {
  hadithNumber: string | number;
  bookName: string;
  writerName: string;
  chapterEnglish: string;
  content: string | null;
  path: string;
  imageUrl?: string;
  datePublished?: string;
  inLanguage?: string[];
  description?: string;
}

/**
 * JSON-LD Schema for individual Hadith pages using "Article" schema
 */
export function HadithDetailSchema({
  hadithNumber,
  bookName,
  writerName,
  chapterEnglish,
  content,
  path,
  imageUrl,
  datePublished,
  inLanguage = ['ar', 'en', 'ur'],
  description,
}: HadithDetailSchemaProps) {
  const pageUrl = toAbsoluteUrl(path);
  const siteName = getSiteName();
  const headline = `Hadith ${hadithNumber} – ${bookName}`;
  const normalizedContent = content?.trim() ?? '';
  const resolvedDescription =
    description?.trim() || normalizedContent.slice(0, 155) || headline;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${pageUrl}#article`,
    url: pageUrl,
    headline: headline,
    description: resolvedDescription,
    ...(normalizedContent && { articleBody: normalizedContent }),
    ...(datePublished && {
      datePublished,
      dateModified: datePublished,
    }),
    inLanguage: inLanguage,
    author: {
      '@type': 'Person',
      name: writerName, // Imam name
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      url: toAbsoluteUrl('/'),
      logo: {
        '@type': 'ImageObject',
        url: toAbsoluteUrl('/logos/logo1.png'),
      },
    },
    ...(imageUrl && {
      image: {
        '@type': 'ImageObject',
        url: toAbsoluteUrl(imageUrl),
      },
    }),
    isPartOf: {
      '@type': 'Book',
      name: bookName,
      author: {
        '@type': 'Person',
        name: writerName,
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
    />
  );
}

/**
 * Props for HadithBreadcrumbsSchema component
 */
interface HadithBreadcrumbsSchemaProps {
  collectionName: string;
  collectionSlug: string;
  chapterNumber?: string | number;
  chapterName?: string;
  hadithNumber?: string | number;
  hadithPath?: string;
}

/**
 * JSON-LD Schema for Breadcrumbs navigation
 * Home > Hadith > Collection > Chapter (optional) > Hadith (optional)
 */
export function HadithBreadcrumbsSchema({
  collectionName,
  collectionSlug,
  chapterNumber,
  chapterName,
  hadithNumber,
  hadithPath,
}: HadithBreadcrumbsSchemaProps) {
  const items = [
    { name: 'Home', item: '/' },
    { name: 'Hadith', item: buildHadithIndexPath() },
    { name: collectionName, item: buildHadithCollectionPath(collectionSlug) },
  ];

  // If there's a chapter, construct the chapter path
  if (chapterNumber || chapterName) {
    const chapName = chapterName || `Chapter ${chapterNumber}`;
    const chapPath = buildHadithBookPath(collectionSlug, {
      chapter: chapterNumber ? String(chapterNumber) : undefined,
    });
    items.push({ name: chapName, item: chapPath });
  }

  // If there's an individual Hadith
  if (hadithNumber && hadithPath) {
    items.push({ name: `Hadith ${hadithNumber}`, item: hadithPath });
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: toAbsoluteUrl(entry.item),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
    />
  );
}
