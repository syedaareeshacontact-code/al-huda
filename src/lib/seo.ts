import type { Metadata } from 'next';

const DEFAULT_SITE_URL = 'https://www.readalquran.online';
const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
const SITE_NAME = 'Read al Quran';
const SITE_DESCRIPTION = 'Read al Quran is a Quran-first web app for recitation, Urdu translation, bookmarks, audio playback, and progress tracking.';

export function getSiteOrigin() {
  return siteOrigin;
}

export function getSiteName() {
  return SITE_NAME;
}

export function toAbsoluteUrl(path: string) {
  if (!path) {
    return siteOrigin;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${siteOrigin}${normalizedPath}`;
}

export function buildLanguageAlternates(path: string) {
  return {
    'x-default': toAbsoluteUrl(path),
  } as const;
}

export const DEFAULT_OG_IMAGE = '/og?kind=surah-index';

interface BuildMetadataOptions {
  title: string;
  description: string;
  path: string;
  index?: boolean;
  follow?: boolean;
  ogType?: 'website' | 'article';
  imageUrl?: string;
  keywords?: string[];
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
}

export function buildPageMetadata(options: BuildMetadataOptions): Metadata {
  const {
    title,
    description,
    path,
    index = true,
    follow = true,
    ogType = 'website',
    imageUrl = DEFAULT_OG_IMAGE,
    keywords,
    author,
    publishedDate,
    modifiedDate,
  } = options;

  const canonical = toAbsoluteUrl(path);
  const absoluteImage = toAbsoluteUrl(imageUrl);

  const metadata: Metadata = {
    title,
    description,
    alternates: {
      canonical,
      languages: buildLanguageAlternates(path),
    },
    robots: {
      index,
      follow,
      nocache: !index,
      googleBot: {
        index,
        follow,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: ogType,
      siteName: SITE_NAME,
      locale: 'en_US',
      images: [
        {
          url: absoluteImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteImage],
      site: '@al_huda_quran',
    },
  };

  if (keywords && keywords.length > 0) {
    metadata.keywords = keywords.slice(0, 15);
  }

  if (author) {
    metadata.creator = author;
  }

  if (publishedDate || modifiedDate) {
    metadata.other = {
      'article:published_time': publishedDate,
      'article:modified_time': modifiedDate || publishedDate,
    };
  }

  return metadata;
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; item: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: toAbsoluteUrl(entry.item),
    })),
  };
}

export function buildArticleJsonLd(options: {
  title: string;
  description: string;
  content?: string;
  url: string;
  imageUrl?: string;
  publishedDate?: string;
  modifiedDate?: string;
  author?: string;
  inLanguage?: string[];
  keywords?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: options.title,
    description: options.description,
    ...(options.content && { articleBody: options.content }),
    url: toAbsoluteUrl(options.url),
    ...(options.imageUrl && {
      image: {
        '@type': 'ImageObject',
        url: toAbsoluteUrl(options.imageUrl),
      },
    }),
    ...(options.publishedDate && { datePublished: options.publishedDate }),
    ...(options.modifiedDate && { dateModified: options.modifiedDate }),
    ...(options.author && {
      author: {
        '@type': 'Person',
        name: options.author,
      },
    }),
    ...(options.inLanguage && { inLanguage: options.inLanguage }),
    ...(options.keywords && { keywords: options.keywords.join(', ') }),
  };
}

export function buildAudioJsonLd(options: {
  name: string;
  description: string;
  url: string;
  contentUrl: string;
  duration?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AudioObject',
    name: options.name,
    description: options.description,
    url: toAbsoluteUrl(options.url),
    contentUrl: options.contentUrl,
    ...(options.duration && { duration: options.duration }),
  };
}

export function buildVideoJsonLd(options: {
  name: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  uploadDate?: string;
  duration?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: options.name,
    description: options.description,
    url: toAbsoluteUrl(options.url),
    thumbnailUrl: toAbsoluteUrl(options.thumbnailUrl),
    ...(options.uploadDate && { uploadDate: options.uploadDate }),
    ...(options.duration && { duration: options.duration }),
  };
}

export function buildFaqJsonLd(
  items: Array<{
    question: string;
    answer: string;
  }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteOrigin,
    logo: toAbsoluteUrl('/logos/logo1.png'),
    description: SITE_DESCRIPTION,
    sameAs: [
      'https://www.facebook.com/alhuda.quran',
      'https://www.instagram.com/alhuda.quran',
      'https://twitter.com/al_huda_quran',
    ],
    contact: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      url: `${siteOrigin}/about`,
    },
  };
}

export function buildWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteOrigin,
    description: SITE_DESCRIPTION,
    inLanguage: ['en', 'ur', 'ar'],
    potentialAction: [
      {
        '@type': 'SearchAction',
        target: `${siteOrigin}/surah?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
      {
        '@type': 'SearchAction',
        target: `${siteOrigin}/hadith/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    ],
  };
}

export function buildCreativeWorkJsonLd(options: {
  name: string;
  description: string;
  url: string;
  inLanguage?: string[];
  imageUrl?: string;
  alternateName?: string[];
  about?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: options.name,
    description: options.description,
    url: toAbsoluteUrl(options.url),
    ...(options.inLanguage && { inLanguage: options.inLanguage }),
    ...(options.imageUrl && {
      image: {
        '@type': 'ImageObject',
        url: toAbsoluteUrl(options.imageUrl),
      },
    }),
    ...(options.alternateName && { alternateName: options.alternateName }),
    ...(options.about && { about: options.about }),
  };
}

/**
 * LOCAL SEO - Pakistan specific schema builders
 */

export function buildLocalBusinessJsonLd(options: {
  name: string;
  description: string;
  url: string;
  telephone: string;
  email: string;
  address: {
    city: string;
    country: string;
    postalCode: string;
  };
  image: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: options.name,
    description: options.description,
    url: toAbsoluteUrl(options.url),
    telephone: options.telephone,
    email: options.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: options.address.city,
      addressCountry: options.address.country,
      postalCode: options.address.postalCode,
    },
    image: toAbsoluteUrl(options.image),
    sameAs: [
      'https://www.facebook.com/alhuda.quran',
      'https://www.instagram.com/alhuda.quran',
      'https://twitter.com/al_huda_quran',
    ],
  };
}

export function buildEducationalOrganizationJsonLd(options: {
  name: string;
  description: string;
  url: string;
  logo: string;
  location: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: options.name,
    description: options.description,
    url: toAbsoluteUrl(options.url),
    logo: toAbsoluteUrl(options.logo),
    location: options.location,
    foundingDate: '2024',
    sameAs: [
      'https://www.facebook.com/alhuda.quran',
      'https://www.instagram.com/alhuda.quran',
    ],
  };
}

export function buildCityPageSchema(
  city: string,
  country: string = 'Pakistan',
  citySlug?: string
) {
  const slug = citySlug ?? city.toLowerCase().replace(/\s+/g, '-');

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Read al Quran - ${city}, ${country}`,
    description: `Read Quran online in ${city} with Urdu translation, tafseer, and audio`,
    url: toAbsoluteUrl(`/cities/${slug}`),
    areaServed: {
      '@type': 'City',
      name: city,
      containedIn: {
        '@type': 'Country',
        name: country,
      },
    },
  };
}

export function buildHowToJsonLd(options: {
  name: string;
  description: string;
  image?: string;
  steps: Array<{
    name: string;
    description: string;
    image?: string;
  }>;
  totalTime?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: options.name,
    description: options.description,
    ...(options.image && { image: toAbsoluteUrl(options.image) }),
    step: options.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.description,
      ...(step.image && {
        image: toAbsoluteUrl(step.image),
      }),
    })),
    ...(options.totalTime && { totalTime: options.totalTime }),
  };
}

export function buildSearchActionJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteOrigin,
    potentialAction: [
      {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${siteOrigin}/surah?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
      {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${siteOrigin}/hadith/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    ],
  };
}

export function buildCollectionPageJsonLd(options: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: options.name,
    description: options.description,
    url: toAbsoluteUrl(options.path),
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: siteOrigin,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteOrigin,
      logo: toAbsoluteUrl('/logos/logo1.png'),
    },
  };
}

export function buildBookJsonLd(options: {
  name: string;
  description: string;
  path: string;
  author: string;
  numberOfPages?: number;
  inLanguage?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: options.name,
    description: options.description,
    url: toAbsoluteUrl(options.path),
    author: {
      '@type': 'Person',
      name: options.author,
    },
    ...(options.numberOfPages && { numberOfPages: options.numberOfPages }),
    ...(options.inLanguage && { inLanguage: options.inLanguage }),
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteOrigin,
    },
  };
}

export function buildHadithArticleJsonLd(options: {
  title: string;
  description: string;
  content: string;
  path: string;
  imageUrl?: string;
  author?: string;
  bookName: string;
  bookAuthor: string;
  keywords?: string[];
  inLanguage?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: options.title,
    description: options.description,
    articleBody: options.content,
    url: toAbsoluteUrl(options.path),
    ...(options.imageUrl && {
      image: {
        '@type': 'ImageObject',
        url: toAbsoluteUrl(options.imageUrl),
      },
    }),
    ...(options.author && {
      author: {
        '@type': 'Person',
        name: options.author,
      },
    }),
    ...(options.inLanguage && { inLanguage: options.inLanguage }),
    ...(options.keywords && { keywords: options.keywords.join(', ') }),
    isPartOf: {
      '@type': 'Book',
      name: options.bookName,
      author: {
        '@type': 'Person',
        name: options.bookAuthor,
      },
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteOrigin,
      logo: toAbsoluteUrl('/logos/logo1.png'),
    },
  };
}

export function buildVoiceSearchOptimizedPage(options: {
  title: string;
  description: string;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  path: string;
  keywords?: string[];
}) {
  return {
    metadata: buildPageMetadata({
      title: options.title,
      description: options.description,
      path: options.path,
      keywords: options.keywords,
    }),
    schemas: {
      faq: buildFaqJsonLd(options.faqs),
      searchAction: buildSearchActionJsonLd(),
    },
  };
}
