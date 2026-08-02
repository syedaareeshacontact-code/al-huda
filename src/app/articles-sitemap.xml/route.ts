import {
  getAllArticleSummaries,
  getArticleCategories,
} from '@/lib/articles';
import { PRIMARY_AUTHOR } from '@/lib/author-profile';
import { getSiteOrigin } from '@/lib/seo';
import { SITEMAP_CACHE_CONTROL } from '@/lib/sitemap-config';

export const dynamic = 'force-static';
export const revalidate = false;

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderUrl(url: string, lastModified: string) {
  return `<url><loc>${escapeXml(url)}</loc><lastmod>${escapeXml(lastModified)}</lastmod></url>`;
}

export function GET() {
  const origin = getSiteOrigin();
  const articles = getAllArticleSummaries();
  const categories = getArticleCategories();
  const latestUpdate = articles.reduce(
    (latest, article) => (article.updatedAt > latest ? article.updatedAt : latest),
    '1970-01-01'
  );
  const urls = [
    renderUrl(`${origin}/articles`, latestUpdate),
    renderUrl(`${origin}${PRIMARY_AUTHOR.href}`, latestUpdate),
    ...categories.map((category) =>
      renderUrl(
        `${origin}/articles/category/${category.slug}`,
        category.latestUpdatedAt
      )
    ),
    ...articles.map((article) =>
      renderUrl(`${origin}${article.href}`, article.updatedAt)
    ),
  ].join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': SITEMAP_CACHE_CONTROL,
    },
  });
}
