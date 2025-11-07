const CACHE_NAME = 'camara-pwa-v1'
const urlsToCache = [
    '/camara-pwa/',
    '/camara-pwa/app.js',
    '/camara-pwa/index.html',
    '/camara-pwa/img/icons',
    '/camara-pwa/manifest.json'
];


self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Cache abierto');
                return cache.addAll(urlsToCache);
            })
    );
});


self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                if (response) {
                    return response; 
                }
                return fetch(event.request);
            })
    );
});


self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );

});
