const CACHE_NAME = 'orme-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/scarpa.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
