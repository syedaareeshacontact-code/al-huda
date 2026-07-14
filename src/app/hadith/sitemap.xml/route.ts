import { getSiteOrigin } from '@/lib/seo';
import { SITEMAP_CACHE_CONTROL, SITEMAP_LASTMOD } from '@/lib/sitemap-config';

export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET() {
  const origin = getSiteOrigin();
  const items = [
    `<sitemap><loc>${origin}/sitemaps/hadith-collections.xml</loc><lastmod>${SITEMAP_LASTMOD}</lastmod></sitemap>`,
    `<sitemap><loc>${origin}/sitemaps/hadith-featured.xml</loc><lastmod>${SITEMAP_LASTMOD}</lastmod></sitemap>`,
  ].join('');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</sitemapindex>`,
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': SITEMAP_CACHE_CONTROL,
      },
    }
  );
}
