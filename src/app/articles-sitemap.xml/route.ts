import { sitemapIndexResponse } from '@/lib/seo/sitemaps';
export const dynamic = 'force-static';
export const revalidate = false;
// Compatibility endpoint: the new root index lists section pages directly.
export function GET() { return sitemapIndexResponse('articles'); }
