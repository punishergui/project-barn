const CACHE = 'barn-shell-v1';
const SHELL = ['/', '/dashboard', '/projects', '/shows', '/tasks', '/settings'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }
  event.respondWith(caches.match(request).then((cached) => {
    const network = fetch(request).then((response) => {
      if (request.url.includes('/dashboard')) {
        caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      }
      return response;
    }).catch(() => cached || caches.match('/dashboard'));
    return cached || network;
  }));
});
