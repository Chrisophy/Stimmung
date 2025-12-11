// sw.js
// Version des Caches. Bei jeder Änderung der Dateien muss diese Nummer erhöht werden,
// damit der Browser den alten Cache verwirft und den neuen lädt.
const CACHE_NAME = 'stimmung-cache-v2'; 

// Liste aller Dateien, die für den Offline-Betrieb benötigt werden.
// Wichtig: Nutzen Sie relative Pfade (./) und fügen Sie ALLE CDN-Links hinzu.
const urlsToCache = [
  // Hauptdateien der PWA
  './', // Start-URL (oft index.html)
  './index.html',
  './manifest.json',
  
  // Service Worker selbst (muss gecached werden)
  './sw.js', 

  // --- CDN-Abhängigkeiten (UNBEDINGT auf korrekte URLs prüfen!) ---
  // Tailwind CSS (Beispiel-Version)
  'https://cdn.tailwindcss.com/2.2.19/tailwind.min.css',
  
  // Chart.js (Beispiel-Version)
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js', 
  
  // Optionale interne Skripte, falls Ihr Code ausgelagert ist
  // './app.js', 
  // './style.css' 
];

// 1. INSTALL-Phase: Dateien in den Cache legen
self.addEventListener('install', event => {
  console.log('[Service Worker] Installiere und cache statische Assets...');
  // waitUntil sorgt dafür, dass die Installation nicht abgeschlossen wird, 
  // bevor alle Dateien im Cache sind (oder es fehlschlägt).
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache)
          .catch(error => {
            // Dies ist entscheidend! Wenn das Caching von z.B. einem CDN-Link fehlschlägt,
            // wird die PWA-Installation abgebrochen.
            console.error('[Service Worker] Caching der Assets fehlgeschlagen:', error);
            // Bei Fehler: Werfen Sie einen Fehler, um die Installation abzubrechen.
            throw error; 
          });
      })
  );
});

// 2. ACTIVATE-Phase: Aufräumen alter Caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Aktiviere...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Lösche alten Cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Unmittelbare Kontrolle über die Seite übernehmen
  return self.clients.claim();
});

// 3. FETCH-Phase: Inhalte aus dem Cache bereitstellen (Cache-First Strategie)
self.addEventListener('fetch', event => {
  // Ignoriere Anfragen, die nicht von der App selbst stammen (z.B. Chrome-Erweiterungen)
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Wenn die Datei im Cache gefunden wird, diese zurückgeben
        if (response) {
          return response;
        }
        
        // Andernfalls: Gehe zum Netzwerk
        return fetch(event.request);
      })
  );
});
