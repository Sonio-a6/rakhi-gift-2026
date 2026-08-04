const CACHE_NAME = 'rakhi-pwa-v140';

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

// Network-First with Cache Fallback for Chrome & Direct Pass for Video Range Requests
self.addEventListener('fetch', (event) => {
  // Bypass Service Worker for MP4 video streaming to support Range headers in PWA mode
  if (event.request.url.includes('.mp4') || event.request.headers.get('range')) {
    event.respondWith(fetch(event.request));
    return;
  }

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
