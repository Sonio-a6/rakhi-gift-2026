const CACHE_NAME = 'rakhi-pwa-v200';

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

// Service Worker Fetch Event
self.addEventListener('fetch', (event) => {
  // Let the browser handle MP4 video natively without SW interception for 100% Chrome video support
  if (event.request.url.includes('.mp4')) {
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
