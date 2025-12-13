const CACHE_NAME = 'stimmungstagebuch-cache-v3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  '/Stimmung/', 
  '/Stimmung/index.html',
  './UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7W0Q5n-wU.woff2',
  './chart.umd.js',
  './tailwind.css',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];


self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache: ' + CACHE_NAME);
        return cache.addAll(urlsToCache).catch(error => {
            console.error('Caching failed during install:', error);
            throw error; 
        });
      })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        const responseToCache = response.clone();
        
        if (urlsToCache.includes(event.request.url) || event.request.url.startsWith('https://cdn.')) {
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
        }
        
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
          })
          .catch(error => {
            console.error('Network and Cache failed:', error, event.request.url);
            throw error;
          });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});
