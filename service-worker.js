const CACHE_NAME = 'stimmungstagebuch-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // Hier weitere Assets hinzufügen, z.B. eigene CSS/JS-Dateien, wenn Sie diese nutzen
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.js',
  // Beispiel Icons (passen Sie die Pfade an, wenn Sie sie anders nennen)
  '/icons/icon-192x192.png', 
  '/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache).catch(error => {
            console.error('Caching failed:', error);
        });
      })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache Hit - geben Sie die gecachte Ressource zurück
        if (response) {
          return response;
        }
        // Cache Miss - versuchen Sie es mit dem Netzwerk
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Lösche alte Caches
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});
