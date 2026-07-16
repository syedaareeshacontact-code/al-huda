import { getSiteOrigin } from '@/lib/seo';
import { SITEMAP_CACHE_CONTROL } from '@/lib/sitemap-config';
import { getAllCollections } from '@/lib/hadith/collections.service';

export const dynamic = 'force-static';
export const revalidate = 86400;
const SITEMAP_CHUNK_SIZE = 5_000;

export async function GET() {
  const origin = getSiteOrigin();
  const collections = await getAllCollections();
  const items = [
    `<sitemap><loc>${origin}/sitemaps/hadith-collections.xml</loc></sitemap>`,
    ...collections.flatMap((collection) =>
      Array.from(
        { length: Math.ceil(collection.hadiths_count / SITEMAP_CHUNK_SIZE) },
        (_, index) =>
          `<sitemap><loc>${origin}/sitemaps/hadith-detail-${collection.bookSlug}-${index + 1}.xml</loc></sitemap>`
      )
    ),
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
