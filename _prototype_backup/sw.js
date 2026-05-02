const CACHE_NAME = 'belgmap-v24';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  'https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.css',
  'https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.js',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap'
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
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  if (url.hostname.includes('events.mapbox.com')) {
      return; // Ne jamais cacher la télémétrie
  }

  // --- Stratégie Stale-While-Revalidate pour Mapbox ---
  // Permet une navigation instantanée sur les zones déjà visitées.
  if (url.hostname.includes('api.mapbox.com') && !url.pathname.includes('mapbox-gl-js')) {
      event.respondWith(
          caches.open('mapbox-tiles-cache').then((cache) => {
              return cache.match(event.request).then((cachedResponse) => {
                  // Lance la requête réseau en arrière-plan pour mettre à jour le cache silencieusement
                  const fetchPromise = fetch(event.request).then((networkResponse) => {
                      if (networkResponse && networkResponse.status === 200) {
                          cache.put(event.request, networkResponse.clone());
                      }
                      return networkResponse;
                  }).catch(() => {
                      // On ignore silencieusement si on est hors ligne
                  });

                  // Renvoie instantanément le cache s'il existe (zéro latence)
                  // sinon attend la réponse réseau
                  return cachedResponse || fetchPromise;
              });
          })
      );
      return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Mettre en cache les polices externes dynamiquement
        if (url.hostname.includes('fonts.gstatic.com')) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
            });
        }
        return networkResponse;
      });
    }).catch(() => {
        // Fallback en cas d'erreur réseau hors ligne
        return caches.match('./index.html');
    })
  );
});
