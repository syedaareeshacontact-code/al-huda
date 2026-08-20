/**
 * Keep authenticated download endpoints out of server-rendered HTML and RSC
 * payloads. This is obfuscation for crawl prevention, not a security layer;
 * the API still enforces authentication.
 */
export function encodeProtectedDownloadHref(href: string): string {
  return Array.from(href)
    .map((character) => character.charCodeAt(0).toString(16).padStart(4, '0'))
    .join('');
}

export function decodeProtectedDownloadHref(token: string): string | null {
  if (!/^(?:[0-9a-f]{4})+$/i.test(token)) {
    return null;
  }

  try {
    return token
      .match(/.{4}/g)
      ?.map((code) => String.fromCharCode(Number.parseInt(code, 16)))
      .join('') ?? null;
  } catch {
    return null;
  }
}
