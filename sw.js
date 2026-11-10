const CACHE_NAME = 'kr2melo-v5.3.46-offline-20261109';
const CORE = ['./', 'index.html', 'mobile.html', 'consulta.html', 'styles.css', 'mobile.css', 'consulta.css', 'sync.js', 'financial.js', 'auditor.js', 'app.js', 'backup-validator.js', 'history-bills.js', 'dashboard.js', 'offline-start.js', 'reading-average.js', 'mobile.js', 'consulta.js', 'manifest.webmanifest', 'assets/logo.png', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/assinatura.png'];
const FRESH_FILES = /(?:\.html$|\.js$|\.css$|manifest\.webmanifest$)/i;

self.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('kr2melo-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isFresh = request.mode === 'navigate' || FRESH_FILES.test(url.pathname);
  if (isFresh) {
    event.respondWith(fetch(request).then(response => {
      if (response?.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request).then(hit => {
      if (hit) return hit;
      if (request.mode === 'navigate') {
        return (url.pathname.includes('mobile') || url.href.includes('mobile.html')) ? caches.match('mobile.html') : caches.match('index.html');
      }
      return Response.error();
    })));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => { if (response?.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())); return response; })));
});
