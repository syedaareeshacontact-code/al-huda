import { getAllCitySlugs } from '@/lib/islamic-cities';
import { getSiteOrigin } from '@/lib/seo';

export const dynamic = 'force-static';

function escapeXml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderLocalSitemapXml() {
  const baseUrl = getSiteOrigin();
  const updatedAt = new Date().toISOString();
  const cityEntries = getAllCitySlugs().map((slug) => ({
    url: `${baseUrl}/cities/${slug}`,
    lastmod: updatedAt,
    changefreq: 'weekly',
    priority: '0.75',
  }));

  const entries = [
    {
      url: `${baseUrl}/about`,
      lastmod: updatedAt,
      changefreq: 'monthly',
      priority: '0.85',
    },
    {
      url: `${baseUrl}/read-quran-online`,
      lastmod: updatedAt,
      changefreq: 'weekly',
      priority: '0.9',
    },
    {
      url: `${baseUrl}/contact`,
      lastmod: updatedAt,
      changefreq: 'monthly',
      priority: '0.8',
    },
    ...cityEntries,
    {
      url: `${baseUrl}/prayer-times`,
      lastmod: updatedAt,
      changefreq: 'daily',
      priority: '0.95',
    },
    {
      url: `${baseUrl}/prayer-times/lahore`,
      lastmod: updatedAt,
      changefreq: 'daily',
      priority: '0.9',
    },
    {
      url: `${baseUrl}/prayer-times/karachi`,
      lastmod: updatedAt,
      changefreq: 'daily',
      priority: '0.9',
    },
    {
      url: `${baseUrl}/prayer-times/islamabad`,
      lastmod: updatedAt,
      changefreq: 'daily',
      priority: '0.9',
    },
    {
      url: `${baseUrl}/duas`,
      lastmod: updatedAt,
      changefreq: 'weekly',
      priority: '0.85',
    },
    {
      url: `${baseUrl}/azkar`,
      lastmod: updatedAt,
      changefreq: 'weekly',
      priority: '0.85',
    },
    {
      url: `${baseUrl}/99-names-of-allah`,
      lastmod: updatedAt,
      changefreq: 'monthly',
      priority: '0.85',
    },
    {
      url: `${baseUrl}/zakat-calculator`,
      lastmod: updatedAt,
      changefreq: 'monthly',
      priority: '0.85',
    },
    {
      url: `${baseUrl}/mosque-finder`,
      lastmod: updatedAt,
      changefreq: 'weekly',
      priority: '0.85',
    },
  ];

  const items = entries
    .map(
      (entry) =>
        `<url><loc>${escapeXml(entry.url)}</loc><lastmod>${entry.lastmod}</lastmod><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}

export async function GET() {
  return new Response(renderLocalSitemapXml(), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
