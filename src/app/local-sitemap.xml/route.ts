import { getSiteOrigin } from '@/lib/seo';
import { SITEMAP_CACHE_CONTROL, SITEMAP_LASTMOD } from '@/lib/sitemap-config';

export const dynamic = 'force-static';
export const revalidate = 86400;

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

  const entries = [
    {
      url: `${baseUrl}/about`,
      lastmod: SITEMAP_LASTMOD,
      changefreq: 'monthly',
      priority: '0.85',
    },
    {
      url: `${baseUrl}/read-quran-online`,
      lastmod: SITEMAP_LASTMOD,
      changefreq: 'weekly',
      priority: '0.9',
    },
    {
      url: `${baseUrl}/contact`,
      lastmod: SITEMAP_LASTMOD,
      changefreq: 'monthly',
      priority: '0.8',
    },
    {
      url: `${baseUrl}/prayer-times`,
      lastmod: SITEMAP_LASTMOD,
      changefreq: 'daily',
      priority: '0.95',
    },
    {
      url: `${baseUrl}/prayer-times/lahore`,
      lastmod: SITEMAP_LASTMOD,
      changefreq: 'daily',
      priority: '0.9',
    },
    {
      url: `${baseUrl}/prayer-times/karachi`,
      lastmod: SITEMAP_LASTMOD,
      changefreq: 'daily',
      priority: '0.9',
    },
    {
      url: `${baseUrl}/prayer-times/islamabad`,
      lastmod: SITEMAP_LASTMOD,
      changefreq: 'daily',
      priority: '0.9',
    },
    {
      url: `${baseUrl}/duas`,
      lastmod: SITEMAP_LASTMOD,
      changefreq: 'weekly',
      priority: '0.85',
    },
    {
      url: `${baseUrl}/azkar`,
      lastmod: SITEMAP_LASTMOD,
      changefreq: 'weekly',
      priority: '0.85',
    },
    {
      url: `${baseUrl}/99-names-of-allah`,
      lastmod: SITEMAP_LASTMOD,
      changefreq: 'monthly',
      priority: '0.85',
    },
    {
      url: `${baseUrl}/zakat-calculator`,
      lastmod: SITEMAP_LASTMOD,
      changefreq: 'monthly',
      priority: '0.85',
    },
    {
      url: `${baseUrl}/mosque-finder`,
      lastmod: SITEMAP_LASTMOD,
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
      'Cache-Control': SITEMAP_CACHE_CONTROL,
    },
  });
}
