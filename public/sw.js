// LensRoom Service Worker v9 - Chunk-safe: never cache HTML or _next/static
const CACHE_VERSION = 'v9';
const STATIC_CACHE = `lensroom-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `lensroom-images-${CACHE_VERSION}`;

// Only cache images, not JS/CSS/HTML
const CACHE_PATTERNS = {
  images: [
    /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico)$/,
    /supabase.*storage/,
  ],
};

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) => {
        return Promise.all(
          names
            .filter((name) => name.startsWith('lensroom-') && !name.includes(CACHE_VERSION))
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      self.clients.claim(),
    ])
  );
});

function matchesPattern(url, patterns) {
  return patterns.some((pattern) => pattern.test(url));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;
  
  // Never intercept _next/static - let browser load directly
  if (url.pathname.startsWith('/_next/static/')) return;
  
  // Only cache images
  if (matchesPattern(url.href, CACHE_PATTERNS.images)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((names) =>
      Promise.all(names.map((name) => caches.delete(name)))
    );
  }
});

console.log('[SW] Loaded v7');
