import 'server-only';

interface RemoteDownloadOptions {
  sourceUrl: string;
  fileName: string;
  signal?: AbortSignal;
}

function sanitizeDownloadFileName(fileName: string): string {
  const sanitized = fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized || 'read-al-quran-download';
}

export function buildProtectedDownloadHeaders(
  fileName: string,
  contentType: string,
  contentLength?: number
): Headers {
  const headers = new Headers({
    'Cache-Control': 'private, no-store, max-age=0',
    'Content-Disposition': `attachment; filename="${sanitizeDownloadFileName(fileName)}"`,
    'Content-Type': contentType,
    'Cross-Origin-Resource-Policy': 'same-origin',
    Pragma: 'no-cache',
    Vary: 'Cookie',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow',
  });

  if (contentLength && contentLength > 0) {
    headers.set('Content-Length', String(contentLength));
  }

  return headers;
}

export function unauthorizedDownloadResponse(): Response {
  return Response.json(
    {
      error: 'Authentication required',
      message: 'Please sign in or create an account to download this file.',
    },
    {
      status: 401,
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    }
  );
}

export async function createRemoteDownloadResponse({
  sourceUrl,
  fileName,
  signal,
}: RemoteDownloadOptions): Promise<Response> {
  const upstream = await fetch(sourceUrl, {
    cache: 'no-store',
    headers: {
      Accept: 'audio/*,application/octet-stream;q=0.9,*/*;q=0.5',
    },
    redirect: 'follow',
    signal,
  });

  if (!upstream.ok || !upstream.body) {
    throw new Error(`Remote download source failed (${upstream.status})`);
  }

  const contentType =
    upstream.headers.get('content-type')?.split(';')[0]?.trim() ||
    'application/octet-stream';
  const isAudioResponse =
    contentType.startsWith('audio/') ||
    contentType === 'application/ogg' ||
    contentType === 'application/octet-stream' ||
    contentType === 'binary/octet-stream';

  if (!isAudioResponse) {
    await upstream.body.cancel();
    throw new Error(`Remote download source returned ${contentType}`);
  }

  const contentLength = Number(upstream.headers.get('content-length'));

  return new Response(upstream.body, {
    status: 200,
    headers: buildProtectedDownloadHeaders(
      fileName,
      contentType,
      Number.isFinite(contentLength) ? contentLength : undefined
    ),
  });
}
