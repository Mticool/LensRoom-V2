// LensRoom Service Worker v2.0
// Расширенное кеширование, push-уведомления и офлайн режим

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `lensroom-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `lensroom-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `lensroom-images-${CACHE_VERSION}`;
const API_CACHE = `lensroom-api-${CACHE_VERSION}`;

// Лимиты размера кешей
const CACHE_LIMITS = {
  images: 100,
  dynamic: 50,
  api: 30,
};

// Ресурсы для предварительного кеширования
const PRECACHE_ASSETS = [
  '/',
  '/create',
  '/pricing',
  '/manifest.json',
  '/icon.svg',
];

// Паттерны для кеширования
const CACHE_PATTERNS = {
  // Статические ресурсы Next.js - кешируем навсегда
  static: [
    /\/_next\/static\/.*/,
    /\.(?:js|css|woff2?|ttf|otf|eot)$/,
  ],
  // Изображения - кешируем с лимитом
  images: [
    /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico)$/,
    /\/_next\/image\?.*/,
    /supabase.*storage/,
  ],
  // API которые можно кешировать (read-only данные)
  api: [
    /\/api\/effects/,
    /\/api\/styles/,
    /\/api\/models/,
  ],
  // HTML страницы
  html: [
    /^\/$/,
    /^\/create/,
    /^\/pricing/,
    /^\/inspiration/,
    /^\/blog/,
  ],
};

// === INSTALLATION ===

self.addEventListener('install', (event) => {
  console.log('[SW] Installing v2...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Precache failed:', error);
      })
  );
});

// === ACTIVATION ===

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v2...');
  
  event.waitUntil(
    Promise.all([
      // Очистка старых кешей
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Удаляем кеши старых версий
              return name.startsWith('lensroom-') && !name.includes(CACHE_VERSION);
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Сразу берём контроль
      self.clients.claim(),
    ])
  );
});

// === CACHING STRATEGIES ===

/**
 * Cache First - для статики (JS, CSS, шрифты)
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', request.url, error);
    throw error;
  }
}

/**
 * Network First с timeout - для HTML и API
 */
async function networkFirst(request, cacheName, timeout = 3000) {
  const cache = await caches.open(cacheName);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (response.ok && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Сеть недоступна или timeout - используем кеш
    const cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Serving from cache:', request.url);
      return cached;
    }
    throw error;
  }
}

/**
 * Stale While Revalidate - для изображений
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Запускаем обновление в фоне
  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok && response.status === 200) {
        await cache.put(request, response.clone());
        await limitCacheSize(cacheName, CACHE_LIMITS.images);
      }
      return response;
    })
    .catch(() => null);
  
  // Возвращаем кеш сразу, если есть
  return cached || fetchPromise;
}

/**
 * Network Only - для критических запросов
 */
async function networkOnly(request) {
  return fetch(request);
}

// === CACHE MANAGEMENT ===

/**
 * Ограничивает размер кеша
 */
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    // Удаляем самые старые записи
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
    console.log(`[SW] Cleaned ${toDelete.length} items from ${cacheName}`);
  }
}

/**
 * Проверяет паттерн URL
 */
function matchesPattern(url, patterns) {
  return patterns.some((pattern) => pattern.test(url));
}

// === FETCH HANDLER ===

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Пропускаем не-GET запросы
  if (request.method !== 'GET') {
    return;
  }
  
  // Пропускаем Chrome extensions и другие протоколы
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Пропускаем запросы к другим доменам (кроме CDN и Supabase)
  const allowedHosts = [
    self.location.hostname,
    'ndhykojwzazgmgvjaqgt.supabase.co',
  ];
  if (!allowedHosts.some((host) => url.hostname.includes(host))) {
    return;
  }
  
  // Критические API - не кешируем (auth, генерация, оплата)
  const noCacheApis = [
    '/api/auth',
    '/api/generate',
    '/api/payment',
    '/api/user',
    '/api/admin',
    '/api/jobs',
  ];
  if (noCacheApis.some((api) => url.pathname.startsWith(api))) {
    return;
  }
  
  // Статические ресурсы Next.js
  if (matchesPattern(url.href, CACHE_PATTERNS.static)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  
  // Изображения
  if (matchesPattern(url.href, CACHE_PATTERNS.images)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }
  
  // Кешируемые API
  if (matchesPattern(url.pathname, CACHE_PATTERNS.api)) {
    event.respondWith(
      networkFirst(request, API_CACHE, 5000).catch(async () => {
        const cached = await caches.match(request);
        return cached || new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }
  
  // HTML страницы
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      networkFirst(request, DYNAMIC_CACHE, 5000).catch(async () => {
        // Fallback на главную
        const cached = await caches.match('/');
        return cached || new Response(
          '<!DOCTYPE html><html><body><h1>Offline</h1><p>Проверьте подключение к интернету</p></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html' } }
        );
      })
    );
    return;
  }
  
  // Остальное - network first
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// === PUSH NOTIFICATIONS ===

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    console.log('[SW] Push received:', data);
    
    const options = {
      body: data.body || 'Новое уведомление',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      vibrate: [100, 50, 100],
      tag: data.tag || 'lensroom-notification',
      renotify: data.renotify || false,
      requireInteraction: data.requireInteraction || false,
      data: {
        url: data.url || '/',
        type: data.type || 'general',
      },
      actions: data.actions || [
        { action: 'open', title: 'Открыть' },
        { action: 'dismiss', title: 'Закрыть' },
      ],
    };
    
    // Добавляем изображение если есть
    if (data.image) {
      options.image = data.image;
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'LensRoom', options)
    );
  } catch (error) {
    console.error('[SW] Push error:', error);
  }
});

// === NOTIFICATION CLICK ===

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  // Обрабатываем действие "dismiss"
  if (event.action === 'dismiss') {
    return;
  }
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Ищем уже открытое окно
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Открываем новое окно
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// === BACKGROUND SYNC ===

self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
  
  switch (event.tag) {
    case 'sync-generations':
      event.waitUntil(syncGenerations());
      break;
      
    case 'sync-analytics':
      event.waitUntil(syncAnalytics());
      break;
      
    default:
      console.log('[SW] Unknown sync tag:', event.tag);
  }
});

/**
 * Синхронизация незавершённых генераций
 */
async function syncGenerations() {
  try {
    // Получаем список ожидающих генераций из IndexedDB
    // (заглушка для будущей реализации)
    console.log('[SW] Syncing generations...');
  } catch (error) {
    console.error('[SW] Sync generations failed:', error);
  }
}

/**
 * Синхронизация аналитики
 */
async function syncAnalytics() {
  try {
    console.log('[SW] Syncing analytics...');
  } catch (error) {
    console.error('[SW] Sync analytics failed:', error);
  }
}

// === MESSAGE HANDLER ===

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  switch (event.data?.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then((names) =>
          Promise.all(names.map((name) => caches.delete(name)))
        )
      );
      break;
      
    case 'GET_CACHE_SIZE':
      event.waitUntil(getCacheSize().then((size) => {
        event.ports[0]?.postMessage({ type: 'CACHE_SIZE', size });
      }));
      break;
  }
});

/**
 * Получает общий размер кешей
 */
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    
    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

console.log('[SW] Service Worker v2 loaded');

