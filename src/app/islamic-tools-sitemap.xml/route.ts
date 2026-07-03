export const dynamic = 'force-static';

import { getSiteOrigin } from '@/lib/seo';
import { getAllCitySlugs } from '@/lib/islamic-cities';
import { ISLAMIC_TOOLS_SITEMAP_PATHS } from '@/lib/islamic-tools-seo';

function renderIslamicToolsSitemapXml() {
  const baseUrl = getSiteOrigin();
  const updatedAt = new Date().toISOString();
  const citySlugs = getAllCitySlugs();

  const entries: Array<{ url: string; priority: string; changefreq: string }> = [];

  for (const path of ISLAMIC_TOOLS_SITEMAP_PATHS) {
    entries.push({
      url: `${baseUrl}${path}`,
      priority: path === '/prayer-times' ? '0.95' : '0.85',
      changefreq: path === '/prayer-times' ? 'daily' : 'weekly',
    });
  }

  for (const slug of citySlugs) {
    entries.push({
      url: `${baseUrl}/prayer-times/${slug}`,
      priority: '0.9',
      changefreq: 'daily',
    });
    entries.push({
      url: `${baseUrl}/mosque-finder/${slug}`,
      priority: '0.8',
      changefreq: 'weekly',
    });
  }

  const duaCategories = [
    'morning', 'evening', 'wudu', 'prayer', 'after_prayer', 'sleep',
    'food', 'travel', 'home', 'masjid', 'distress', 'forgiveness',
    'illness', 'dhikr', 'protection', 'night_prayer', 'hajj',
  ];

  for (const cat of duaCategories) {
    entries.push({
      url: `${baseUrl}/duas/${cat}`,
      priority: '0.75',
      changefreq: 'monthly',
    });
  }

  const items = entries
    .map(
      (entry) =>
        `<url><loc>${entry.url}</loc><lastmod>${updatedAt}</lastmod><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}

export async function GET() {
  return new Response(renderIslamicToolsSitemapXml(), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
