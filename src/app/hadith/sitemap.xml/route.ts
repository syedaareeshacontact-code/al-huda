import { sitemapIndexResponse } from '@/lib/seo/sitemaps';
export const dynamic = 'force-static';
export const revalidate = false;
export function GET() { return sitemapIndexResponse('hadith'); }
