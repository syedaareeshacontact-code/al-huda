import { readFileSync } from 'node:fs';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const SIX_MONTHS_SECONDS = 60 * 60 * 24 * 180;
const APP_VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_APP_VERSION ||
  `build-${Date.now().toString(36)}`;
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isProductionDeployment =
  process.env.VERCEL_ENV === 'production' ||
  process.env.DEPLOYMENT_ENV === 'production';

function slugifyAscii(input) {
  return input
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

const surahIndex = JSON.parse(
  readFileSync(new URL('./src/data/surah-index.json', import.meta.url), 'utf8')
);
const legacyQuranRedirects = surahIndex.flatMap((surah) => {
  const canonicalSlug = `${surah.id}-${slugifyAscii(surah.surahName)}`;

  return [
    {
      source: `/quran/${surah.id}`,
      destination: `/surah/${canonicalSlug}`,
      permanent: true,
    },
    {
      source: `/quran/${surah.id}/ayah/:ayah`,
      destination: `/surah/${canonicalSlug}/ayah/:ayah`,
      permanent: true,
    },
  ];
});

if (
  isProductionDeployment &&
  (!configuredSiteUrl ||
    !configuredSiteUrl.startsWith('https://') ||
    configuredSiteUrl.includes('localhost'))
) {
  throw new Error(
    'Production deployments require NEXT_PUBLIC_SITE_URL to be a public HTTPS origin.'
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
  },
  // Optimize production builds
  productionBrowserSourceMaps: false,
  
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: SIX_MONTHS_SECONDS,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  experimental: {
    optimizePackageImports: ['lucide-react', 'next-themes'],
    // Streaming optimizations
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  serverExternalPackages: ['pdfkit'],
  outputFileTracingIncludes: {
    '/*': ['./src/data/hadith-api/**/*'],
  },
  async redirects() {
    return [
      {
        source: '/quran',
        destination: '/surah',
        permanent: true,
      },
      ...legacyQuranRedirects,
      {
        source: '/hadith/tirmidhi',
        destination: '/hadith/al-tirmidhi',
        permanent: true,
      },
      {
        source: '/hadith/al-silsila-sahiha',
        destination: '/hadith',
        permanent: false,
      },
      {
        source: '/hadith/musnad-ahmad',
        destination: '/hadith',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self), microphone=(), camera=()',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/logos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: `public, max-age=${ONE_YEAR_SECONDS}, immutable`,
          },
        ],
      },
      {
        source: '/banner/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: `public, max-age=${ONE_YEAR_SECONDS}, immutable`,
          },
        ],
      },
      {
        source: '/basmalah/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: `public, max-age=${ONE_YEAR_SECONDS}, immutable`,
          },
        ],
      },
      {
        source: '/sitemaps/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
          {
            key: 'Content-Type',
            value: 'application/xml; charset=utf-8',
          },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
      {
        source: '/BingSiteAuth.xml',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/xml; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/surah-pdfs/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Content-Type',
            value: 'application/pdf',
          },
        ],
      },
      {
        source: '/_next/static/media/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
