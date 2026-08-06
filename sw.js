const CACHE_NAME = 'rakhi-pwa-v60000';

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

// Network-Only Strategy
self.addEventListener('fetch', (event) => {
  return;
});
