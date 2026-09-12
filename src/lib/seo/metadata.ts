import type { Metadata } from 'next';
import { canonicalUrl, DEFAULT_OG_IMAGE, SITE_NAME, toAbsoluteUrl } from './site';

export interface PageMetadataOptions {
  title: string;
  description: string;
  path: string;
  index?: boolean;
  follow?: boolean;
  ogType?: 'website' | 'article';
  imageUrl?: string;
  imageAlt?: string;
  author?: string;
  authorUrl?: string;
  publishedDate?: string;
  modifiedDate?: string;
  section?: string;
}

/** Describe the visible page. Query views never become separate search landing pages. */
export function buildPageMetadata(options: PageMetadataOptions): Metadata {
  const title = options.title.replace(/\s+/g, ' ').trim();
  const description = options.description.replace(/\s+/g, ' ').trim();
  const canonical = canonicalUrl(options.path);
  const image = toAbsoluteUrl(options.imageUrl || DEFAULT_OG_IMAGE);
  const index = options.index ?? true;
  const follow = options.follow ?? true;
  const socialTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  return {
    title, description,
    // Language alternates need genuine separate language URLs.
    alternates: { canonical },
    robots: {
      index, follow, nocache: !index,
      googleBot: { index, follow, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
    },
    ...(options.author && {
      authors: [{ name: options.author, ...(options.authorUrl && { url: toAbsoluteUrl(options.authorUrl) }) }],
      creator: options.author,
    }),
    openGraph: {
      type: options.ogType || 'website', url: canonical, siteName: SITE_NAME,
      title: socialTitle, description,
      images: [{ url: image, width: 1200, height: 630, alt: options.imageAlt || title }],
      ...(options.ogType === 'article' && {
        publishedTime: options.publishedDate, modifiedTime: options.modifiedDate, section: options.section,
        ...(options.author && { authors: [options.authorUrl ? toAbsoluteUrl(options.authorUrl) : options.author] }),
      }),
    },
    twitter: { card: 'summary_large_image', title: socialTitle, description, images: [image] },
  };
}
