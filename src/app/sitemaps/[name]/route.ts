import { getSitemapPages, sitemapPageResponse } from '@/lib/seo/sitemaps';
export const dynamic = 'force-static';
export const revalidate = false;
export const dynamicParams = true;

export function generateStaticParams() {
  return getSitemapPages().map(page => ({ name: page.name }));
}
export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  return sitemapPageResponse((await context.params).name);
}
