const CACHE_NAME = 'rakhi-pwa-v120';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => caches.delete(cache))
      );
    })
  );
  self.clients.claim();
});

// Network-First with Cache Fallback for Chrome
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request, { cache: "no-cache" })
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
