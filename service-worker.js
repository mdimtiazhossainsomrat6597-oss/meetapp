// MeetApp Service Worker — v2.0
// Handles: Caching, Offline, Push Notifications, Background Sync

const CACHE_VERSION = 'meetapp-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

const STATIC_ASSETS = [
  '/meetapp/',
  '/meetapp/index.html',
  '/meetapp/manifest.json',
  '/meetapp/icons/icon-192x192.png',
  '/meetapp/icons/icon-512x512.png'
];

// ─── Install ───────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing MeetApp Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(k => k.startsWith('meetapp-') && k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map(k => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch (Offline Support) ───────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip non-GET and chrome-extension requests
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension')) return;

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // Return cache, update in background
        fetchAndCache(request);
        return cachedResponse;
      }
      return fetchAndCache(request);
    }).catch(() => {
      // Offline fallback
      if (request.destination === 'document') {
        return caches.match('/meetapp/index.html');
      }
      return new Response('Offline', { status: 503 });
    })
  );
});

async function fetchAndCache(request) {
  try {
    const response = await fetch(request);
    if (!response || response.status !== 200 || response.type === 'opaque') {
      return response;
    }
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || new Response('Network error', { status: 408 });
  }
}

// ─── Push Notification (Web Push) ──────────────────────────
self.addEventListener('push', event => {
  console.log('[SW] Push received');

  let data = {
    title: 'MeetApp',
    body: 'নতুন নোটিফিকেশন!',
    icon: '/meetapp/icons/icon-192x192.png',
    badge: '/meetapp/icons/icon-72x72.png',
    url: '/meetapp/',
    tag: 'meetapp-general',
    vibrate: [100, 50, 100],
    requireInteraction: false
  };

  if (event.data) {
    try {
      const pushed = event.data.json();
      data = { ...data, ...pushed };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: { url: data.url },
    vibrate: data.vibrate,
    requireInteraction: data.requireInteraction,
    actions: data.actions || [
      { action: 'open', title: '📱 খুলুন' },
      { action: 'close', title: '✖ বাদ দিন' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ─── Notification Click ─────────────────────────────────────
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/meetapp/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // যদি app খোলা থাকে, focus করুন
      for (const client of clientList) {
        if (client.url.includes('/meetapp/') && 'focus' in client) {
          return client.focus();
        }
      }
      // না হলে নতুন window খুলুন
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── Push Subscription Change ───────────────────────────────
self.addEventListener('pushsubscriptionchange', event => {
  console.log('[SW] Subscription changed, re-subscribing...');
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then(subscription => {
        // নতুন subscription আপনার server-এ পাঠান
        return fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
      })
  );
});

// ─── Background Sync ────────────────────────────────────────
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'meetapp-sync') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    const response = await fetch('/meetapp/api/sync');
    console.log('[SW] Sync complete:', response.status);
  } catch (err) {
    console.log('[SW] Sync failed, will retry:', err);
    throw err; // retry করবে
  }
}

// ─── Message from App ───────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CACHE_URLS') {
    caches.open(DYNAMIC_CACHE).then(cache => cache.addAll(event.data.urls));
  }
});

console.log('[SW] MeetApp Service Worker loaded ✓');
