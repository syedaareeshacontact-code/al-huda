import { getSiteOrigin } from '@/lib/seo';

export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET() {
  return new Response('This legacy sitemap has moved permanently.', {
    status: 308,
    headers: {
      Location: `${getSiteOrigin()}/sitemap.xml`,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
