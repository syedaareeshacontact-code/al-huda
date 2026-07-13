const CACHE_PREFIX = 'alhuda-';
const workerUrl = new URL(self.location.href);
const buildVersion = workerUrl.searchParams.get('v') || 'v3';
const STATIC_CACHE = `${CACHE_PREFIX}${buildVersion}-static`;
const API_CACHE = `${CACHE_PREFIX}${buildVersion}-api`;
const OFFLINE_URL = '/offline.html';

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
    badge: payload.badge || '/logos/favicon-48.png',
    tag: payload.tag || 'read-al-quran-reminder',
    renotify: Boolean(payload.renotify),
    data: {
      url: payload.url || payload.data?.url || '/',
      ...(payload.data || {}),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientsList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});
