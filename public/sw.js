const CACHE_NAME = 'orme-cache-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/scarpa.png'
];

// Installazione: cache iniziale
self.addEventListener('install', event => {
    self.skipWaiting(); // Forza il nuovo SW a diventare attivo subito
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Attivazione: pulizia vecchie cache
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Prende subito il controllo delle pagine aperte
    );
});

// Strategia: Stale-While-Revalidate
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    // Aggiorna la cache con la nuova risposta se è valida
                    if (networkResponse && networkResponse.status === 200) {
                        const cacheCopy = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, cacheCopy);
                        });
                    }
                    return networkResponse;
                }).catch(() => {
                    // Se siamo offline e non c'è in cache, fallisce graziosamente
                });

                // Ritorna la cache subito, ma l'update avviene in background
                return cachedResponse || fetchPromise;
            })
    );
});
