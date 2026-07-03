import { getHadithSitemapChunkCount } from '@/lib/hadith/hadith-index';
import { getSiteOrigin } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const origin = getSiteOrigin();
  const updatedAt = new Date().toISOString();

  try {
    const chunkCount = await getHadithSitemapChunkCount();
    if (!Number.isInteger(chunkCount) || chunkCount < 1) {
      throw new Error('Invalid hadith sitemap chunk count');
    }

    const items = [
      `<sitemap><loc>${origin}/sitemaps/hadith-collections.xml</loc><lastmod>${updatedAt}</lastmod></sitemap>`,
      ...Array.from({ length: chunkCount }, (_, index) => {
        return `<sitemap><loc>${origin}/sitemaps/hadith-${index + 1}.xml</loc><lastmod>${updatedAt}</lastmod></sitemap>`;
      }),
    ].join('');

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</sitemapindex>`,
      {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.warn('Hadith sitemap index failed:', error);

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<sitemap><loc>${origin}/sitemaps/hadith-collections.xml</loc><lastmod>${updatedAt}</lastmod></sitemap>
</sitemapindex>`,
      {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  }
}
