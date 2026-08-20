const BASE_URL = 'https://hadithapi.com/api';

type FetchOptions = {
  cache?: RequestCache;
  revalidate?: number | false;
  tags?: string[];
};

export class HadithApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfterMs?: number
  ) {
    super(message);
    this.name = 'HadithApiError';
  }
}

export async function hadithFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const apiKey = process.env.HADITH_API_KEY?.trim();
  if (!apiKey) {
    throw new HadithApiError(503, 'HadithAPI is not configured.');
  }

  const { cache = 'force-cache', revalidate, tags } = options;

  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${endpoint}${separator}apiKey=${encodeURIComponent(apiKey)}`;

  const nextOptions: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
    cache,
    next: {},
  };

  if (revalidate !== undefined) {
    nextOptions.next = { revalidate };
  }

  if (tags && tags.length > 0) {
    nextOptions.next = { ...nextOptions.next, tags };
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        ...nextOptions,
        signal: AbortSignal.timeout(8_000),
      });

      if (!response.ok) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const retryAfterMs = retryAfterHeader
          ? Number(retryAfterHeader) * 1000
          : undefined;

        throw new HadithApiError(
          response.status,
          `HadithAPI error: ${response.status} ${response.statusText}`,
          retryAfterMs
        );
      }

      const data = (await response.json()) as T;
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      if (error instanceof HadithApiError && error.status !== 429 && error.status < 500) {
        throw error;
      }
      if (attempt < 2) {
        const delayMs =
          error instanceof HadithApiError && error.retryAfterMs
            ? error.retryAfterMs
            : 750 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError ?? new Error('Failed after 3 attempts');
}
