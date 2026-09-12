import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    // Search and account pages must be crawlable for their noindex tags to be read.
    rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    sitemap: `${getSiteOrigin()}/sitemap.xml`,
  };
}
