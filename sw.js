const CACHE_NAME = 'rakhi-pwa-v60';
const ASSETS_TO_CACHE = [
  './',
  './index.html?v=300000',
  './styles.css?v=300000',
  './app.js?v=300000',
  './manifest.json',
  './assets/rakhi_hero.png',
  './assets/rakhi_wrist.png',
  './assets/gift_box.png',
  './assets/cousin_bond.png',
  './assets/photos/photo1.jpg',
  './assets/photos/photo2.jpg',
  './assets/photos/photo3.jpg',
  './assets/photos/photo4.png',
  './assets/photos/photo5.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-First Strategy with Video Streaming Bypass
self.addEventListener('fetch', (event) => {
  // Bypass Service Worker completely for video files & range requests so mobile streaming works 100%
  if (event.request.url.includes('.mp4') || (event.request.headers.has('range') && event.request.headers.get('range'))) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
          if (response) return response;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
