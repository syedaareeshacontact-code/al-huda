const CACHE_PREFIX = 'alhuda-';
const workerUrl = new URL(self.location.href);
const buildVersion = workerUrl.searchParams.get('v') || 'v3';
const STATIC_CACHE = `${CACHE_PREFIX}${buildVersion}-static`;
const API_CACHE = `${CACHE_PREFIX}${buildVersion}-api`;
const OFFLINE_URL = '/offline.html';
const PUSH_OPEN_TOKEN_QUERY_PARAM = 'push_open_token';
const PUSH_RECEIPT_DB_NAME = 'alhuda-push-receipts';
const PUSH_RECEIPT_STORE = 'receipts';
const PUSH_RECEIPT_SYNC_TAG = 'alhuda-push-receipts';
const PUSH_RECEIPT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const STATIC_PATH_PREFIXES = ['/logos/', '/banner/', '/basmalah/'];
const CACHEABLE_EXTERNAL_HOSTS = new Set([
  'api.quran.com',
  'ia801503.us.archive.org',
]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  // The replacement worker no longer serves cached Next.js module graphs.
  // Activate it immediately so existing alhuda-v2 caches are removed.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const staleKeys = keys.filter(
        (key) =>
          key.startsWith(CACHE_PREFIX) &&
          key !== STATIC_CACHE &&
          key !== API_CACHE
      );
      const isLegacyV2Upgrade = staleKeys.some((key) => key.startsWith('alhuda-v2'));

      await Promise.all(staleKeys.map((key) => caches.delete(key)));
      await self.clients.claim();
      await flushQueuedPushReceipts();

      // Existing production users can still be controlled by the unsafe v2
      // worker. Refresh those tabs once after its caches have been removed.
      if (isLegacyV2Upgrade) {
        const clients = await self.clients.matchAll({ type: 'window' });
        await Promise.all(
          clients.map((client) => client.navigate(client.url).catch(() => undefined))
        );
      }
    })()
  );
});

function isNextRuntimeRequest(request, url) {
  return (
    url.pathname.startsWith('/_next/') ||
    url.searchParams.has('_rsc') ||
    request.headers.get('RSC') === '1' ||
    request.headers.has('Next-Router-State-Tree') ||
    request.headers.has('Next-Router-Prefetch')
  );
}

function isCacheablePublicAsset(url) {
  return (
    url.origin === self.location.origin &&
    STATIC_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  );
}

function isCacheableExternalApi(url) {
  return CACHEABLE_EXTERNAL_HOSTS.has(url.hostname);
}

function isCacheableInternalApi(url) {
  return (
    url.origin === self.location.origin &&
    url.pathname === '/api/tafsir/ur'
  );
}

async function putIfCacheable(cacheName, request, response) {
  if (!response || !response.ok || response.type === 'opaque') {
    return;
  }

  const cacheControl = response.headers.get('Cache-Control') || '';
  if (/private|no-store/i.test(cacheControl)) {
    return;
  }

  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  await putIfCacheable(STATIC_CACHE, request, response);
  return response;
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    event.waitUntil(putIfCacheable(API_CACHE, request, response));
    return response;
  });

  if (cached) {
    event.waitUntil(network.catch(() => undefined));
    return cached;
  }

  return network;
}

async function postPushReceiptWithRetry(
  pathname,
  trackingToken,
  queueOnFailure = true
) {
  const retryDelays = [0, 250, 1_000];

  for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
    if (retryDelays[attempt] > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
    }

    try {
      const response = await fetch(pathname, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trackingToken }),
        keepalive: true,
      });
      if (response.ok || response.status === 400 || response.status === 401) {
        return true;
      }
    } catch {
      // A later bounded attempt can recover a short network interruption.
    }
  }

  if (queueOnFailure) {
    await queuePushReceipt(pathname, trackingToken);
  }
  return false;
}

function openPushReceiptDatabase() {
  if (!self.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = self.indexedDB.open(PUSH_RECEIPT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PUSH_RECEIPT_STORE)) {
        database.createObjectStore(PUSH_RECEIPT_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queuePushReceipt(pathname, trackingToken) {
  try {
    const database = await openPushReceiptDatabase();
    if (!database) return;

    await new Promise((resolve, reject) => {
      const transaction = database.transaction(PUSH_RECEIPT_STORE, 'readwrite');
      transaction.objectStore(PUSH_RECEIPT_STORE).put({
        key: `${pathname}:${trackingToken}`,
        pathname,
        trackingToken,
        queuedAt: Date.now(),
      });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    await self.registration.sync
      ?.register(PUSH_RECEIPT_SYNC_TAG)
      .catch(() => undefined);
  } catch {
    // IndexedDB/background sync are enhancements; notification display wins.
  }
}

async function listQueuedPushReceipts() {
  const database = await openPushReceiptDatabase();
  if (!database) return [];

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PUSH_RECEIPT_STORE, 'readonly');
    const request = transaction.objectStore(PUSH_RECEIPT_STORE).getAll();
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => reject(request.error);
  });
}

async function deleteQueuedPushReceipt(key) {
  const database = await openPushReceiptDatabase();
  if (!database) return;

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(PUSH_RECEIPT_STORE, 'readwrite');
    transaction.objectStore(PUSH_RECEIPT_STORE).delete(key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

async function flushQueuedPushReceipts() {
  try {
    const receipts = await listQueuedPushReceipts();
    for (const receipt of receipts.slice(0, 20)) {
      const expired =
        Date.now() - Number(receipt.queuedAt || 0) > PUSH_RECEIPT_MAX_AGE_MS;
      const recorded = expired
        ? true
        : await postPushReceiptWithRetry(
            String(receipt.pathname || ''),
            String(receipt.trackingToken || ''),
            false
          );
      if (recorded) {
        await deleteQueuedPushReceipt(receipt.key);
      }
    }
  } catch {
    // A later sync/push/click event gets another chance to flush the queue.
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Next.js documents, RSC payloads and hashed runtime assets must always use
  // the browser/CDN cache. Caching them here can mix modules from two deploys.
  if (isNextRuntimeRequest(request, url)) {
    return;
  }

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).catch(async () => {
        const fallback = await caches.match(OFFLINE_URL);
        return (
          fallback ||
          new Response('Offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        );
      })
    );
    return;
  }

  if (isCacheablePublicAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isCacheableExternalApi(url) || isCacheableInternalApi(url)) {
    event.respondWith(staleWhileRevalidate(event, request));
  }
});

self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: 'Read al Quran',
      body: event.data?.text() || 'Open your Quran reminder.',
    };
  }

  const title = payload.title || 'Read al Quran';
  const options = {
    body: payload.body || 'Open your Quran reminder.',
    icon: payload.icon || '/logos/pwa-192.png',
    badge: payload.badge || '/logos/notification-badge-96.png',
    tag: payload.tag || 'read-al-quran-reminder',
    renotify: Boolean(payload.renotify),
    data: {
      url: payload.url || payload.data?.url || '/',
      ...(payload.data || {}),
    },
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);

      const trackingToken = payload.data?.trackingToken;
      if (!trackingToken) {
        return;
      }

      await Promise.allSettled([
        flushQueuedPushReceipts(),
        postPushReceiptWithRetry('/api/push/displayed', trackingToken),
      ]);
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;
  const trackingToken = event.notification.data?.trackingToken;
  const openedUrl = new URL(targetUrl);

  // The background request below can be interrupted by the browser. The page
  // receives this signed token in the URL fragment as a second, reliable
  // chance to record the open. Fragments are not sent in HTTP requests or
  // referrers, so the signed receipt is kept out of server/CDN logs.
  if (trackingToken && openedUrl.origin === self.location.origin) {
    const originalHash = openedUrl.hash.slice(1);
    const receiptFragment = new URLSearchParams({
      [PUSH_OPEN_TOKEN_QUERY_PARAM]: trackingToken,
      ...(originalHash ? { target_hash: originalHash } : {}),
    });
    openedUrl.hash = receiptFragment.toString();
  }
  const trackedTargetUrl = openedUrl.href;

  event.waitUntil(
    Promise.allSettled([
      flushQueuedPushReceipts(),
      trackingToken
        ? postPushReceiptWithRetry('/api/push/open', trackingToken)
        : Promise.resolve(),
      (async () => {
        const clientsList = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });

        for (const client of clientsList) {
          if (client.url === targetUrl && 'focus' in client) {
            try {
              await client.focus();
              if (trackedTargetUrl !== targetUrl && 'navigate' in client) {
                return (await client.navigate(trackedTargetUrl)) || client;
              }
              return client;
            } catch {
              break;
            }
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(trackedTargetUrl);
        }
        return undefined;
      })(),
    ])
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === PUSH_RECEIPT_SYNC_TAG) {
    event.waitUntil(flushQueuedPushReceipts());
  }
});
