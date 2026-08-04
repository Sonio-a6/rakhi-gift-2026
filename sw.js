const CACHE_NAME = 'rakhi-pwa-v999';

// Unregister Service Worker and bypass cache
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          return caches.delete(cache);
        })
      );
    })
  );
  self.clients.claim();
});

// Network-Only Strategy (No stale cache locks)
self.addEventListener('fetch', (event) => {
  return;
});
