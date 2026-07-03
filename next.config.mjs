const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const SIX_MONTHS_SECONDS = 60 * 60 * 24 * 180;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
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
  async redirects() {
    return [
      {
        source: '/quran',
        destination: '/surah',
        permanent: true,
      },
      {
        source: '/quran/:id',
        destination: '/surah/:id',
        permanent: true,
      },
      {
        source: '/quran/:id/ayah/:ayah',
        destination: '/surah/:id/ayah/:ayah',
        permanent: true,
      },
      {
        source: '/sitemaps/:name.xml',
        destination: '/sitemaps/:name',
        permanent: true,
      },
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
            value: 'geolocation=(), microphone=(), camera=()',
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
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
