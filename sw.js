// =============================================
// MeetApp Service Worker — Offline Support
// =============================================

const CACHE_NAME = 'meetapp-v1';
const OFFLINE_URL = '/';

// যে files সবসময় cache করব (App Shell)
const SHELL_FILES = [
  '/',
  '/index.html',
  '/icon.png',
  '/manifest.json',
];

// =============================================
// INSTALL — App Shell cache করো
// =============================================
self.addEventListener('install', function(event) {
  console.log('[SW] Installing MeetApp Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching app shell');
      return cache.addAll(SHELL_FILES).catch(function(err) {
        console.warn('[SW] Some shell files failed to cache:', err);
      });
    }).then(function() {
      return self.skipWaiting(); // নতুন SW সাথে সাথে activate হবে
    })
  );
});

// =============================================
// ACTIVATE — পুরনো cache মুছে ফেলো
// =============================================
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating MeetApp Service Worker...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim(); // সব page নিয়ন্ত্রণ নাও
    })
  );
});

// =============================================
// FETCH — Network first, cache fallback
// =============================================
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);

  // Firebase, OneSignal, API calls — সবসময় network
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('onesignal.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.startsWith('/api/')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // অন্য সব request — Network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then(function(networkResponse) {
        // সফল হলে cache-এ save করো
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type !== 'opaque' &&
          event.request.method === 'GET'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(function() {
        // Network নেই — cache থেকে দাও
        return caches.match(event.request).then(function(cachedResponse) {
          if (cachedResponse) {
            console.log('[SW] Serving from cache (offline):', url.pathname);
            return cachedResponse;
          }

          // HTML request হলে index.html দাও (অফলাইন)
          if (event.request.headers.get('Accept') &&
              event.request.headers.get('Accept').includes('text/html')) {
            return caches.match('/index.html').then(function(r) {
              return r || caches.match('/');
            });
          }

          // কিছুই নেই
          console.warn('[SW] No cache for:', url.pathname);
        });
      })
  );
});

// =============================================
// PUSH — OneSignal / FCM notification
// =============================================
self.addEventListener('push', function(event) {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch(e) {
    data = { title: 'MeetApp', body: event.data.text() };
  }

  const title   = data.title   || data.headings?.en || 'MeetApp';
  const body    = data.body    || data.content?.en  || 'নতুন বিজ্ঞপ্তি';
  const icon    = data.icon    || '/icon.png';
  const badge   = data.badge   || '/icon.png';
  const url     = data.url     || data.launch_url   || '/';

  const options = {
    body:    body,
    icon:    icon,
    badge:   badge,
    vibrate: [200, 100, 200, 100, 200],
    data:    { url: url },
    actions: [
      { action: 'open',    title: '📱 খুলুন' },
      { action: 'dismiss', title: '✕ বাতিল'  },
    ],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// =============================================
// NOTIFICATION CLICK
// =============================================
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : 'https://meetapp-zeta.vercel.app';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // আগে থেকে খোলা tab থাকলে সেটা focus করো
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('meetapp') && 'focus' in client) {
            return client.focus();
          }
        }
        // না থাকলে নতুন tab খোলো
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// =============================================
// MESSAGE — index.html থেকে sound emoji পাঠালে
// =============================================
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] MeetApp Service Worker loaded ✅');
