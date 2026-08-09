export const ADSENSE_CLIENT_ID = 'ca-pub-2876888675525619';

const MONETIZED_SURAH_PATHS = new Set([
  '/surah/18-al-kahf',
  '/surah/36-yaseen',
]);

function normalizePathname(pathname: string) {
  const trimmedPathname = pathname.trim();
  if (!trimmedPathname.startsWith('/')) {
    return '';
  }

  return trimmedPathname === '/'
    ? trimmedPathname
    : trimmedPathname.replace(/\/+$/, '');
}

export function shouldLoadAdSense(pathname: string | null | undefined) {
  if (!pathname) {
    return false;
  }

  const normalizedPathname = normalizePathname(pathname);

  return (
    normalizedPathname === '/' ||
    normalizedPathname === '/articles' ||
    normalizedPathname.startsWith('/articles/') ||
    MONETIZED_SURAH_PATHS.has(normalizedPathname)
  );
}
