const CACHE_NAME = 'rakhi-pwa-v50';
const ASSETS_TO_CACHE = [
  './',
  './index.html?v=150000',
  './styles.css?v=150000',
  './app.js?v=150000',
  './manifest.json',
  './assets/rakhi_hero.png',
  './assets/rakhi_wrist.png',
  './assets/gift_box.png',
  './assets/cousin_bond.png',
  './assets/rakhi_video.mp4',
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

// Network-First with Cache Fallback Strategy
self.addEventListener('fetch', (event) => {
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
