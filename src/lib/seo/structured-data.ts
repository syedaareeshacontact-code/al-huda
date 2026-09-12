import { canonicalUrl, getSiteOrigin, SITE_DESCRIPTION, SITE_NAME, toAbsoluteUrl } from './site';

/** Keep provider text inside the JSON script, including literal </script> sequences. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org', '@type': 'Organization',
    '@id': `${getSiteOrigin()}/#organization`, name: SITE_NAME,
    url: `${getSiteOrigin()}/`, logo: toAbsoluteUrl('/logos/logo1.png'),
    contactPoint: { '@type': 'ContactPoint', contactType: 'Support', url: toAbsoluteUrl('/contact') },
  };
}

export function buildWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org', '@type': 'WebSite',
    '@id': `${getSiteOrigin()}/#website`, name: SITE_NAME,
    url: `${getSiteOrigin()}/`, description: SITE_DESCRIPTION,
    inLanguage: ['en', 'ur', 'ar'], publisher: { '@id': `${getSiteOrigin()}/#organization` },
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; item: string }>) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name, item: toAbsoluteUrl(item.item),
    })),
  };
}

export function buildFaqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: items.map(item => ({ '@type': 'Question', name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
  };
}

export function buildBookJsonLd(options: {
  name: string; description: string; url: string; author?: string;
  inLanguage?: string[]; numberOfPages?: number; imageUrl?: string;
}) {
  return {
    '@context': 'https://schema.org', '@type': 'Book', name: options.name,
    description: options.description, url: canonicalUrl(options.url),
    ...(options.author && { author: { '@type': 'Person', name: options.author } }),
    ...(options.inLanguage && { inLanguage: options.inLanguage }),
    ...(options.imageUrl && { image: toAbsoluteUrl(options.imageUrl) }),
  };
}

/** Quran verses and sourced commentary are reference works. */
export function buildReferenceJsonLd(options: {
  title: string; description: string; content?: string; url: string; inLanguage?: string[];
}) {
  return {
    '@context': 'https://schema.org', '@type': 'CreativeWork',
    '@id': `${canonicalUrl(options.url)}#reference`, name: options.title,
    description: options.description, url: canonicalUrl(options.url),
    ...(options.content && { text: options.content }), inLanguage: options.inLanguage,
    mainEntityOfPage: { '@id': canonicalUrl(options.url) },
  };
}
