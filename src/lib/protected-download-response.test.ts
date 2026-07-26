import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  buildProtectedDownloadHeaders,
  unauthorizedDownloadResponse,
} from './protected-download-response';

describe('protected download responses', () => {
  it('returns a non-cacheable authentication error', async () => {
    const response = unauthorizedDownloadResponse();

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toContain('no-store');
    await expect(response.json()).resolves.toMatchObject({
      error: 'Authentication required',
    });
  });

  it('creates attachment headers with a sanitized filename', () => {
    const headers = buildProtectedDownloadHeaders(
      'surah"\r\nX-Injected: true.pdf',
      'application/pdf',
      2048
    );

    expect(headers.get('content-disposition')).toBe(
      'attachment; filename="surah-X-Injected-true.pdf"'
    );
    expect(headers.get('content-type')).toBe('application/pdf');
    expect(headers.get('content-length')).toBe('2048');
    expect(headers.get('x-content-type-options')).toBe('nosniff');
  });
});
