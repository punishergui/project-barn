const CACHE = 'project-barn-v1';
const STATIC = [
  '/static/css/style.css',
  '/static/js/app.js',
  '/static/manifest.json',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/uploads/')) return;
  if (e.request.url.includes('/static/')) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
    return;
  }
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
