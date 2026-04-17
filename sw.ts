const CACHE_NAME = 'canva-board-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/.github/1.png',
    '/.github/2.png'
];

// Install event - caching assets
self.addEventListener('install', (event: any) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate event - cleaning old caches
self.addEventListener('activate', (event: any) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
});

// Fetch event - serving from cache or network
self.addEventListener('fetch', (event: any) => {
    // Only handle GET requests for our assets
    if (event.request.method !== 'GET') return;

    // Skip API calls - they are handled by script.ts with IndexedDB logic
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request);
        })
    );
});
