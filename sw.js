// ══════════════════════════════════════════════════════
// MeetApp — App Shell Service Worker
// অফলাইনেও অ্যাপ চালু রাখার জন্য
// ══════════════════════════════════════════════════════

const CACHE_NAME = 'meetapp-shell-v3';

// এগুলো প্রথমবার ইন্টারনেটে লোড হওয়ার সময় cache করা হবে
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Firebase SDK (CDN থেকে)
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js',
  // Twemoji
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/twemoji.min.js',
];

// ── Install: app shell assets cache করো ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // প্রতিটি asset আলাদাভাবে try করো যাতে একটা fail হলে বাকিগুলো আটকে না যায়
      return Promise.allSettled(
        SHELL_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Cache miss:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: পুরনো cache মুছে দাও ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== 'firebase-messaging-database')
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-first strategy ──
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // POST / non-GET request — cache করা যাবে না
  if (request.method !== 'GET') return;

  // Firebase Realtime DB requests — সবসময় network থেকে নাও (live data)
  if (
    url.hostname.includes('firebasedatabase.app') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com')
  ) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Firebase Storage / Analytics — network-first, fallback to nothing
  if (
    url.hostname.includes('firebasestorage.googleapis.com') ||
    url.hostname.includes('firebase.googleapis.com') ||
    url.hostname.includes('fcm.googleapis.com')
  ) {
    event.respondWith(fetch(request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // App Shell + CDN assets — Cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      // Cache-এ নেই → network থেকে আনো এবং cache করো
      return fetch(request).then(networkResponse => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (networkResponse.type === 'basic' || networkResponse.type === 'cors')
        ) {
          const toCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, toCache));
        }
        return networkResponse;
      }).catch(() => {
        // সবই fail → index.html দাও (SPA fallback)
        if (request.headers.get('Accept') && request.headers.get('Accept').includes('text/html')) {
          return caches.match('/index.html');
        }
        return new Response('', { status: 503 });
      });
    })
  );
});
