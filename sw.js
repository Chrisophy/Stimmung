// sw.js
const CACHE_NAME = 'stimmung-cache-v1';
const urlsToCache = [
  // Ihre wichtigsten Dateien
  '/Stimmung/', // oder './'
  '/Stimmung/index.html',
  // Hier müssten Sie auch die CDN-Links (Chart.js, Tailwind) einfügen, wenn Sie sie cachen wollen
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
