export const dynamic = 'force-static';
export const revalidate = 86400;

import { getSiteOrigin } from '@/lib/seo';
import { getAllCitySlugs } from '@/lib/islamic-cities';
import { ISLAMIC_TOOLS_SITEMAP_PATHS } from '@/lib/islamic-tools-seo';
import { SITEMAP_CACHE_CONTROL } from '@/lib/sitemap-config';

function renderIslamicToolsSitemapXml() {
  const baseUrl = getSiteOrigin();
  const citySlugs = getAllCitySlugs();

  const entries: string[] = [];

  for (const path of ISLAMIC_TOOLS_SITEMAP_PATHS) {
    entries.push(`${baseUrl}${path}`);
  }

  for (const slug of citySlugs) {
    entries.push(`${baseUrl}/prayer-times/${slug}`);
    entries.push(`${baseUrl}/mosque-finder/${slug}`);
  }

  const duaCategories = [
    'morning', 'evening', 'wudu', 'prayer', 'after_prayer', 'sleep',
    'food', 'travel', 'home', 'masjid', 'distress', 'forgiveness',
    'illness', 'dhikr', 'protection', 'night_prayer', 'hajj',
  ];

  for (const cat of duaCategories) {
    entries.push(`${baseUrl}/duas/${cat}`);
  }

  const items = entries
    .map((url) => `<url><loc>${url}</loc></url>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}

export async function GET() {
  return new Response(renderIslamicToolsSitemapXml(), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': SITEMAP_CACHE_CONTROL,
    },
  });
}
