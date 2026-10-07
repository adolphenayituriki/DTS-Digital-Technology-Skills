/* DTS service worker - what makes the site open with no connection.

   Strategy, in one line per case:
     navigations   network first, cached app shell when offline
     build assets  served from cache, refreshed in the background
     /api/*        never touched - live data must not be faked from a cache
     other origins  (Google Fonts, the API host) left alone

   Only GET requests from this origin are handled; everything else falls
   through to the normal browser fetch. */

const CACHE = 'dts-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add('/')) // the app shell, so a first offline visit has something
      .then(() => self.skipWaiting()) // activate without waiting for old tabs to close
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // fonts, cross-origin API
  if (url.pathname.startsWith('/api/')) return;    // live data - never cached

  // A page navigation wants a whole document. Take the network when it is
  // there (so deploys show up), keep a fresh copy of the shell, and fall back
  // to that copy when the network is not there.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

// Serve the cached file immediately, then update it for next time. Build
// assets are content-hashed, so a cached copy is always the right one; photos
// and other stable files simply get refreshed in the background.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined); // offline: the cached copy is the answer

  return cached || (await network) || Response.error();
}
