import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

interface PushEventLike {
  data: { json: () => unknown };
  waitUntil: (promise: Promise<unknown>) => void;
}

function loadPushHandler(fetchMock: ReturnType<typeof vi.fn>) {
  const listeners = new Map<string, (event: never) => void>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const self = {
    location: {
      href: 'https://www.readalquran.online/sw.js?v=test',
      origin: 'https://www.readalquran.online',
    },
    registration: { showNotification },
    addEventListener: vi.fn(
      (name: string, listener: (event: never) => void) => {
        listeners.set(name, listener);
      }
    ),
    skipWaiting: vi.fn(),
    clients: {
      claim: vi.fn(),
      matchAll: vi.fn().mockResolvedValue([]),
      openWindow,
    },
  };
  const source = readFileSync(`${process.cwd()}/public/sw.js`, 'utf8');

  runInNewContext(source, {
    self,
    URL,
    URLSearchParams,
    Response,
    fetch: fetchMock,
    caches: {
      open: vi.fn(),
      keys: vi.fn(),
      match: vi.fn(),
      delete: vi.fn(),
    },
    setTimeout: (callback: () => void) => {
      callback();
      return 0;
    },
  });

  const pushHandler = listeners.get('push');
  if (!pushHandler) {
    throw new Error('Service worker did not register its push handler.');
  }

  return {
    pushHandler: pushHandler as unknown as (event: PushEventLike) => void,
    notificationClickHandler: listeners.get('notificationclick') as unknown as
      | ((event: {
          notification: {
            close: () => void;
            data: { url: string; trackingToken: string };
          };
          waitUntil: (promise: Promise<unknown>) => void;
        }) => void)
      | undefined,
    showNotification,
    openWindow,
  };
}

async function dispatchPush(
  pushHandler: (event: PushEventLike) => void,
  trackingToken = 'signed-tracking-token'
) {
  let pending: Promise<unknown> | null = null;
  pushHandler({
    data: {
      json: () => ({
        title: 'Reminder',
        body: 'Read today',
        data: { trackingToken },
      }),
    },
    waitUntil: (promise) => {
      pending = promise;
    },
  });

  await pending;
}

describe('service worker display receipts', () => {
  it('retries non-success receipt responses without showing twice', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    const { pushHandler, showNotification } = loadPushHandler(fetchMock);

    await dispatchPush(pushHandler);

    expect(showNotification).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/push/displayed',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'signed-tracking-token' }),
      })
    );
  });

  it('keeps the notification visible when every receipt attempt fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    const { pushHandler, showNotification } = loadPushHandler(fetchMock);

    await expect(dispatchPush(pushHandler)).resolves.toBeUndefined();
    expect(showNotification).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('passes the open token in a fragment instead of request-visible query data', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const { notificationClickHandler, openWindow } = loadPushHandler(fetchMock);
    expect(notificationClickHandler).toBeTypeOf('function');
    let pending: Promise<unknown> | null = null;

    notificationClickHandler!({
      notification: {
        close: vi.fn(),
        data: {
          url: '/quran#ayah-42',
          trackingToken: 'signed-open-token',
        },
      },
      waitUntil: (promise) => {
        pending = promise;
      },
    });
    await pending;

    const openedUrl = new URL(String(openWindow.mock.calls[0]?.[0]));
    const fragment = new URLSearchParams(openedUrl.hash.slice(1));
    expect(openedUrl.searchParams.has('push_open_token')).toBe(false);
    expect(fragment.get('push_open_token')).toBe('signed-open-token');
    expect(fragment.get('target_hash')).toBe('ayah-42');
  });
});
