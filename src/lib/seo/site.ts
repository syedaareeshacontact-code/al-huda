export const SITE_NAME = 'Read al Quran';
export const SITE_DESCRIPTION =
  'Read the Quran in Arabic with Urdu and English translations. Listen to recitation, find a verse, and continue from your saved reading position.';
export const DEFAULT_OG_IMAGE = '/og?kind=surah-index';

export function normalizeSiteOrigin(value: string): string {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without a path, query or credentials.');
  }
  return url.origin;
}

export function getSiteOrigin() {
  return normalizeSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.readalquran.online');
}

export function getSiteName() { return SITE_NAME; }

export function toAbsoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return new URL(path).href;
  if (path.startsWith('//')) throw new Error('Protocol-relative URLs are not supported.');
  return new URL(path.startsWith('/') ? path : `/${path}`, `${getSiteOrigin()}/`).href;
}

export function canonicalUrl(path: string) {
  const url = new URL(toAbsoluteUrl(path));
  if (url.origin !== getSiteOrigin()) throw new Error('Canonical must belong to this website.');
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.href;
}
