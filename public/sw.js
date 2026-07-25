/**
 * YODIT Service Worker
 * Background sync, push notifications, offline support
 */

const CACHE_NAME = 'yodit-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/admin.html',
  '/api.js',
  '/yodit-integration.js',
  '/yodit-api.js',
  '/manifest.json',
  '/icon.svg'
];

// Install
.this.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  this.skipWaiting();
});

// Activate - clean old caches
this.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  this.clients.claim();
});

// Fetch strategy: Cache first, then network
this.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Don't cache API calls
  if (event.request.url.includes('/api/') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cache immediately if available
      if (cachedResponse) {
        // Fetch new version in background for next time
        fetch(event.request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      
      // No cache - fetch from network
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return response;
      });
    })
  );
});

// Push notifications
this.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'New update from YODIT',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'yodit',
    requireInteraction: true,
    data: {
      url: data.url || '/',
      ...data
    }
  };
  event.waitUntil(
    this.registration.showNotification(data.title || 'YODIT', options)
  );
});

// Notification click - open app
this.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data.url || '/';
  event.waitUntil(
    this.clients.matchAll({ type: 'window' }).then(clients => {
      if (clients.length > 0) {
        clients[0].focus();
        clients[0].navigate(url);
      } else {
        this.clients.openWindow(url);
      }
    })
  );
});
